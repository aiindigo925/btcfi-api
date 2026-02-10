/**
 * Whale Alert Stream — GET /api/v1/stream/whales
 * Real-time large Bitcoin transactions.
 * Query: ?min=100 (minimum BTC threshold, default 100)
 * Price: $0.01 USDC
 */

import { NextRequest } from 'next/server';
import { pollWhaleEvents, formatSSE, formatHeartbeat } from '@/lib/events';
import { sanitizeInt } from '@/lib/validation';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const minBtc = sanitizeInt(searchParams.get('min'), 100, 1, 100000);

  const encoder = new TextEncoder();
  const POLL_INTERVAL = 20_000;
  const HEARTBEAT_INTERVAL = 30_000;
  const MAX_DURATION = 300_000;

  const seenTxids = new Set<string>();

  const stream = new ReadableStream({
    async start(controller) {
      const startTime = Date.now();
      let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
      let pollTimer: ReturnType<typeof setInterval> | null = null;

      controller.enqueue(encoder.encode(`event: connected\ndata: ${JSON.stringify({ message: 'Whale alert stream connected', minBtc, channel: 'whale_tx' })}\n\n`));

      heartbeatTimer = setInterval(() => {
        try { controller.enqueue(encoder.encode(formatHeartbeat())); }
        catch { cleanup(); }
      }, HEARTBEAT_INTERVAL);

      pollTimer = setInterval(async () => {
        if (Date.now() - startTime > MAX_DURATION) {
          controller.enqueue(encoder.encode(`event: timeout\ndata: ${JSON.stringify({ message: 'Stream max duration reached. Reconnect.' })}\n\n`));
          cleanup();
          return;
        }
        try {
          const events = await pollWhaleEvents(minBtc);
          for (const event of events) {
            const txid = (event.data as any).txid;
            if (txid && seenTxids.has(txid)) continue;
            if (txid) seenTxids.add(txid);
            controller.enqueue(encoder.encode(formatSSE(event)));
          }
          // Cap seen set size
          if (seenTxids.size > 500) {
            const arr = Array.from(seenTxids);
            for (let i = 0; i < 250; i++) seenTxids.delete(arr[i]);
          }
        } catch { /* silent */ }
      }, POLL_INTERVAL);

      function cleanup() {
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        if (pollTimer) clearInterval(pollTimer);
        try { controller.close(); } catch {}
      }

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
