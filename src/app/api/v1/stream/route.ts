/**
 * SSE Event Stream — GET /api/v1/stream
 * Real-time Bitcoin events: new blocks, fee changes, mempool surges.
 * Price: $0.01 USDC (connection fee)
 */

import { NextRequest } from 'next/server';
import { pollEvents, formatSSE, formatHeartbeat } from '@/lib/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const POLL_INTERVAL = 15_000; // 15 seconds
  const HEARTBEAT_INTERVAL = 30_000;
  const MAX_DURATION = 300_000; // 5 min max for serverless

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;

      // Send initial connection event
      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: 'BTCFi stream connected', channels: ['new_block', 'fee_change', 'mempool_surge'] })}\n\n`));

      // Heartbeat
      heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(formatHeartbeat()));
        } catch { cleanup(); }
      }, HEARTBEAT_INTERVAL);

      // Poll for events
      pollTimer = setInterval(async () => {
        if (Date.now() - startTime > MAX_DURATION) {
          controller.enqueue(encoder.encode(`event: timeout\ndata: ${JSON.stringify({ message: 'Stream max duration reached. Reconnect.' })}\n\n`));
          cleanup();
          return;
        }
        try {
          const events = await pollEvents();
          for (const event of events) {
            controller.enqueue(encoder.encode(formatSSE(event)));
          }
        } catch { /* silent */ }
      }, POLL_INTERVAL);

      function cleanup() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (pollTimer) clearInterval(pollTimer);
        try { controller.close(); } catch {}
      }

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
      // CORS + security (middleware can't inject on custom Response)
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
