/**
 * Webhook Trigger Evaluation — POST /api/v1/webhooks/evaluate
 * Checks all registered webhooks against current conditions and fires matching ones.
 *
 * Auth: X-API-Key header required (service/cron).
 * Typically called by Vercel Cron or an internal scheduler.
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluateTriggers } from '@/lib/webhooks';

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
    const result = await evaluateTriggers();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'webhooks-evaluate',
        fired: result.fired,
        errors: result.errors.length,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate triggers', code: 'WEBHOOKS_EVALUATE_FAILED' },
      { status: 500 },
    );
  }
}

// Also support GET for Vercel Cron
export async function GET(request: NextRequest) {
  // Vercel Cron sends Authorization header with CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const apiKey = getApiKey(request);

  // Allow cron secret or API key
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Proceed
  } else if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' },
      { status: 401 },
    );
  }

  try {
    const result = await evaluateTriggers();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'webhooks-evaluate',
        fired: result.fired,
        errors: result.errors.length,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to evaluate triggers', code: 'WEBHOOKS_EVALUATE_FAILED' },
      { status: 500 },
    );
  }
}
