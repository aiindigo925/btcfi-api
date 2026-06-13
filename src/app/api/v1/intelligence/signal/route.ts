/**
 * Cycle Composite Signal — Aggregated buy/sell signal with confidence.
 * GET /api/v1/intelligence/signal
 */
import { NextResponse } from 'next/server';
import { getCompositeSignal } from '@/lib/signal';

export async function GET() {
  try {
    const result = await getCompositeSignal();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'composite-signal',
        pricing: '$0.05/call (premium)',
        source: 'cycle-metrics (MVRV, SOPR, NUPL, HODL Waves)',
        cache: '1h TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Composite signal computation failed',
        code: 'SIGNAL_FAILED',
      },
      { status: 500 },
    );
  }
}
