/**
 * Mining Analytics — Pool distribution, hashrate, difficulty.
 * GET /api/v1/intelligence/mining
 */
import { NextResponse } from 'next/server';
import { getMiningAnalytics } from '@/lib/mining';

export async function GET() {
  try {
    const result = await getMiningAnalytics();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'mining-analytics',
        pricing: '$0.02/call',
        source: 'mempool.space',
        cache: '10min TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Mining analytics failed',
        code: 'MINING_ANALYTICS_FAILED',
      },
      { status: 500 },
    );
  }
}
