/**
 * Runes Protocol — Rune Detail
 * GET /api/v1/runes/[ticker]
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuneByTicker, getRuneStats } from '@/lib/runes';

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

    // Validate ticker format (allow alphanumerics, dots, dashes, and bullet separators)
    if (!/^[a-zA-Z0-9•\-\.\s]+$/.test(ticker)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ticker format' },
        { status: 400 }
      );
    }

    const rune = await getRuneByTicker(ticker);

    if (!rune) {
      return NextResponse.json(
        { success: false, error: `Rune '${ticker}' not found` },
        { status: 404 }
      );
    }

    // Get stats for market data
    const stats = await getRuneStats(ticker);

    return NextResponse.json({
      success: true,
      data: {
        ticker: rune.spacedRune || rune.rune,
        name: rune.rune,
        runeid: rune.runeid,
        total_supply: rune.supply,
        holders: rune.holders,
        transactions: rune.transactions,
        market_cap_usd: stats?.market_cap_usd || 0,
        volume_24h_usd: stats?.volume_24h_usd || 0,
        mint_progress: stats?.mint_progress || 0,
        mintable: rune.mintable,
        mints_count: rune.mints,
        burned: rune.burned,
        premine: rune.premine,
        symbol: rune.symbol,
        divisibility: rune.divisibility,
        height_etched: rune.height,
        timestamp_etched: rune.timestamp,
        last_block: rune.height,
        etching: rune.etching,
        terms: rune.terms,
        remaining: rune.remaining,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[runes] Detail error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Rune details' },
      { status: 500 }
    );
  }
}
