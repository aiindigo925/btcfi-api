/**
 * Lightning Network Intelligence API
 * GET /api/v1/intelligence/lightning — network capacity, top nodes, trends
 */

import { NextResponse } from 'next/server';
import { getLightningStats } from '@/lib/lightning';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const stats = await getLightningStats();
    return NextResponse.json({ success: true, data: stats, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch Lightning data' }, { status: 500 });
  }
}
