import { NextRequest, NextResponse } from 'next/server';
import { getAddressTxs, getBtcPrice } from '@/lib/bitcoin';
import { isValidBitcoinAddress, sanitizeInt, ERRORS } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> }
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return NextResponse.json(ERRORS.INVALID_ADDRESS, { status: 400 });
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = sanitizeInt(searchParams.get('limit'), 10, 1, 50);

  try {
    const [txs, price] = await Promise.all([
      getAddressTxs(addr),
      getBtcPrice(),
    ]);

    const limited = txs.slice(0, limit);

    return NextResponse.json({
      success: true,
      address: addr,
      count: limited.length,
      totalAvailable: txs.length,
      transactions: limited.map(tx => {
        const totalOut = tx.vout.reduce((s: number, v: any) => s + (v.value || 0), 0);
        return {
          txid: tx.txid,
          confirmed: tx.status.confirmed,
          blockHeight: tx.status.block_height || null,
          blockTime: tx.status.block_time
            ? new Date(tx.status.block_time * 1000).toISOString()
            : null,
          fee: tx.fee,
          size: tx.size,
          totalOutputSats: totalOut,
          totalOutputBtc: (totalOut / 100_000_000).toFixed(8),
          totalOutputUsd: (totalOut / 100_000_000 * price.USD).toFixed(2),
          inputs: tx.vin.length,
          outputs: tx.vout.length,
        };
      }),
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
        priceUsd: price.USD,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch address transactions', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
