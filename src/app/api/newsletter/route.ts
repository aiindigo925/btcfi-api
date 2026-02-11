/**
 * Newsletter Subscription — Task 17
 * Beehiiv API integration for BTCFi newsletter.
 * POST /api/newsletter { email }
 */

import { NextRequest, NextResponse } from 'next/server';

const BEEHIIV_API_KEY = process.env.BEEHIIV_API_KEY || '';
const BEEHIIV_PUBLICATION_ID = process.env.BEEHIIV_PUBLICATION_ID || '';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim()?.toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
    }

    if (!BEEHIIV_API_KEY || !BEEHIIV_PUBLICATION_ID) {
      // Fallback: log subscription request
      console.log(`[newsletter] Subscription request: ${email}`);
      return NextResponse.json({
        success: true,
        message: 'Subscription recorded',
        note: 'Beehiiv integration pending configuration',
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
