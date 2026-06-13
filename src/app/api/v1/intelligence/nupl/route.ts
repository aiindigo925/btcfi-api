/**
 * NUPL — Net Unrealized Profit/Loss
 * On-chain cycle metric: aggregate profit/loss state of the market.
 */
import { NextResponse } from 'next/server';
import { getNuplMetrics } from '@/lib/cycle-metrics';

export async function GET() {
  try {
    const result = await getNuplMetrics();

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        endpoint: 'nupl',
        cached: result.cached,
        pricing: '$0.02/call',
        source: 'mempool.space (derived from MVRV)',
        cache: '1h TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'NUPL computation failed',
        code: 'NUPL_FAILED',
      },
      { status: 500 },
    );
  }
}
