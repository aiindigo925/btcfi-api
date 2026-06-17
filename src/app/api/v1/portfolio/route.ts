/**
 * Create/Update Portfolio
 * POST /api/v1/portfolio
 * Body: { userId: string, addresses: string[] }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createPortfolio } from '@/lib/portfolio-v2';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { userId?: string; addresses?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON body', code: 'INVALID_BODY' },
      { status: 400 },
    );
  }

  const { userId, addresses } = body;

  if (!userId || typeof userId !== 'string' || userId.length < 1) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid userId', code: 'INVALID_USER_ID' },
      { status: 400 },
    );
  }

  if (!Array.isArray(addresses) || addresses.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Must provide at least one address', code: 'INVALID_ADDRESSES' },
      { status: 400 },
    );
  }

  if (addresses.length > 100) {
    return NextResponse.json(
      { success: false, error: 'Maximum 100 addresses per portfolio', code: 'TOO_MANY_ADDRESSES' },
      { status: 400 },
    );
  }

  try {
    const result = await createPortfolio(userId, addresses);
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'portfolio-create',
        pricing: 'free',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Portfolio creation failed',
        code: 'PORTFOLIO_CREATE_FAILED',
      },
      { status: 500 },
    );
  }
}
