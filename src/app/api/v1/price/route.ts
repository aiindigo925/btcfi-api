/**
 * Price Oracle — Real-time BTC prices across currencies.
 * GET /api/v1/price
 */
import { NextResponse } from 'next/server';
import { getBtcPriceOracle } from '@/lib/price-oracle';

export async function GET() {
  try {
    const result = await getBtcPriceOracle();

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        endpoint: 'price-oracle',
        pricing: '$0.01/call',
        source: 'mempool.space',
        cache: '60s TTL',
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Price oracle fetch failed',
        code: 'PRICE_ORACLE_FAILED',
      },
      { status: 500 },
    );
  }
}
