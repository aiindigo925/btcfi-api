import { NextRequest, NextResponse } from 'next/server';
import { getEthAddress } from '@/lib/ethereum';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ addr: string }> }) {
  const { addr } = await params;
  try {
    const data = await getEthAddress(addr);
    return NextResponse.json({ success: true, data, meta: { endpoint: 'eth-address', pricing: '$0.01/call' } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch ETH address';
    const status = msg.includes('Invalid') ? 400 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
