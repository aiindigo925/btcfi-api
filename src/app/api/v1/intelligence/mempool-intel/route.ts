/**
 * Mempool Intelligence — Fee bands, congestion, RBF, large tx alerts.
 * GET /api/v1/intelligence/mempool-intel
 */
import { NextResponse } from 'next/server';
import { getMempoolIntel } from '@/lib/mempool-intel';

export async function GET() {
  try {
    const result = await getMempoolIntel();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'mempool-intelligence',
        pricing: '$0.02/call',
        source: 'mempool.space',
        cache: '30s TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Mempool intelligence failed',
        code: 'MEMPOOL_INTEL_FAILED',
      },
      { status: 500 },
    );
  }
}
