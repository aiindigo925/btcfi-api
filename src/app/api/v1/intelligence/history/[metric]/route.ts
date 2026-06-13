/**
 * Historical Data Replay — Time-series of cycle metrics.
 * GET /api/v1/intelligence/history/:metric?days=90
 * metric: mvrv | sopr | nupl
 */
import { NextRequest, NextResponse } from 'next/server';
import { getHistory, type MetricName } from '@/lib/historical';
import { sanitizeInt } from '@/lib/validation';

const VALID_METRICS: MetricName[] = ['mvrv', 'sopr', 'nupl'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ metric: string }> },
) {
  const { metric } = await params;

  if (!VALID_METRICS.includes(metric as MetricName)) {
    return NextResponse.json(
      {
        success: false,
        error: `Invalid metric. Must be one of: ${VALID_METRICS.join(', ')}`,
        code: 'INVALID_METRIC',
      },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const days = sanitizeInt(searchParams.get('days'), 90, 1, 365);

  try {
    const result = await getHistory(metric as MetricName, days);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'historical-data',
        pricing: '$0.03/call',
        metric,
        days,
        dataPoints: result.points.length,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Historical data retrieval failed',
        code: 'HISTORY_FAILED',
      },
      { status: 500 },
    );
  }
}
