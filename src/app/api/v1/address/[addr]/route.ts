import { NextRequest, NextResponse } from 'next/server';
import { getAddressInfo, getBtcPrice } from '@/lib/bitcoin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> }
) {
  const { addr } = await params;

  try {
    const [info, price] = await Promise.all([
      getAddressInfo(addr),
      getBtcPrice(),
    ]);

    const balanceSats = info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
    const pendingSats = info.mempool_stats.funded_txo_sum - info.mempool_stats.spent_txo_sum;

    return NextResponse.json({
      success: true,
      address: addr,
      balance: {
        confirmed: {
          sats: balanceSats,
          btc: (balanceSats / 100_000_000).toFixed(8),
          usd: (balanceSats / 100_000_000 * price.USD).toFixed(2),
        },
        pending: {
          sats: pendingSats,
          btc: (pendingSats / 100_000_000).toFixed(8),
          usd: (pendingSats / 100_000_000 * price.USD).toFixed(2),
        },
      },
      stats: {
        txCount: info.chain_stats.tx_count,
        fundedTxos: info.chain_stats.funded_txo_count,
        spentTxos: info.chain_stats.spent_txo_count,
      },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
        priceUsd: price.USD,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch address info' },
      { status: 500 }
    );
  }
}
