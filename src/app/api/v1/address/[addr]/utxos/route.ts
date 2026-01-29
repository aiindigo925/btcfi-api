import { NextRequest, NextResponse } from 'next/server';
import { getAddressUtxos, getBtcPrice } from '@/lib/bitcoin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> }
) {
  const { addr } = await params;

  try {
    const [utxos, price] = await Promise.all([
      getAddressUtxos(addr),
      getBtcPrice(),
    ]);

    const totalSats = utxos.reduce((sum, u) => sum + u.value, 0);
    const confirmedUtxos = utxos.filter(u => u.status.confirmed);
    const pendingUtxos = utxos.filter(u => !u.status.confirmed);

    return NextResponse.json({
      success: true,
      address: addr,
      summary: {
        total: utxos.length,
        confirmed: confirmedUtxos.length,
        pending: pendingUtxos.length,
        totalSats,
        totalBtc: (totalSats / 100_000_000).toFixed(8),
        totalUsd: (totalSats / 100_000_000 * price.USD).toFixed(2),
      },
      utxos: utxos.map(u => ({
        txid: u.txid,
        vout: u.vout,
        value: u.value,
        valueBtc: (u.value / 100_000_000).toFixed(8),
        confirmed: u.status.confirmed,
        blockHeight: u.status.block_height,
      })),
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch UTXOs' },
      { status: 500 }
    );
  }
}
