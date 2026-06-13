/**
 * SOPR — Spend Output Profit Ratio
 * On-chain cycle metric: profitability of spent outputs.
 */
import { NextResponse } from 'next/server';
import { getSoprMetrics } from '@/lib/cycle-metrics';

export async function GET() {
  try {
    const result = await getSoprMetrics();

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: {
        endpoint: 'sopr',
        cached: result.cached,
        pricing: '$0.02/call',
        source: 'mempool.space (sampled + mempool.recent)',
        cache: '1h TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'SOPR computation failed',
        code: 'SOPR_FAILED',
      },
      { status: 500 },
    );
  }
}
