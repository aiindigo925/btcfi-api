/**
 * Telegram Bot Webhook — Vercel Serverless
 *
 * POST /api/telegram/webhook
 *
 * Security:
 * - Telegram IP allowlisting (only Telegram's servers can hit this)
 * - Timing-safe secret token comparison
 * - Body size limits
 * - Content-Type validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const SECRET_TOKEN = process.env.TELEGRAM_SECRET_TOKEN || '';

/**
 * Telegram webhook servers IP ranges (from https://core.telegram.org/bots/webhooks)
 * These are the only IPs Telegram sends webhook updates from.
 */
const TELEGRAM_IPS = [
  '149.154.160.0/20',
  '91.108.4.0/22',
];

function ip4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;
  let result = 0;
  for (const part of parts) {
    const n = parseInt(part, 10);
    if (isNaN(n) || n < 0 || n > 255) return null;
    result = (result << 8) + n;
  }
  return result >>> 0; // ensure unsigned
}

function ip4ToCidrRange(cidr: string): [number, number] | null {
  const [base, prefixStr] = cidr.split('/');
  const prefix = parseInt(prefixStr, 10);
  const baseInt = ip4ToInt(base);
  if (baseInt === null || isNaN(prefix) || prefix < 0 || prefix > 32) return null;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return [(baseInt & mask) >>> 0, (baseInt | ~mask) >>> 0];
}

/** Pre-compute CIDR ranges for fast lookup */
const CIDR_RANGES: [number, number][] = TELEGRAM_IPS.map(ip4ToCidrRange).filter(Boolean) as [number, number][];

function isTelegramIP(ip: string): boolean {
  const ipInt = ip4ToInt(ip);
  if (ipInt === null) return false;
  return CIDR_RANGES.some(([min, max]) => ipInt >= min && ipInt <= max);
}

/** Extract real client IP behind proxies */
function getClientIP(request: NextRequest): string | null {
  // Vercel puts the real IP in x-forwarded-for
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const xri = request.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return null;
}

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
  // --- IP allowlisting: reject anything not from Telegram's servers ---
  const clientIP = getClientIP(request);
  if (clientIP && !isTelegramIP(clientIP)) {
    console.warn(`[Telegram] Rejected webhook from non-Telegram IP: ${clientIP}`);
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

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
