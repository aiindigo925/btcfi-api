/**
 * Lightning Routing Fee Estimate
 * GET /api/v1/lightning/routing-fee?from={pubkey}&to={pubkey}&amount={sats}
 */
import { NextRequest, NextResponse } from 'next/server';
import { estimateRoutingFee } from '@/lib/lightning-insights';
import { sanitizeInt } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const amount = sanitizeInt(searchParams.get('amount'), 100000, 1, 100_000_000_000);

  if (!from || from.length < 66) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid "from" pubkey parameter', code: 'INVALID_FROM' },
      { status: 400 },
    );
  }

  if (!to || to.length < 66) {
    return NextResponse.json(
      { success: false, error: 'Missing or invalid "to" pubkey parameter', code: 'INVALID_TO' },
      { status: 400 },
    );
  }

  try {
    const result = await estimateRoutingFee(from, to, amount);
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'lightning-routing-fee',
        pricing: '$0.02/call',
        source: '1ML + heuristic',
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: 'Routing fee estimation failed',
        code: 'LIGHTNING_ROUTING_FAILED',
      },
      { status: 500 },
    );
  }
}
