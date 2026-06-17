/**
 * Portfolio Analytics
 * GET /api/v1/portfolio/:userId/analytics
 */
import { NextRequest, NextResponse } from 'next/server';
import { analyzePortfolio } from '@/lib/portfolio-v2';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;

  if (!userId || userId.length < 1) {
    return NextResponse.json(
      { success: false, error: 'Invalid user ID', code: 'INVALID_USER_ID' },
      { status: 400 },
    );
  }

  try {
    const result = await analyzePortfolio(userId);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Portfolio not found or empty. Create a portfolio first with POST /api/v1/portfolio',
          code: 'PORTFOLIO_EMPTY',
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'portfolio-analytics',
        pricing: '$0.03/call',
        source: 'mempool.space + 1ML',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Portfolio analytics failed',
        code: 'PORTFOLIO_ANALYTICS_FAILED',
      },
      { status: 500 },
    );
  }
}
