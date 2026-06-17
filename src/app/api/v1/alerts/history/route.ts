/**
 * Alert History API — Get recent triggered alerts.
 * GET /api/v1/alerts/history — list recent triggered alert events
 *
 * Auth: X-API-Key header required.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAlertHistory } from '@/lib/alert-rules';
import { validateApiKey } from '@/lib/api-keys';

function getApiKey(request: NextRequest): string | null {
  return request.headers.get('X-API-Key') || request.headers.get('x-api-key');
}

export async function GET(request: NextRequest) {
  const apiKey = getApiKey(request);
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Missing X-API-Key header', code: 'AUTH_FAILED' },
      { status: 401 }
    );
  }

  const validation = await validateApiKey(apiKey);
  if (!validation.valid || !validation.info) {
    return NextResponse.json(
      {
        success: false,
        error: validation.error || 'Invalid API key',
        code: 'AUTH_FAILED',
      },
      { status: 401 }
    );
  }

  const url = new URL(request.url);
  const limitParam = url.searchParams.get('limit');
  const limit = limitParam ? Math.min(parseInt(limitParam, 10) || 50, 100) : 50;

  try {
    const history = await getAlertHistory(validation.info.keyHash, limit);

    return NextResponse.json({
      success: true,
      data: history,
      meta: {
        count: history.length,
        limit,
        endpoint: 'alert-history',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alert history',
        code: 'HISTORY_FETCH_FAILED',
      },
      { status: 500 }
    );
  }
}
