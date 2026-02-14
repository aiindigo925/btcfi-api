import { NextResponse } from 'next/server';
import { getEthGas } from '@/lib/ethereum';

export async function GET() {
  try {
    const data = await getEthGas();
    return NextResponse.json({ success: true, data, meta: { endpoint: 'eth-gas', pricing: '$0.01/call' } });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to fetch ETH gas data' }, { status: 500 });
  }
}
