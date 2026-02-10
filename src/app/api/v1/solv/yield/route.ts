import { NextRequest, NextResponse } from 'next/server';
import { getSolvYield } from '@/lib/solv';
export async function GET(request: NextRequest) {
  try {
    const yieldData = await getSolvYield();

    return NextResponse.json({
      success: true,
      yield: yieldData,
      _meta: {
        source: 'xSolvBTC ERC-4626 on-chain + Solv Protocol data',
        rpc: 'Ethereum via rpc.ts',
        cache: '60s TTL',
        price: 'solv',
        cost: '$0.02 USDC',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Solv yield data', code: 'SOLV_YIELD_FAILED' },
      { status: 500 }
    );
  }
}
