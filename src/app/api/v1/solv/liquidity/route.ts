import { NextRequest, NextResponse } from 'next/server';
import { getSolvLiquidity } from '@/lib/solv';
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const chain = searchParams.get('chain') || undefined;

    // Validate chain parameter if provided
    const validChains = ['ethereum', 'bnb', 'arbitrum'];
    if (chain && !validChains.includes(chain)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid chain. Must be one of: ${validChains.join(', ')}`,
          code: 'INVALID_CHAIN',
        },
        { status: 400 }
      );
    }

    const liquidity = await getSolvLiquidity(chain);

    return NextResponse.json({
      success: true,
      liquidity,
      _meta: {
        source: 'Solv Protocol on-chain supply distribution',
        filter: chain || 'all chains',
        cache: '60s TTL',
        price: 'solv',
        cost: '$0.02 USDC',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Solv liquidity data', code: 'SOLV_LIQUIDITY_FAILED' },
      { status: 500 }
    );
  }
}
