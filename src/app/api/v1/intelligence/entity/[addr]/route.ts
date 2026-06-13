/**
 * Address Entity Label API
 * GET /api/v1/intelligence/entity/:addr — look up known entity for address
 */

import { NextResponse } from 'next/server';
import { getEntityLabel, getEntityStats } from '@/lib/entities';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ addr: string }> }
) {
  const { addr } = await params;

  if (!addr || addr.length < 26) {
    return NextResponse.json({ success: false, error: 'Invalid address' }, { status: 400 });
  }

  const entity = getEntityLabel(addr);
  if (entity) {
    return NextResponse.json({ success: true, data: entity });
  }

  return NextResponse.json({
    success: true,
    data: { address: addr, entity: 'Unknown', type: 'unknown', confidence: 0 },
    stats: getEntityStats(),
  });
}
