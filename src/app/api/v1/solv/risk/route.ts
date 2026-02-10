import { NextRequest, NextResponse } from 'next/server';
import { getSolvRisk } from '@/lib/solv';
export async function GET(request: NextRequest) {
  try {
    const risk = await getSolvRisk();

    return NextResponse.json({
      success: true,
      risk,
      _meta: {
        source: 'On-chain reserve analysis + Solv Protocol security data',
        methodology: 'Multi-factor: backing ratio, chain diversification, concentration, contract maturity, TVL',
        cache: '60s TTL',
        price: 'solv',
        cost: '$0.02 USDC',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to assess Solv risk', code: 'SOLV_RISK_FAILED' },
      { status: 500 }
    );
  }
}
