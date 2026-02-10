import { NextRequest, NextResponse } from 'next/server';
import { getSolvReserves } from '@/lib/solv';
import { getBtcPrice } from '@/lib/bitcoin';
export async function GET(request: NextRequest) {
  try {
    const price = await getBtcPrice().catch(() => ({ USD: 0, EUR: 0 }));
    const reserves = await getSolvReserves(price.USD || undefined);

    return NextResponse.json({
      success: true,
      reserves,
      _meta: {
        source: 'Solv Protocol on-chain (ERC-20 totalSupply)',
        rpc: 'Multi-chain via rpc.ts',
        cache: '60s TTL',
        price: 'solv',
        cost: '$0.02 USDC',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Solv reserves', code: 'SOLV_FETCH_FAILED' },
      { status: 500 }
    );
  }
}
