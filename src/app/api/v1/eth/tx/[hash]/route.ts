import { NextRequest, NextResponse } from 'next/server';
import { getEthTx } from '@/lib/ethereum';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  try {
    const data = await getEthTx(hash);
    return NextResponse.json({ success: true, data, meta: { endpoint: 'eth-tx', pricing: '$0.01/call' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch ETH transaction';
    const status = msg.includes('Invalid') || msg.includes('not found') ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
