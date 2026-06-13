/**
 * BTCFi API Middleware — x402 Payment Enforcement, Rate Limiting, CORS, Security Headers
 *
 * This is the critical enforcement layer that:
 * 1. Adds CORS headers to all API responses
 * 2. Adds security headers
 * 3. Checks x402 payment for paid endpoints (when X402_ENABLED=true)
 * 4. Applies rate limiting by tier (free/paid/staked)
 * 5. Records payments for revenue tracking
 * 6. Handles encrypted response setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPayment, getPriceForPath, detectNetwork } from '@/lib/x402';
import { getRateLimitTier, RATE_LIMITS, type SignerTier } from '@/lib/request-signing';
import { recordPayment } from '@/lib/revenue';
import { generatePEACReceipt } from '@/lib/peac';
import { handleFreeTier, classifyPath, getFreeTierStatus } from '@/lib/free-tier-middleware';

// ============ RATE LIMITING (UPSTASH REDIS) ============

import { getRedis } from '@/lib/redis';

const WINDOW_MS = 60_000; // 1 minute

async function checkRateLimit(ip: string, tier: SignerTier): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limit = RATE_LIMITS[tier];
  if (limit === Infinity) return { allowed: true, remaining: Infinity, resetAt: 0 };

  try {
    const redis = getRedis();
    const key = `ratelimit:${tier}:${ip}`;
    const now = Date.now();
    const windowStart = now - WINDOW_MS;

    // Sliding window: remove expired entries, count current
    await redis.zremrangebyscore(key, 0, windowStart);
    const count = await redis.zcard(key);

    if (count >= limit) {
      // Get oldest entry to calculate reset time
      const oldest = await redis.zrange(key, 0, 0, { withScores: true }) as any[];
      const resetAt = oldest.length > 0 ? Number(oldest[0].score) + WINDOW_MS : now + WINDOW_MS;
      return { allowed: false, remaining: 0, resetAt };
    }

    // Add current request
    await redis.zadd(key, { score: now, member: `${now}:${Math.random().toString(36).slice(2)}` });
    await redis.expire(key, Math.ceil(WINDOW_MS / 1000));

    return { allowed: true, remaining: limit - count - 1, resetAt: now + WINDOW_MS };
  } catch {
    // Redis failure — fail open (allow request)
    return { allowed: true, remaining: limit, resetAt: 0 };
  }
}

// ============ CORS & SECURITY HEADERS ============

const ALLOWED_ORIGINS = ['https://btcfi.aiindigo.com', 'http://localhost:3000', 'http://localhost:3001'];
function getCorsHeaders(request: NextRequest): Record<string, string> {
  const origin = request.headers.get('origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Payment, X-Payment-Network, X-Signature, X-Nonce, X-Signer, X-Timestamp, X-Encrypt-Response, X-Staker, Authorization, X-Internal-Key',
    'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Payment-Required, X-Payment-Amount, X-Payment-Currency, X-Payment-Networks, X-PEAC-Receipt',
    'Access-Control-Max-Age': '86400',
  };
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Powered-By': 'BTCFi API',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' https://btcfi.aiindigo.com;",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ============ PATH MATCHING ============

/** Internal API key for bot/service bypass */
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

/** Paths that skip x402 payment entirely */
const FREE_PATHS = [
  '/api/health',
  '/api/v1/staking',
  '/api/v1/payment-test',
  '/api/admin',
  '/api/newsletter',
  '/api/docs',
  '/api/cron',
  '/api/telegram',
  '/api/v1/safe',
  '/api/mcp',
  '/api/v1/agent-skills',
];

/** Paths that don't go through middleware at all */
const SKIP_PATHS = [
  '/_next',
  '/favicon.ico',
  '/openapi.json',
  '/.well-known',
  '/llms.txt',
];

function isApiPath(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isFreePath(pathname: string): boolean {
  return FREE_PATHS.some(p => pathname.startsWith(p));
}

function shouldSkip(pathname: string): boolean {
  return SKIP_PATHS.some(p => pathname.startsWith(p));
}

// ============ MIDDLEWARE ============

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Skip static assets and non-API paths
  if (shouldSkip(pathname)) return NextResponse.next();

  // Dashboard, docs, and safe pages — pass through
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/docs') || pathname.startsWith('/safe') || pathname === '/') {
    return NextResponse.next();
  }

  // CORS preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: getCorsHeaders(request) });
  }

  // Only apply payment/rate-limit logic to API routes
  if (!isApiPath(pathname)) return NextResponse.next();

  // Get client IP for rate limiting
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '0.0.0.0';

  // Determine tier
  const tier = getRateLimitTier(request.headers);
  const network = detectNetwork(request);

  // Rate limit check
  const rateResult = await checkRateLimit(ip, tier);
  if (!rateResult.allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        code: 429,
        tier,
        limit: RATE_LIMITS[tier],
        resetAt: new Date(rateResult.resetAt).toISOString(),
        upgrade: tier === 'free'
          ? 'Sign requests with wallet for 500/min, or use x402 payment for unlimited'
          : undefined,
      },
      {
        status: 429,
        headers: {
          ...getCorsHeaders(request),
          ...SECURITY_HEADERS,
          'X-RateLimit-Limit': String(RATE_LIMITS[tier]),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(rateResult.resetAt / 1000)),
          'Retry-After': String(Math.ceil((rateResult.resetAt - Date.now()) / 1000)),
        },
      }
    );
  }

  // Internal service bypass (Telegram bot, etc.)
  const internalKey = request.headers.get('X-Internal-Key');
  if (INTERNAL_API_KEY && internalKey === INTERNAL_API_KEY) {
    const response = NextResponse.next();
    Object.entries(getCorsHeaders(request)).forEach(([k, v]) => response.headers.set(k, v));
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // x402 payment check for paid endpoints
  if (!isFreePath(pathname)) {
    // Check if there's an X-Payment header first
    const hasPayment = request.headers.get('X-Payment') || request.headers.get('x-payment');

    if (!hasPayment) {
      // No payment — try free tier access
      const freeTierResponse = await handleFreeTier(request);
      if (freeTierResponse) {
        // Free tier blocked (402 or rate limit) — return with CORS
        Object.entries(getCorsHeaders(request)).forEach(([k, v]) => freeTierResponse.headers.set(k, v));
        Object.entries(SECURITY_HEADERS).forEach(([k, v]) => freeTierResponse.headers.set(k, v));
        return freeTierResponse;
      }
      // Free tier allowed — proceed without payment
    } else {
      // Has payment — verify it
      const paymentResponse = await checkPayment(request);
      if (paymentResponse) {
        Object.entries(getCorsHeaders(request)).forEach(([k, v]) => paymentResponse.headers.set(k, v));
        Object.entries(SECURITY_HEADERS).forEach(([k, v]) => paymentResponse.headers.set(k, v));
        return paymentResponse;
      }
      // Payment valid — record it
      recordPayment(network, pathname);
    }
  }

  // Pass through to route handler, then add headers to response
  const response = NextResponse.next();

  // Add standard headers
  Object.entries(getCorsHeaders(request)).forEach(([k, v]) => response.headers.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));

  // Rate limit headers
  response.headers.set('X-RateLimit-Limit', tier === 'paid' ? 'unlimited' : String(RATE_LIMITS[tier]));
  response.headers.set('X-RateLimit-Remaining', String(rateResult.remaining === Infinity ? 'unlimited' : rateResult.remaining));
  if (rateResult.resetAt > 0) {
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateResult.resetAt / 1000)));
  }

  // PEAC receipt for paid requests
  if ((request.headers.get('X-Payment') || request.headers.get('x-payment')) && !isFreePath(pathname)) {
    try {
      const price = getPriceForPath(pathname);
      const amount = Math.floor(price * 1_000_000).toString();
      const receipt = generatePEACReceipt(pathname, amount, network, '');
      response.headers.set('X-PEAC-Receipt', receipt);
    } catch (e) { console.error('[PEAC] Receipt error:', e); }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
