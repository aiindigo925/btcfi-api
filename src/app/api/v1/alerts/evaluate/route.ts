/**
 * Alert Rules Evaluate API — Manually trigger rule evaluation.
 * POST /api/v1/alerts/evaluate — evaluate all rules against current conditions
 *
 * Auth: X-API-Key header required (service/cron use).
 */

import { NextRequest, NextResponse } from 'next/server';
import { evaluateRules } from '@/lib/alert-rules';
import { validateApiKey } from '@/lib/api-keys';

function getApiKey(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || request.headers.get('x-api-key');
}

export async function POST(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'AUTH_FAILED' },
      { status: 401 }
    );
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error || 'Invalid API key',
        code: 'AUTH_FAILED',
      },
      { status: 401 }
    );
  }

  try {
    const result = await evaluateRules();

    return NextResponse.json({
      success: true,
      data: {
        evaluated: result.evaluated,
        triggered: result.triggered,
        errors: result.errors,
        details: result.details.slice(0, 100), // cap response size
      },
      meta: {
        endpoint: 'alert-rules-evaluate',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[AlertRules] Evaluate error:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to evaluate alert rules',
        code: 'RULES_EVALUATE_FAILED',
      },
      { status: 500 }
    );
  }
}
