import { NextRequest, NextResponse } from 'next/server';
import { getTxStatus, getBlockHeight } from '@/lib/bitcoin';
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
    const [status, currentHeight] = await Promise.all([
      getTxStatus(txid),
      getBlockHeight(),
    ]);

    const confirmations = status.confirmed && status.block_height
      ? currentHeight - status.block_height + 1
      : 0;

    let confirmationLevel: string;
    if (!status.confirmed) confirmationLevel = 'unconfirmed';
    else if (confirmations < 3) confirmationLevel = 'low';
    else if (confirmations < 6) confirmationLevel = 'medium';
    else confirmationLevel = 'final';

    return NextResponse.json({
      success: true,
      txid,
      status: {
        confirmed: status.confirmed,
        blockHeight: status.block_height || null,
        blockHash: status.block_hash || null,
        blockTime: status.block_time
          ? new Date(status.block_time * 1000).toISOString()
          : null,
        confirmations,
        confirmationLevel,
        currentBlockHeight: currentHeight,
      },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Transaction not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }
}
