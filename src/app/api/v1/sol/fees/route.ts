import { NextResponse } from 'next/server';
import { getSolFees } from '@/lib/solana-data';

export async function GET() {
  try {
    const data = await getSolFees();
    return NextResponse.json({ success: true, data, meta: { endpoint: 'sol-fees', pricing: '$0.01/call' } });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to fetch SOL fee data' }, { status: 500 });
  }
}
