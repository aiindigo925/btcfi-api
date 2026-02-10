/**
 * BTCFi API Middleware — MP2 Unified
 *
 * All payment, rate limiting, security, and CORS handled here.
 * Routes no longer call withPayment() — middleware does it.
 *
 * Flow: CORS → Rate Limit → x402 Payment → Route Handler
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkPayment, detectNetwork, getPriceForPath } from '@/lib/x402';
import { recordPayment } from '@/lib/revenue';
import { trackServerError } from '@/lib/monitoring';

// ============ RATE LIMITING ============

interface RateLimitEntry {
  count: number;
  resetAt: number;
  violations: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_WINDOW = 60 * 1000;

// KV-backed rate limiting (Task 17.5)
let kvAvailable: boolean | null = null;
let kvModule: any = null;

async function getRateLimitKV(): Promise<any> {
  if (kvAvailable === false) return null;
  if (kvModule) return kvModule;
  try {
    kvModule = await import('@vercel/kv' as string);
    kvAvailable = true;
    return kvModule;
  } catch {
    kvAvailable = false;
    return null;
  }
}

async function kvIncr(key: string, windowSec: number): Promise<number | null> {
  const kv = await getRateLimitKV();
  if (!kv) return null;
  try {
    const count = await kv.incr(key);
    if (count === 1) await kv.expire(key, windowSec);
    return count as number;
  } catch { return null; }
}

const TIER_LIMITS: Record<string, number> = {
  free: 100,
  signed: 500,
  paid: 999999,
  staked: 999999,
};

function getRateLimitKey(request: NextRequest): string {
  const ip = request.headers.get('x-forwarded-for')
    || request.headers.get('x-real-ip')
    || 'unknown';
  const ua = (request.headers.get('user-agent') || 'none').slice(0, 50);
  return `${ip}:${ua}`;
}

function detectTier(request: NextRequest): string {
  if (request.headers.get('X-Payment') || request.headers.get('x-payment')) return 'paid';
  if (request.headers.get('X-Staker') || request.headers.get('x-staker')) return 'staked';
  if (request.headers.get('X-Signature') || request.headers.get('x-signature')) return 'signed';
  return 'free';
}

function checkRateLimit(key: string, tier: string): {
  limited: boolean;
  remaining: number;
  limit: number;
  retryAfter?: number;
} {
  const now = Date.now();
  const limit = TIER_LIMITS[tier] || TIER_LIMITS.free;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_WINDOW, violations: entry?.violations || 0 });
    return { limited: false, remaining: limit - 1, limit };
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);

  if (entry.count > limit) {
    entry.violations++;
    const backoff = Math.min(300, 60 * Math.pow(2, entry.violations - 1));
    return { limited: true, remaining: 0, limit, retryAfter: backoff };
  }

  return { limited: false, remaining, limit };
}

// Cleanup stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.resetAt > 600_000) rateLimitMap.delete(key);
    }
  }, 300_000);
}

// ============ SECURITY HEADERS ============

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
};

function applySecurityHeaders(response: NextResponse): void {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
}

// ============ CORS ============

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': [
    'Content-Type',
    'X-Payment', 'x-payment',
    'X-Payment-Network', 'x-payment-network',
    'X-Signature', 'x-signature',
    'X-Nonce', 'x-nonce',
    'X-Signer', 'x-signer',
    'X-Timestamp', 'x-timestamp',
    'X-Staker', 'x-staker',
    'X-Encrypt-Response', 'x-encrypt-response',
    'Authorization',
  ].join(', '),
  'Access-Control-Max-Age': '86400',
};

function applyCorsHeaders(response: NextResponse): void {
  for (const [k, v] of Object.entries(CORS_HEADERS)) {
    response.headers.set(k, v);
  }
}

// ============ CACHE POLICY (Task 17.6) ============

function getCachePolicy(pathname: string): string | null {
  // No caching for personalized/dynamic endpoints
  if (pathname.includes('/intelligence/') || pathname.includes('/security/')) return 'no-store';
  if (pathname.includes('/zk/')) return 'no-store';
  if (pathname.includes('/stream')) return 'no-store';
  // Fees/mempool: fast-changing, short TTL
  if (pathname.includes('/fees') || pathname.includes('/mempool')) return 'public, max-age=10, stale-while-revalidate=20';
  // Block data: moderate TTL
  if (pathname.includes('/block/')) return 'public, max-age=60, stale-while-revalidate=120';
  // Solv data: cached in lib already, match at HTTP level
  if (pathname.includes('/solv/')) return 'public, max-age=60, stale-while-revalidate=120';
  // Address data: short TTL (balances change)
  if (pathname.includes('/address/')) return 'public, max-age=15, stale-while-revalidate=30';
  // Transaction data: immutable once confirmed
  if (pathname.includes('/tx/') && !pathname.includes('/broadcast')) return 'public, max-age=300, stale-while-revalidate=600';
  // Staking/health/index: moderate
  if (pathname.includes('/staking/') || pathname.includes('/health')) return 'public, max-age=30, stale-while-revalidate=60';
  // Broadcast: never cache writes
  if (pathname.includes('/broadcast')) return 'no-store';
  // Admin: never cache
  if (pathname.includes('/admin/')) return 'no-store';
  return null;
}

// ============ MIDDLEWARE ============

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply to API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // CORS preflight
  if (request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    applyCorsHeaders(response);
    applySecurityHeaders(response);
    return response;
  }

  // Detect tier
  const tier = detectTier(request);
  const key = getRateLimitKey(request);

  // Rate limit check (paid/staked skip)
  if (tier === 'free' || tier === 'signed') {
    // Try KV-backed rate limit first (survives cold starts)
    const kvKey = `rl:${tier}:${key.replace(/[^a-zA-Z0-9.:]/g, '_').slice(0, 100)}`;
    const kvCount = await kvIncr(kvKey, 60);
    const { limited, remaining, limit, retryAfter } = kvCount !== null
      ? { limited: kvCount > (TIER_LIMITS[tier] || 100), remaining: Math.max(0, (TIER_LIMITS[tier] || 100) - kvCount), limit: TIER_LIMITS[tier] || 100, retryAfter: 60 }
      : checkRateLimit(key, tier);

    if (limited) {
      const response = NextResponse.json(
        {
          success: false,
          error: 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          tier,
          limit,
          retryAfter: retryAfter || 60,
          upgrade: {
            payment: 'Add X-Payment header with x402 proof for unlimited',
            staking: 'Stake USDC for unlimited + priority. See /api/v1/staking/status',
          },
        },
        { status: 429 }
      );
      response.headers.set('Retry-After', (retryAfter || 60).toString());
      applyCorsHeaders(response);
      applySecurityHeaders(response);
      return response;
    }
  }

  // x402 payment check (handled at middleware level — routes don't need withPayment)
  const paymentResponse = await checkPayment(request);
  if (paymentResponse) {
    applyCorsHeaders(paymentResponse);
    applySecurityHeaders(paymentResponse);
    return paymentResponse;
  }

  // Record successful paid request
  if (tier === 'paid') {
    recordPayment(detectNetwork(request), pathname);
  }

  // All clear — continue to route
  const response = NextResponse.next();

  // Cache-Control per endpoint tier (Task 17.6)
  const cachePolicy = getCachePolicy(pathname);
  if (cachePolicy) {
    response.headers.set('Cache-Control', cachePolicy);
  }

  // Rate limit headers
  if (tier === 'free' || tier === 'signed') {
    const limit = TIER_LIMITS[tier];
    const entry = rateLimitMap.get(key);
    const remaining = entry ? Math.max(0, limit - entry.count) : limit;
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
  } else {
    response.headers.set('X-RateLimit-Limit', 'unlimited');
  }
  response.headers.set('X-RateLimit-Tier', tier);
  response.headers.set('X-Paid', tier === 'paid' ? 'true' : 'false');

  applyCorsHeaders(response);
  applySecurityHeaders(response);
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
