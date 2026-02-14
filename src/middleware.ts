/**
 * BTCFi API Middleware — x402 Payment Enforcement, Rate Limiting, CORS, Security Headers
 *
 * This is the critical enforcement layer that:
 * 1. Adds CORS headers to all API responses
 * 2. Adds security headers
 * 3. Checks x402 payment for paid endpoints (when X402_ENABLED=true)
 * 4. Applies rate limiting by tier (free/signed/paid/staked)
 * 5. Records payments for revenue tracking
 * 6. Handles encrypted response setup
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPayment, getPriceForPath, detectNetwork } from '@/lib/x402';
import { getRateLimitTier, RATE_LIMITS, type SignerTier } from '@/lib/request-signing';
import { recordPayment } from '@/lib/revenue';
import { generatePEACReceipt } from '@/lib/peac';

// ============ RATE LIMITING (IN-MEMORY) ============

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000; // 1 minute

function checkRateLimit(ip: string, tier: SignerTier): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = RATE_LIMITS[tier];
  if (limit === Infinity) return { allowed: true, remaining: Infinity, resetAt: 0 };

  const now = Date.now();
  const key = `${tier}:${ip}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  entry.count++;
  const allowed = entry.count <= limit;
  return { allowed, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

// Periodic cleanup (every 5 min, clear expired entries)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now >= entry.resetAt + WINDOW_MS) rateLimitStore.delete(key);
  }
}, 300_000);

// ============ CORS & SECURITY HEADERS ============

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Payment, X-Payment-Network, X-Signature, X-Nonce, X-Signer, X-Timestamp, X-Encrypt-Response, X-Staker, Authorization',
  'Access-Control-Expose-Headers': 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset, X-Payment-Required, X-Payment-Amount, X-Payment-Currency, X-Payment-Networks, X-PEAC-Receipt',
  'Access-Control-Max-Age': '86400',
};

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Powered-By': 'BTCFi API v3.0.0',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; img-src 'self' data:; connect-src 'self' https://btcfi.aiindigo.com;",
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

// ============ PATH MATCHING ============

/** Internal API key for bot/service bypass */
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

/** Paths that skip x402 payment entirely */
const FREE_PATHS = [
  '/api/health',
  '/api/v1',
  '/api/v1/staking',
  '/api/v1/payment-test',
  '/api/admin',
  '/api/newsletter',
  '/api/docs',
  '/api/cron',
  '/api/telegram',
  '/api/v1/safe',
];

/** Paths that don't go through middleware at all */
const SKIP_PATHS = [
  '/_next',
  '/favicon.ico',
  '/openapi.json',
  '/.well-known',
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
    return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
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
  const rateResult = checkRateLimit(ip, tier);
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
          ...CORS_HEADERS,
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
    Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
    return response;
  }

  // x402 payment check for paid endpoints
  if (!isFreePath(pathname)) {
    const paymentResponse = await checkPayment(request);
    if (paymentResponse) {
      // Add CORS headers to 402 response
      Object.entries(CORS_HEADERS).forEach(([k, v]) => paymentResponse.headers.set(k, v));
      Object.entries(SECURITY_HEADERS).forEach(([k, v]) => paymentResponse.headers.set(k, v));
      return paymentResponse;
    }

    // Payment valid — record it
    if (request.headers.get('X-Payment') || request.headers.get('x-payment')) {
      recordPayment(network, pathname);
    }
  }

  // Pass through to route handler, then add headers to response
  const response = NextResponse.next();

  // Add standard headers
  Object.entries(CORS_HEADERS).forEach(([k, v]) => response.headers.set(k, v));
  Object.entries(SECURITY_HEADERS).forEach(([k, v]) => response.headers.set(k, v));

  // Rate limit headers
  response.headers.set('X-RateLimit-Limit', String(RATE_LIMITS[tier] === Infinity ? 'unlimited' : RATE_LIMITS[tier]));
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
    } catch {}
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
