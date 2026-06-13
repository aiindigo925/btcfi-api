/**
 * Alerts System — Create, list, delete alerts.
 * POST /api/v1/alerts → create alert
 * GET /api/v1/alerts → list alerts
 * DELETE /api/v1/alerts?id=<id> → remove alert
 * GET /api/v1/alerts/stream → SSE of triggered alerts
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAlert, listAlerts, deleteAlert, checkAlerts } from '@/lib/alerts';

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  );
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);

  // SSE stream endpoint
  const url = new URL(request.url);
  if (url.pathname.endsWith('/stream')) {
    return handleSSEStream(request, ip);
  }

  try {
    const alerts = await listAlerts(ip);
    return NextResponse.json({
      success: true,
      data: alerts,
      meta: {
        endpoint: 'alerts-list',
        pricing: '$0.01/triggered',
        count: alerts.length,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list alerts', code: 'ALERTS_LIST_FAILED' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  try {
    const body = await request.json();
    const { type, threshold, target } = body;

    // Validate type
    const validTypes = ['price_above', 'price_below', 'whale', 'fee_spike'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid alert type. Must be one of: ${validTypes.join(', ')}`,
          code: 'INVALID_ALERT_TYPE',
        },
        { status: 400 },
      );
    }

    // Validate threshold
    if (typeof threshold !== 'number' || threshold <= 0) {
      return NextResponse.json(
        { success: false, error: 'Threshold must be a positive number', code: 'INVALID_THRESHOLD' },
        { status: 400 },
      );
    }

    const alert = await createAlert(ip, { type, threshold, target });

    return NextResponse.json({
      success: true,
      data: alert,
      meta: {
        endpoint: 'alerts-create',
        pricing: '$0.01/triggered',
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to create alert', code: 'ALERTS_CREATE_FAILED' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const ip = getClientIp(request);
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing alert id', code: 'MISSING_ALERT_ID' },
      { status: 400 },
    );
  }

  try {
    const deleted = await deleteAlert(ip, id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Alert not found', code: 'ALERT_NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, id },
      meta: { endpoint: 'alerts-delete' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete alert', code: 'ALERTS_DELETE_FAILED' },
      { status: 500 },
    );
  }
}

function handleSSEStream(request: NextRequest, ip: string): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connected', ip })}\n\n`),
      );

      // Poll for triggered alerts every 15 seconds
      const interval = setInterval(async () => {
        try {
          const triggered = await checkAlerts(ip);
          for (const t of triggered) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: 'alert_triggered',
                  alert: t.alert,
                  currentValue: t.currentValue,
                  message: t.message,
                })}\n\n`,
              ),
            );
          }
        } catch {
          // check failed — keep connection alive
        }
      }, 15000);

      // Cleanup on client disconnect
      request.signal?.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
