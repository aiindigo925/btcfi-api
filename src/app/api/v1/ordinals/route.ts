/**
 * Ordinals/Runes/BRC-20 Intelligence API
 * GET /api/v1/ordinals — inscription stats, BRC-20 tokens, Runes data
 */

import { NextResponse } from 'next/server';
import { getOrdinalsStats, getBRC20Token, getRunesStats } from '@/lib/ordinals';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const ticker = url.searchParams.get('ticker');

    if (ticker) {
      const token = await getBRC20Token(ticker);
      if (!token) {
        return NextResponse.json({ success: false, error: 'Token not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, data: { type: 'brc20', ...token } });
    }

    const [stats, runes] = await Promise.all([getOrdinalsStats(), getRunesStats()]);
    return NextResponse.json({
      success: true,
      data: { ordinals: stats, runes },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Failed to fetch ordinals data' }, { status: 500 });
  }
}
