/**
 * Address Cluster Analysis
 * GET /api/v1/intelligence/cluster/:addr
 *
 * Analyzes an address and returns its cluster of linked addresses
 * using multiple heuristic methods.
 */
import { NextRequest, NextResponse } from 'next/server';
import { analyzeAddress } from '@/lib/address-graph';
import { isValidBitcoinAddress, ERRORS } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return NextResponse.json(ERRORS.INVALID_ADDRESS, { status: 400 });
  }

  try {
    const result = await analyzeAddress(addr);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'address-cluster',
        pricing: '$0.02/call',
        heuristics: ['common_input', 'change_detection', 'entity_label', 'temporal_proximity'],
        source: 'mempool.space',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Cluster analysis failed',
        code: 'CLUSTER_ANALYSIS_FAILED',
      },
      { status: 500 },
    );
  }
}
