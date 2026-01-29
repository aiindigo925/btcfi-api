import { NextRequest, NextResponse } from 'next/server';
import { getMempoolSummary, getMempoolRecent } from '@/lib/bitcoin';

export async function GET(request: NextRequest) {
  try {
    const [summary, recent] = await Promise.all([
      getMempoolSummary(),
      getMempoolRecent(),
    ]);

    return NextResponse.json({
      success: true,
      mempool: {
        count: summary.count,
        vsize: summary.vsize,
        totalFee: summary.totalFee,
        vsizeMB: (summary.vsize / 1_000_000).toFixed(2),
        totalFeeBTC: (summary.totalFee / 100_000_000).toFixed(4),
      },
      feeHistogram: summary.feeHistogram.slice(0, 10),
      recentTxs: recent.slice(0, 10).map(tx => ({
        txid: tx.txid,
        size: tx.size,
        fee: tx.fee,
        feeRate: (tx.fee / tx.weight * 4).toFixed(1),
      })),
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch mempool data' },
      { status: 500 }
    );
  }
}
