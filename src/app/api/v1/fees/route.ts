import { NextRequest, NextResponse } from 'next/server';
import { getRecommendedFees, getFeeHistogram, getBtcPrice } from '@/lib/bitcoin';

export async function GET(request: NextRequest) {
  try {
    const [fees, blocks, price] = await Promise.all([
      getRecommendedFees(),
      getFeeHistogram(),
      getBtcPrice(),
    ]);

    // Calculate USD cost for a typical 250 vbyte transaction
    const satPerByte = fees.fastestFee;
    const typicalTxSize = 250;
    const satCost = satPerByte * typicalTxSize;
    const btcCost = satCost / 100_000_000;
    const usdCost = btcCost * price.USD;

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
      nextBlocks: blocks.slice(0, 3),
      price: {
        btcUsd: price.USD,
        btcEur: price.EUR,
      },
      _meta: {
        source: 'mempool.space',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch fee data' },
      { status: 500 }
    );
  }
}
