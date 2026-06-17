/**
 * Price Oracle — Real-time BTC prices across currencies.
 * GET /api/v1/price
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBtcPriceExtended } from '@/lib/bitcoin';
import { getBtcPriceOracle } from '@/lib/price-oracle';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source') ?? 'mempool';
    const currency = searchParams.get('currency')?.toLowerCase();

    if (source === 'coingecko') {
      // CoinGecko multi-currency source
      const allPrices = await getBtcPriceExtended();
      let btc: Record<string, number>;
      if (currency && allPrices[currency] !== undefined) {
        btc = { [currency]: allPrices[currency] };
      } else {
        btc = allPrices;
      }
      return NextResponse.json({
        success: true,
        data: {
          btc,
          source: 'coingecko',
          cached: false,
        },
      });
    }

    // Default: mempool source (USD + EUR)
    const oracle = await getBtcPriceOracle();
    const prices = oracle.btc; // { usd, eur }
    let btc: Record<string, number>;
    if (currency && prices[currency] !== undefined) {
      btc = { [currency]: prices[currency] };
    } else {
      btc = prices;
    }
    return NextResponse.json({
      success: true,
      data: {
        btc,
        source: 'mempool',
        cached: false,
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
