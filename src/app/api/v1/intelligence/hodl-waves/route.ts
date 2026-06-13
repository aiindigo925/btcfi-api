/**
 * HODL Waves + CDD — Coin Days Destroyed
 * On-chain cycle metric: age distribution of spent coins.
 */
import { NextResponse } from 'next/server';
import { getHodlWavesMetrics } from '@/lib/cycle-metrics';

export async function GET() {
  try {
    const result = await getHodlWavesMetrics();

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        endpoint: 'hodl-waves',
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
        error: 'HODL Waves computation failed',
        code: 'HODL_WAVES_FAILED',
      },
      { status: 500 },
    );
  }
}
