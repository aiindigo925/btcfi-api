/**
 * BTCFi Free Tier Middleware — Agent Discovery Access
 *
 * Provides limited free access to endpoints for AI agent discovery and basic queries.
 * Agents can explore the API, fetch metadata, and make a limited number of free
 * requests per hour before needing to use x402 micropayments.
 *
 * Free tier limits:
 *   - Discovery endpoints: unlimited (health, API index, skills, OpenAPI)
 *   - Read endpoints: 10 requests/hour per IP
 *   - Write endpoints: not available (broadcast, ZK generation)
 *   - SSE streams: not available (requires payment)
 *
 * This module is used by middleware.ts to handle free-tier agent access.
 * When X402_ENABLED=false (dev mode), all endpoints are free.
 * When X402_ENABLED=true (production), the free tier applies.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============ FREE TIER CONFIGURATION ============

/** Free tier rate limits (per hour, per IP) */
export const FREE_TIER_LIMITS = {
  /** Unlimited discovery/metadata endpoints */
  discovery: Infinity,
  /** Core read endpoints: 10 requests/hour */
  read: 10,
  /** Intelligence read endpoints: 5 requests/hour */
  intelligence: 5,
  /** Write operations: blocked */
  write: 0,
  /** SSE streams: blocked */
  stream: 0,
} as const;

/** Endpoints that are always free (discovery/metadata) */
const DISCOVERY_ENDPOINTS = [
  '/api/health',
  '/api/v1',
  '/api/v1/staking',
  '/api/v1/agent-skills',
  '/api/docs',
  '/api/v1/payment-test',
];

/** Read-only endpoints available on free tier */
const FREE_READ_ENDPOINTS = [
  '/api/v1/fees',
  '/api/v1/mempool',
  '/api/v1/address',
  '/api/v1/tx',  // excludes /broadcast
  '/api/v1/block',
  '/api/v1/intelligence/fees',
  '/api/v1/intelligence/whales',
  '/api/v1/intelligence/network',
  '/api/v1/intelligence/risk',
  '/api/v1/intelligence/consolidate',
  '/api/v1/intelligence/mvrv',
  '/api/v1/intelligence/sopr',
  '/api/v1/intelligence/nupl',
  '/api/v1/intelligence/hodl-waves',
  '/api/v1/security/threat',
  '/api/v1/solv/reserves',
  '/api/v1/solv/yield',
  '/api/v1/solv/liquidity',
  '/api/v1/solv/risk',
  '/api/v1/eth/gas',
  '/api/v1/eth/address',
  '/api/v1/eth/tx',
  '/api/v1/sol/fees',
  '/api/v1/sol/address',
];

/** Endpoints that require payment (write/stream) */
const PAID_ONLY_ENDPOINTS = [
  '/api/v1/tx/broadcast',
  '/api/v1/stream',
  '/api/v1/stream/whales',
  '/api/v1/zk/balance-proof',
  '/api/v1/zk/age-proof',
  '/api/v1/zk/membership',
  '/api/v1/zk/verify',
];

// ============ CLASSIFICATION ============

export type FreeTierCategory = 'discovery' | 'read' | 'intelligence' | 'write' | 'stream' | 'blocked';

/**
 * Classify an API path into a free tier category.
 */
export function classifyPath(pathname: string): FreeTierCategory {
  // Discovery — always free, unlimited
  if (DISCOVERY_ENDPOINTS.some(p => pathname === p || pathname.startsWith(p))) {
    return 'discovery';
  }

  // Write/stream — blocked on free tier
  if (PAID_ONLY_ENDPOINTS.some(p => pathname.startsWith(p))) {
    // Broadcast
    if (pathname.includes('/broadcast')) return 'write';
    // Streams
    if (pathname.includes('/stream')) return 'stream';
    // ZK generation/verification
    if (pathname.includes('/zk')) return 'write';
    return 'blocked';
  }

  // Intelligence endpoints — lower limit
  if (pathname.includes('/intelligence/') || pathname.includes('/security/')) {
    return 'intelligence';
  }

  // Core read — standard free read
  if (FREE_READ_ENDPOINTS.some(p => pathname.startsWith(p))) {
    return 'read';
  }

  // Everything else — treat as blocked on free tier
  return 'blocked';
}

/**
 * Get the rate limit for a given free tier category.
 */
export function getFreeTierLimit(category: FreeTierCategory): number {
  switch (category) {
    case 'discovery': return FREE_TIER_LIMITS.discovery;
    case 'read': return FREE_TIER_LIMITS.read;
    case 'intelligence': return FREE_TIER_LIMITS.intelligence;
    case 'write': return FREE_TIER_LIMITS.write;
    case 'stream': return FREE_TIER_LIMITS.stream;
    case 'blocked': return 0;
  }
}

// ============ FREE TIER 402 RESPONSE ============

/**
 * Create a free-tier-specific 402 response explaining that the endpoint
 * requires payment, with helpful context for agents.
 */
export function createFreeTier402(pathname: string, category: FreeTierCategory): NextResponse {
  const isWrite = category === 'write' || category === 'stream';
  const message = isWrite
    ? `This endpoint requires x402 payment. Send X-Payment header with a valid micropayment proof.`
    : `Free tier limit reached for this endpoint category. Send X-Payment header with a valid micropayment proof for unlimited access.`;

  return NextResponse.json(
    {
      error: 'Payment Required',
      code: 402,
      message,
      freeTier: {
        category,
        limit: getFreeTierLimit(category),
        remaining: 0,
        upgradeInfo: 'Add X-Payment header with x402 micropayment proof (Base or Solana USDC)',
      },
      paymentOptions: [
        {
          network: 'base',
          currency: 'USDC',
          facilitator: 'https://x402.org/facilitator',
          fees: 'zero',
        },
        {
          network: 'solana',
          currency: 'USDC',
          facilitator: 'https://thrt.ai/nlx402',
          fees: 'zero',
        },
      ],
      docs: 'https://btcfi.aiindigo.com/openapi.json',
      manifest: 'https://btcfi.aiindigo.com/.well-known/x402-manifest.json',
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Amount': '0.01',
        'X-Payment-Currency': 'USDC',
        'X-Payment-Networks': 'base,solana',
        'X-Free-Tier-Category': category,
        'X-Free-Tier-Limit': String(getFreeTierLimit(category)),
        'X-Free-Tier-Remaining': '0',
      },
    }
  );
}

// ============ FREE TIER RATE LIMIT CHECK ============

// In-memory rate limiter for free tier (per-IP, per-hour)
// In production, this uses Upstash Redis (same pattern as main middleware)
const freeTierCounts = new Map<string, { count: number; resetAt: number }>();

const FREE_TIER_WINDOW_MS = 60 * 60 * 1000; // 1 hour

/**
 * Check if a free-tier request is within limits.
 * Returns { allowed, remaining, resetAt } or null if Redis-based check should be used.
 */
export function checkFreeTierLimit(
  ip: string,
  category: FreeTierCategory
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = getFreeTierLimit(category);

  // Discovery is unlimited
  if (limit === Infinity) {
    return { allowed: true, remaining: Infinity, resetAt: 0 };
  }

  // Write/stream blocked on free tier
  if (limit === 0) {
    return { allowed: false, remaining: 0, resetAt: Date.now() + FREE_TIER_WINDOW_MS };
  }

  const key = `free:${category}:${ip}`;
  const now = Date.now();
  const entry = freeTierCounts.get(key);

  if (!entry || now > entry.resetAt) {
    // New window or expired
    freeTierCounts.set(key, { count: 1, resetAt: now + FREE_TIER_WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + FREE_TIER_WINDOW_MS };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

// ============ FREE TIER MIDDLEWARE HANDLER ============

/**
 * Handle free-tier logic for agent discovery requests.
 *
 * This is called from middleware.ts when X402_ENABLED=true and the request
 * has no X-Payment header. Returns:
 *   - null if the request should proceed (free tier allows it)
 *   - NextResponse if the request should be blocked (402 or rate limit)
 */
export async function handleFreeTier(
  request: NextRequest
): Promise<NextResponse | null> {
  const pathname = request.nextUrl.pathname;
  const category = classifyPath(pathname);
  const limit = getFreeTierLimit(category);

  // Discovery endpoints — always free
  if (category === 'discovery') {
    const response = NextResponse.next();
    response.headers.set('X-Free-Tier', 'true');
    response.headers.set('X-Free-Tier-Category', 'discovery');
    response.headers.set('X-Free-Tier-Limit', 'unlimited');
    return null; // proceed
  }

  // Get client IP
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '0.0.0.0';

  // Check rate limit
  const rateResult = checkFreeTierLimit(ip, category);

  if (!rateResult.allowed) {
    // Rate limit exceeded — return 402 with upgrade instructions
    const response = createFreeTier402(pathname, category);
    response.headers.set('X-RateLimit-Limit', String(limit));
    response.headers.set('X-RateLimit-Remaining', '0');
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateResult.resetAt / 1000)));
    return response;
  }

  // Within limits — add free tier headers and proceed
  const response = NextResponse.next();
  response.headers.set('X-Free-Tier', 'true');
  response.headers.set('X-Free-Tier-Category', category);
  response.headers.set('X-Free-Tier-Limit', String(limit));
  response.headers.set('X-Free-Tier-Remaining', rateResult.remaining === Infinity ? 'unlimited' : String(rateResult.remaining));
  response.headers.set('X-RateLimit-Limit', String(limit));
  response.headers.set('X-RateLimit-Remaining', rateResult.remaining === Infinity ? 'unlimited' : String(rateResult.remaining));
  if (rateResult.resetAt > 0) {
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateResult.resetAt / 1000)));
  }

  return null; // proceed
}

// ============ FREE TIER STATUS ENDPOINT DATA ============

/**
 * Generate free tier status information for the health endpoint.
 */
export function getFreeTierStatus(ip?: string) {
  return {
    enabled: true,
    limits: {
      discovery: 'unlimited',
      read: `${FREE_TIER_LIMITS.read}/hour`,
      intelligence: `${FREE_TIER_LIMITS.intelligence}/hour`,
      write: 'requires payment',
      stream: 'requires payment',
    },
    discoveryEndpoints: DISCOVERY_ENDPOINTS,
    upgradePath: 'Add X-Payment header with x402 micropayment proof',
    paymentNetworks: ['base', 'solana'],
    pricing: {
      core: '$0.01',
      intelligence: '$0.02',
      security: '$0.02',
      btcfi: '$0.02',
      zk: '$0.01-$0.03',
      broadcast: '$0.05',
    },
  };
}
