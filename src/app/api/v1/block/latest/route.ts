import { NextRequest, NextResponse } from 'next/server';
import { getLatestBlocks, getBtcPrice } from '@/lib/bitcoin';
import { sanitizeInt } from '@/lib/validation';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = sanitizeInt(searchParams.get('limit'), 5, 1, 20);

  try {
    const [blocks, price] = await Promise.all([
      getLatestBlocks(limit),
      getBtcPrice(),
    ]);

    return NextResponse.json({
      success: true,
      blocks: blocks.map(b => ({
        height: b.height,
        hash: b.id,
        timestamp: b.timestamp,
        txCount: b.tx_count,
        size: b.size,
        weight: b.weight,
        difficulty: b.difficulty,
        time: new Date(b.timestamp * 1000).toISOString(),
      })),
      price: { btcUsd: price.USD },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch blocks', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
