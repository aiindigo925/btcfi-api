import { NextRequest, NextResponse } from 'next/server';
import { getBlock, getBtcPrice } from '@/lib/bitcoin';
import { parseBlockId, ERRORS } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const parsed = parseBlockId(id);

  if (!parsed) {
    return NextResponse.json(ERRORS.INVALID_BLOCK_ID, { status: 400 });
  }

  try {
    const lookup = parsed.type === 'height' ? parseInt(parsed.value) : parsed.value;
    const [block, price] = await Promise.all([
      getBlock(lookup),
      getBtcPrice(),
    ]);

    return NextResponse.json({
      success: true,
      block: {
        height: block.height,
        hash: block.id,
        timestamp: block.timestamp,
        time: new Date(block.timestamp * 1000).toISOString(),
        txCount: block.tx_count,
        size: block.size,
        weight: block.weight,
        version: block.version,
        merkleRoot: block.merkle_root,
        previousHash: block.previousblockhash,
        difficulty: block.difficulty,
        nonce: block.nonce,
        medianTime: new Date(block.mediantime * 1000).toISOString(),
      },
      price: { btcUsd: price.USD },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
        lookupType: parsed.type,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Block not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
}
