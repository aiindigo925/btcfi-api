/**
 * Webhook Test — POST /api/v1/webhooks/test
 * Fire a test/sample payload to registered webhooks.
 *
 * Auth: X-API-Key header required.
 *
 * Body:
 *   { event?: string, webhook_id?: string }
 *
 * If webhook_id is provided, fires only that webhook.
 * Otherwise fires all webhooks for the API key.
 */

import { NextRequest, NextResponse } from 'next/server';
import { testFireWebhook } from '@/lib/webhooks';
import type { TriggerType } from '@/lib/webhooks';

const VALID_EVENTS = ['whale', 'price_above', 'price_below', 'fee_spike', 'block_mined'];

function getApiKey(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || request.headers.get('x-api-key');
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'MISSING_API_KEY' },
      { status: 401 },
    );
  }

  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const { event = 'whale', webhook_id } = body;

    // Validate event type
    if (!VALID_EVENTS.includes(event)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid event type "${event}". Must be one of: ${VALID_EVENTS.join(', ')}`,
          code: 'INVALID_EVENT_TYPE',
        },
        { status: 400 },
      );
    }

    const result = await testFireWebhook(apiKey, webhook_id || null, event as TriggerType);

    return NextResponse.json({
      success: result.success,
      data: result.results,
      meta: {
        endpoint: 'webhooks-test',
        event_type: event,
        message: result.success
          ? 'Test webhook fired successfully'
          : 'Test webhook failed — check your webhook URL',
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Failed to fire test webhook', code: 'WEBHOOKS_TEST_FAILED' },
      { status: 500 },
    );
  }
}
