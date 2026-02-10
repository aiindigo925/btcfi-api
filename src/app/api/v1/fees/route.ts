import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedFees, getMempoolBlocks, getBtcPrice } from '@/lib/bitcoin';
export async function GET(request: NextRequest) {
  try {
    const [fees, mempoolBlocks, price] = await Promise.all([
      getRecommendedFees(),
      getMempoolBlocks(),
      getBtcPrice(),
    ]);

    const typicalTxSize = 250;

    return NextResponse.json({
      success: true,
      fees: {
        recommended: fees,
        unit: 'sat/vB',
      },
      estimate: {
        typicalTxSize,
        fastest: {
          satPerByte: fees.fastestFee,
          totalSats: fees.fastestFee * typicalTxSize,
          usd: (fees.fastestFee * typicalTxSize / 100_000_000 * price.USD).toFixed(2),
        },
        medium: {
          satPerByte: fees.halfHourFee,
          totalSats: fees.halfHourFee * typicalTxSize,
          usd: (fees.halfHourFee * typicalTxSize / 100_000_000 * price.USD).toFixed(2),
        },
        slow: {
          satPerByte: fees.hourFee,
          totalSats: fees.hourFee * typicalTxSize,
          usd: (fees.hourFee * typicalTxSize / 100_000_000 * price.USD).toFixed(2),
        },
      },
      nextBlocks: mempoolBlocks.slice(0, 3),
      price: {
        btcUsd: price.USD,
        btcEur: price.EUR,
      },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee data', code: 'FETCH_FAILED' },
      { status: 500 }
    );
  }
}
