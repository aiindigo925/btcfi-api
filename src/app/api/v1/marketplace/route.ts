/**
 * Agent Marketplace API
 * POST /api/v1/marketplace — register analysis as endpoint
 * GET /api/v1/marketplace — list available analyses
 */

import { NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const redis = getRedis();
    const listings = await redis.get('marketplace:listings') as any[] || [];
    return NextResponse.json({ success: true, data: listings, count: listings.length });
  } catch {
    return NextResponse.json({ success: true, data: [], count: 0, note: 'Marketplace initializing' });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, price, endpoint } = body;

    if (!name || !price) {
      return NextResponse.json({ success: false, error: 'name and price required' }, { status: 400 });
    }

    const listing = {
      id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: description || '',
      price: Number(price),
      endpoint: endpoint || '',
      created: new Date().toISOString(),
      reputation: 0,
      calls: 0,
    };

    const redis = getRedis();
    const existing = (await redis.get('marketplace:listings') as any[]) || [];
    if (existing.length >= 1000) {
      return NextResponse.json({ success: false, error: 'Marketplace full (1000 max)' }, { status: 507 });
    }
    existing.push(listing);
    await redis.set('marketplace:listings', JSON.stringify(existing));

    return NextResponse.json({ success: true, data: listing });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create listing' }, { status: 500 });
  }
}
