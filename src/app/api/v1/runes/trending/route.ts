/**
 * Runes Protocol — Trending Runes
 * GET /api/v1/runes/trending?limit=10
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunesTrending } from '@/lib/runes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '10', 10)));

    const trending = await getRunesTrending(limit);

    if (!trending) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch trending Runes' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: trending.map((rune, idx) => ({
        rank: idx + 1,
        ticker: rune.spacedRune || rune.rune,
        name: rune.rune,
        runeid: rune.runeid,
        holders: rune.holders,
        transactions: rune.transactions,
        volume_24h: rune.volume_24h,
        activity_score: rune.activity_score,
        symbol: rune.symbol,
        mintable: rune.mintable,
        supply: rune.supply,
      })),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[runes] Trending error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending Runes' },
      { status: 500 }
    );
  }
}
