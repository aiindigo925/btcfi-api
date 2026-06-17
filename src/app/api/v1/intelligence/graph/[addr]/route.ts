/**
 * Address Graph Data
 * GET /api/v1/intelligence/graph/:addr
 *
 * Builds a connection graph (nodes + edges) up to N hops from an address.
 * Query param: ?depth=2 (default 2, max 5)
 */
import { NextRequest, NextResponse } from 'next/server';
import { getGraph } from '@/lib/address-graph';
import { isValidBitcoinAddress, ERRORS, sanitizeInt } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return NextResponse.json(ERRORS.INVALID_ADDRESS, { status: 400 });
  }

  const depth = sanitizeInt(request.nextUrl.searchParams.get('depth'), 2, 1, 5);

  try {
    const result = await getGraph(addr, depth);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'address-graph',
        pricing: '$0.02/call',
        depth,
        source: 'mempool.space',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Graph analysis failed',
        code: 'GRAPH_ANALYSIS_FAILED',
      },
      { status: 500 },
    );
  }
}
