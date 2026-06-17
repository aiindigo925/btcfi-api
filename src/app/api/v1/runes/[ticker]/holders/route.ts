/**
 * Runes Protocol — Holder Distribution
 * GET /api/v1/runes/[ticker]/holders
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuneHolders } from '@/lib/runes';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;

    if (!ticker) {
      return NextResponse.json(
        { success: false, error: 'Ticker parameter is required' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9•\-\.\s]+$/.test(ticker)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker format' },
        { status: 400 }
      );
    }

    const holders = await getRuneHolders(ticker);

    if (!holders) {
      return NextResponse.json(
        { success: false, error: `Holders not found for '${ticker}'` },
        { status: 404 }
      );
    }

    // Calculate concentration metrics
    const totalPercentage = holders.reduce((sum, h) => sum + h.percentage, 0);
    const top10Percentage = holders.slice(0, 10).reduce((sum, h) => sum + h.percentage, 0);
    const giniCoefficient = calculateGini(holders.map(h => parseInt(h.balance || '0', 10)));

    return NextResponse.json({
      success: true,
      data: {
        ticker,
        total_holders: holders.length,
        top_holders: holders.map(h => ({
          rank: h.rank,
          address: h.address,
          balance: h.balance,
          percentage: Math.round(h.percentage * 10000) / 100,
        })),
        concentration: {
          top_10_percentage: Math.round(top10Percentage * 10000) / 100,
          gini_coefficient: Math.round(giniCoefficient * 10000) / 10000,
          total_percentage: Math.round(totalPercentage * 10000) / 100,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[runes] Holders error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch holder distribution' },
      { status: 500 }
    );
  }
}

function calculateGini(values: number[]): number {
  const n = values.length;
  if (n === 0) return 0;

  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  if (sum === 0) return 0;

  let giniSum = 0;
  for (let i = 0; i < n; i++) {
    giniSum += (2 * (i + 1) - n - 1) * sorted[i];
  }

  return giniSum / (n * sum);
}
