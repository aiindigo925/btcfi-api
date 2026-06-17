/**
 * Telegram Bot Webhook — Vercel Serverless
 *
 * POST /api/telegram/webhook
 *
 * Security:
 * - Timing-safe secret token comparison
 * - Body size limits
 * - Content-Type validation
 *
 * NOTE: IP allowlisting removed — Vercel edge proxies ALL webhook
 * requests, so x-forwarded-for shows Vercel IPs (104.21.x.x),
 * not Telegram servers. Secret token verification is sufficient.
 * See L285: aiindigo-docs-internal/memory
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || '';

/** Timing-safe token comparison to prevent timing attacks */
function safeTokenCompare(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

const MAX_BODY_BYTES = 64 * 1024; // 64 KB — Telegram updates should never be this large

export async function POST(request: NextRequest) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json({ error: 'Bot not configured' }, { status: 503 });
  }

  // --- Validate Telegram secret token (timing-safe) ---
  if (SECRET_TOKEN) {
    const token = request.headers.get('X-Telegram-Bot-Api-Secret-Token') || '';
    if (!safeTokenCompare(token, SECRET_TOKEN)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  // --- Content-Type check ---
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ error: 'Invalid content type' }, { status: 400 });
  }

  // --- Body size check ---
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  try {
    const body = await request.json();

    // Basic structure validation — Telegram updates always have update_id
    if (!body || typeof body.update_id !== 'number') {
      return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
    }

    const { bot } = await import('@/lib/telegram-bot');
    await bot.handleUpdate(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram] Webhook error:', error);
    // Always return 200 to prevent Telegram from retrying (which would cause duplicate processing)
    return NextResponse.json({ ok: true });
  }
}

/** Health check for monitoring (auth-protected) */
export async function GET(request: NextRequest) {
  // Only return status if called with the internal API key
  const internalKey = request.headers.get('X-Internal-Key');
  const expected = process.env.INTERNAL_API_KEY || '';
  if (!expected || internalKey !== expected) {
    return NextResponse.json({ status: 'ok' });
  }
  return NextResponse.json({
    bot: 'BTCFi Telegram Bot',
    status: process.env.TELEGRAM_BOT_TOKEN ? 'configured' : 'not configured',
    commands: [
      '/price', '/fees', '/mempool', '/address', '/tx', '/whale',
      '/risk', '/network', '/mining', '/lightning', '/signal', '/l2',
      '/block', '/mvrv', '/sopr', '/nupl', '/entity', '/portfolio',
      '/staking', '/threat', '/eth_addr', '/sol_addr',
    ],
  });
}
