/**
 * Wallet Portfolio Analytics — UTXO analysis, cost basis, PnL.
 * GET /api/v1/intelligence/portfolio/:addr
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPortfolioAnalytics } from '@/lib/portfolio';
import { isValidBitcoinAddress, ERRORS } from '@/lib/validation';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ addr: string }> },
) {
  const { addr } = await params;

  if (!isValidBitcoinAddress(addr)) {
    return NextResponse.json(ERRORS.INVALID_ADDRESS, { status: 400 });
  }

  try {
    const result = await getPortfolioAnalytics(addr);

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'portfolio-analytics',
        pricing: '$0.03/call',
        source: 'mempool.space',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Portfolio analytics failed',
        code: 'PORTFOLIO_FAILED',
      },
      { status: 500 },
    );
  }
}
