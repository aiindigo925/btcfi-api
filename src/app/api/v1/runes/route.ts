/**
 * Runes Protocol — List All Runes
 * GET /api/v1/runes?page=1&limit=20
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRunesList } from '@/lib/runes';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20', 10)));

    const result = await getRunesList(page, limit);

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Runes data' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.items,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[runes] List error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch Runes list' },
      { status: 500 }
    );
  }
}
