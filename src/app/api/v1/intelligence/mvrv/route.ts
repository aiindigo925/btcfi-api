/**
 * MVRV Z-Score + Realized Price
 * On-chain cycle metric: market cap vs realized cap ratio.
 */
import { NextResponse } from 'next/server';
import { getMvrvMetrics } from '@/lib/cycle-metrics';

export async function GET() {
  try {
    const result = await getMvrvMetrics();

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        endpoint: 'mvrv-zscore',
        cached: result.cached,
        pricing: '$0.02/call',
        source: 'mempool.space (sampled)',
        cache: '1h TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'MVRV computation failed',
        code: 'MVRV_FAILED',
      },
      { status: 500 },
    );
  }
}
