/**
 * Bitcoin L2/Bridge Intelligence API
 * GET /api/v1/intelligence/l2 — L2 TVL, bridge volumes, cross-chain flows
 */

import { NextResponse } from 'next/server';
import { getL2Data } from '@/lib/l2';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getL2Data();
    return NextResponse.json({ success: true, data, timestamp: new Date().toISOString() });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch L2 data' }, { status: 500 });
  }
}
