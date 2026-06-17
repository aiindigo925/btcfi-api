/**
 * Runes Protocol — Recent Transfers
 * GET /api/v1/runes/[ticker]/transfers?limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRuneTransfers } from '@/lib/runes';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  try {
    const { ticker } = await params;
    const url = new URL(request.url);
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

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

    const transfers = await getRuneTransfers(ticker, limit);

    if (!transfers) {
      return NextResponse.json(
        { success: false, error: `Transfers not found for '${ticker}'` },
        { status: 404 }
      );
    }

    // Calculate transfer stats
    const totalVolume = transfers.reduce((sum, t) => sum + parseInt(t.amount || '0', 10), 0);
    const mintCount = transfers.filter(t => t.type === 'mint').length;
    const transferCount = transfers.filter(t => t.type === 'transfer').length;

    return NextResponse.json({
      success: true,
      data: {
        ticker,
        transfers: transfers.map(t => ({
          txid: t.txid,
          block_height: t.blockHeight,
          timestamp: t.timestamp,
          type: t.type,
          from: t.from,
          to: t.to,
          amount: t.amount,
        })),
        stats: {
          count: transfers.length,
          total_volume: String(totalVolume),
          mints: mintCount,
          transfers: transferCount,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[runes] Transfers error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch transfer activity' },
      { status: 500 }
    );
  }
}
