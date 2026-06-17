/**
 * Webhooks API — CRUD for push notification webhooks.
 * GET    /api/v1/webhooks         — list user's webhooks
 * POST   /api/v1/webhooks         — register webhook (url, triggers, secret)
 * DELETE /api/v1/webhooks?id=xxx  — remove webhook
 *
 * Auth: X-API-Key header required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { registerWebhook, listWebhooks, removeWebhook, validateWebhookUrl } from '@/lib/webhooks';

const VALID_TRIGGER_TYPES = ['whale', 'price_above', 'price_below', 'fee_spike', 'block_mined'];

function getApiKey(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || request.headers.get('x-api-key');
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'MISSING_API_KEY' },
      { status: 401 },
    );
  }

  try {
    const webhooks = await listWebhooks(apiKey);
    // Strip secrets from response
    const safeWebhooks = webhooks.map(({ secret, ...rest }) => rest);

    return NextResponse.json({
      success: true,
      data: safeWebhooks,
      meta: {
        endpoint: 'webhooks-list',
        count: safeWebhooks.length,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to list webhooks', code: 'WEBHOOKS_LIST_FAILED' },
      { status: 500 },
    );
  }
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
    const body = await request.json();
    const { url, triggers, secret } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "url" field', code: 'INVALID_URL' },
        { status: 400 },
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid URL format', code: 'INVALID_URL_FORMAT' },
        { status: 400 },
      );
    }

    // SSRF protection — reject private/internal/metadata URLs
    const ssrfCheck = validateWebhookUrl(url);
    if (!ssrfCheck.valid) {
      return NextResponse.json(
        { success: false, error: ssrfCheck.error, code: 'SSRF_BLOCKED' },
        { status: 400 },
      );
    }

    // Validate triggers
    if (!triggers || !Array.isArray(triggers) || triggers.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing or empty "triggers" array. Each trigger needs { type: string, threshold?: number }',
          code: 'INVALID_TRIGGERS',
        },
        { status: 400 },
      );
    }

    for (const trigger of triggers) {
      if (!trigger.type || !VALID_TRIGGER_TYPES.includes(trigger.type)) {
        return NextResponse.json(
          {
            success: false,
            error: `Invalid trigger type "${trigger.type}". Must be one of: ${VALID_TRIGGER_TYPES.join(', ')}`,
            code: 'INVALID_TRIGGER_TYPE',
          },
          { status: 400 },
        );
      }
    }

    // Check webhook limit per API key (max 10)
    const existing = await listWebhooks(apiKey);
    if (existing.length >= 10) {
      return NextResponse.json(
        {
          success: false,
          error: 'Maximum webhook limit reached (10 per API key). Remove existing webhooks first.',
          code: 'WEBHOOK_LIMIT_REACHED',
        },
        { status: 400 },
      );
    }

    const webhook = await registerWebhook(url, triggers, apiKey, secret);

    return NextResponse.json({
      success: true,
      data: webhook,
      meta: {
        endpoint: 'webhooks-create',
        message: 'Webhook registered. Save the secret — it is used to verify incoming signatures.',
      },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Failed to register webhook', code: 'WEBHOOKS_CREATE_FAILED' },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'MISSING_API_KEY' },
      { status: 401 },
    );
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Missing "id" query parameter', code: 'MISSING_WEBHOOK_ID' },
      { status: 400 },
    );
  }

  try {
    const deleted = await removeWebhook(apiKey, id);
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found', code: 'WEBHOOK_NOT_FOUND' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      data: { deleted: true, id },
      meta: { endpoint: 'webhooks-delete' },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to delete webhook', code: 'WEBHOOKS_DELETE_FAILED' },
      { status: 500 },
    );
  }
}
