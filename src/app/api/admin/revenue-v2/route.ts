/**
 * Revenue V2 API — USD Value Tracking
 * Admin-only endpoint returning revenue data with USD breakdowns.
 * Auth via X-Admin-Key header.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRevenueStatsV2 } from '@/lib/revenue';

export const dynamic = 'force-dynamic';

const ADMIN_KEY = process.env.ADMIN_API_KEY || '';

export async function GET(request: NextRequest) {
  // Admin auth — accepts both X-Admin-Key and Authorization: Bearer
  const adminKey = request.headers.get('X-Admin-Key')
    || (request.headers.get('Authorization') || '').replace('Bearer ', '')
    || '';

  if (!ADMIN_KEY || adminKey !== ADMIN_KEY) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized. Set ADMIN_API_KEY env var and pass as Bearer token.' },
      { status: 401 }
    );
  }

  const stats = await getRevenueStatsV2();

  return NextResponse.json({
    success: true,
    version: 'v2',
    revenue: stats,
    timestamp: new Date().toISOString(),
  });
}
