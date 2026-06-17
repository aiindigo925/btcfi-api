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
    const raw = await redis.lrange('marketplace:listings', 0, -1);
    const listings = raw.map((item: string) => JSON.parse(item));
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

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0 || priceNum > 1000000) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
    }

    const listing = {
      id: `agent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      description: description || '',
      price: priceNum,
      endpoint: endpoint || '',
      created: new Date().toISOString(),
      reputation: 0,
      calls: 0,
    };

    const redis = getRedis();

    // Atomic append using LPUSH (no read-modify-write race condition)
    await redis.lpush('marketplace:listings', JSON.stringify(listing));

    // Trim to max 1000 entries (LPUSH prepends, so newest are at index 0)
    const count = await redis.llen('marketplace:listings');
    if (count > 1000) {
      await redis.ltrim('marketplace:listings', 0, 999);
    }

    return NextResponse.json({ success: true, data: listing });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create listing' }, { status: 500 });
  }
}
