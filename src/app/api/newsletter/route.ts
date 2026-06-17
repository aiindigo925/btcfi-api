/**
 * Newsletter Subscription — Task 17
 * Beehiiv API integration for BTCFi newsletter.
 * POST /api/newsletter { email }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getRedis } from '@/lib/redis';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY || '';
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID || '';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: max 5 subscriptions per IP per hour
    let count = 0;
    try {
      const redis = getRedis();
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const key = `newsletter:ratelimit:${ip}`;
      count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 3600);
    } catch {
      // Redis down — skip rate limiting, allow subscription
    }
    if (count > 5) {
      return NextResponse.json({ error: 'Too many requests. Try again later.' }, { status: 429 });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const email = body.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
      // Store subscription in Redis until Beehiiv is configured
      try {
        const redis = getRedis();
        const pendingKey = `newsletter:pending:${email}`;
        await redis.hset(pendingKey, {
          email,
          subscribedAt: new Date().toISOString(),
          ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown',
          status: 'pending_config',
        });
        await redis.expire(pendingKey, 86400 * 90); // 90 days
        // Track count for migration
        await redis.incr('newsletter:pending:count');
      } catch {
        // Redis down — log only
        console.log(`[newsletter] Pending subscription (Redis unavailable): ${email}`);
      }
      return NextResponse.json({
        success: true,
        message: 'Subscription recorded — pending Beehiiv configuration',
        status: 'pending',
      });
    }

    const response = await fetch(
      `https://api.beehiiv.com/v2/publications/${BEEHIIV_PUBLICATION_ID}/subscriptions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${BEEHIIV_API_KEY}`,
        },
        body: JSON.stringify({
          email,
          reactivate_existing: true,
          send_welcome_email: true,
          utm_source: 'btcfi-api',
          utm_medium: 'website',
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error('[newsletter] Beehiiv error:', err);
      return NextResponse.json({ error: 'Subscription failed' }, { status: 502 });
    }

    return NextResponse.json({ success: true, message: 'Subscribed' });
  } catch (error) {
    console.error('[newsletter] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/newsletter',
    body: '{ "email": "you@example.com" }',
    provider: 'Beehiiv',
    status: BEEHIIV_API_KEY ? 'configured' : 'pending',
  });
}
