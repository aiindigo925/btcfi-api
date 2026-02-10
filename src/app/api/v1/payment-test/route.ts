/**
 * Payment Flow Test — Dev-only diagnostic endpoint
 * Returns 404 in production.
 */
import { NextRequest, NextResponse } from 'next/server';
import { create402Response, detectNetwork, FACILITATORS, PRICING, ROUTE_PRICING, getX402Status } from '@/lib/x402';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'Not found', code: 'NOT_FOUND' },
      { status: 404 }
    );
  }

  const network = detectNetwork(request);
  const paymentHeader = request.headers.get('X-Payment') || request.headers.get('x-payment');

  return NextResponse.json({
    success: true,
    environment: 'development',
    status: getX402Status(),
    requestedNetwork: network,
    paymentHeaderPresent: !!paymentHeader,
    routePricing: ROUTE_PRICING,
    facilitators: {
      base: { url: FACILITATORS.base.url, provider: FACILITATORS.base.provider },
      solana: { url: FACILITATORS.solana.url, provider: FACILITATORS.solana.provider },
    },
    testInstructions: {
      step1: 'GET /api/v1/payment-test — see this diagnostic',
      step2: 'GET /api/v1/payment-test -H "X-Payment-Network: solana" — test Solana network',
      step3: 'Payment now handled at middleware level — all routes auto-gated',
      step4: 'Create test payment: echo \'{"payload":"test","network":"base"}\' | base64',
    },
  });
}
