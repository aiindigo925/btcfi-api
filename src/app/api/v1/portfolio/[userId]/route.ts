/**
 * Get Portfolio
 * GET /api/v1/portfolio/:userId
 */
import { NextRequest, NextResponse } from 'next/server';
import { getPortfolio } from '@/lib/portfolio-v2';

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
    const result = await getPortfolio(userId);
    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Portfolio not found', code: 'NOT_FOUND' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'portfolio',
        pricing: 'free',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Portfolio fetch failed',
        code: 'PORTFOLIO_FETCH_FAILED',
      },
      { status: 500 },
    );
  }
}
