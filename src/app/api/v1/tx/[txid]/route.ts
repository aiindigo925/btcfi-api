import { NextRequest, NextResponse } from 'next/server';
import { getTransaction, getBtcPrice, getBlockHeight } from '@/lib/bitcoin';
import { isValidTxid, ERRORS } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ txid: string }> }
) {
  const { txid } = await params;

  if (!isValidTxid(txid)) {
    return NextResponse.json(ERRORS.INVALID_TXID, { status: 400 });
  }

  try {
    const [tx, price, currentHeight] = await Promise.all([
      getTransaction(txid),
      getBtcPrice(),
      getBlockHeight(),
    ]);

    const confirmations = tx.status.confirmed && tx.status.block_height
      ? currentHeight - tx.status.block_height + 1
      : 0;

    const feeRate = tx.weight ? (tx.fee / tx.weight * 4) : null;
    const feeBtc = tx.fee / 100_000_000;
    const feeUsd = feeBtc * price.USD;

    const totalOutputSats = tx.vout.reduce((sum: number, v: any) => sum + (v.value || 0), 0);

    return NextResponse.json({
      success: true,
      transaction: {
        txid: tx.txid,
        version: tx.version,
        locktime: tx.locktime,
        size: tx.size,
        weight: tx.weight,
        fee: {
          sats: tx.fee,
          btc: feeBtc.toFixed(8),
          usd: feeUsd.toFixed(4),
          rate: feeRate ? `${feeRate.toFixed(1)} sat/vB` : null,
        },
        inputs: tx.vin.length,
        outputs: tx.vout.length,
        totalOutput: {
          sats: totalOutputSats,
          btc: (totalOutputSats / 100_000_000).toFixed(8),
          usd: (totalOutputSats / 100_000_000 * price.USD).toFixed(2),
        },
        status: {
          confirmed: tx.status.confirmed,
          blockHeight: tx.status.block_height || null,
          blockHash: tx.status.block_hash || null,
          blockTime: tx.status.block_time
            ? new Date(tx.status.block_time * 1000).toISOString()
            : null,
          confirmations,
        },
      },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
        priceUsd: price.USD,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Transaction not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
}
