/**
 * x402 Payment Configuration — MP2 Phase 12
 *
 * Custom x402 implementation for Base (Coinbase facilitator, fee-free ERC-3009)
 * Custom NLx402 verification for Solana (PCEF nonprofit, zero fees)
 *
 * Payment is now handled at middleware level — routes don't call withPayment() anymore.
 * This file exports pricing config, verification helpers, and status.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============ PRICING CONFIG ============

export const PRICING: Record<string, number> = {
  default: 0.01,        // $0.01 USDC — standard queries
  broadcast: 0.05,      // $0.05 USDC — tx broadcast (write op)
  intelligence: 0.02,   // $0.02 USDC — smart analysis
  solv: 0.02,           // $0.02 USDC — Solv Protocol data
  security: 0.02,       // $0.02 USDC — threat analysis
  zk: 0.03,             // $0.03 USDC — ZK proof generation
};

/**
 * Route-level pricing map for middleware.
 * Key: path pattern → price in USDC cents.
 */
export const ROUTE_PRICING: Record<string, number> = {
  // Core ($0.01)
  '/api/v1/fees': 0.01,
  '/api/v1/mempool': 0.01,
  '/api/v1/address': 0.01,
  '/api/v1/tx': 0.01,
  '/api/v1/block': 0.01,
  // Intelligence ($0.02)
  '/api/v1/intelligence': 0.02,
  // Security ($0.02)
  '/api/v1/security': 0.02,
  // Solv Protocol ($0.02)
  '/api/v1/solv': 0.02,
  // Broadcast ($0.05)
  '/api/v1/tx/broadcast': 0.05,
  // Free
  '/api/v1/staking': 0,
  '/api/v1': 0, // index
  '/api/v1/payment-test': 0, // dev-only, returns 404 in production
  '/api/health': 0,
  // ZK Proofs ($0.03 generate, $0.01 verify)
  '/api/v1/zk/verify': 0.01,
  '/api/v1/zk': 0.03,
  // Streams ($0.01)
  '/api/v1/stream': 0.01,
};

/**
 * Get price for a given API path
 */
export function getPriceForPath(pathname: string): number {
  // Exact match first
  if (ROUTE_PRICING[pathname] !== undefined) return ROUTE_PRICING[pathname];
  // Broadcast special case (must check before generic /tx)
  if (pathname.includes('/broadcast')) return PRICING.broadcast;
  // Prefix match
  for (const [prefix, price] of Object.entries(ROUTE_PRICING)) {
    if (pathname.startsWith(prefix) && price > 0) return price;
  }
  return PRICING.default;
}

// ============ FACILITATOR CONFIG ============

export const FACILITATORS = {
  base: {
    url: process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator',
    network: 'base' as const,
    asset: 'USDC',
    assetAddress: process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: process.env.TREASURY_ADDRESS_BASE || '0xA6Bba2453673196ae22fb249C7eA9FA118a87150',
    fees: 'zero (Coinbase ERC-3009)',
    provider: 'Coinbase x402 Facilitator',
  },
  solana: {
    url: process.env.NLX402_URL || 'https://thrt.ai/nlx402',
    network: 'solana' as const,
    asset: 'USDC',
    assetAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    payTo: process.env.TREASURY_ADDRESS_SOLANA || '8f2LTSW8ffDHE1UgkkUjJXpuXpvSq8gGXtWVrGX2uRqQ',
    fees: 'zero (nonprofit)',
    provider: 'NLx402 (PCEF 501c3)',
  },
};

const X402_ENABLED = process.env.X402_ENABLED === 'true';
const DEFAULT_NETWORK = process.env.X402_NETWORK || 'base';

// ============ NETWORK DETECTION ============

export function detectNetwork(request: NextRequest): string {
  const header = request.headers.get('X-Payment-Network')
    || request.headers.get('x-payment-network');
  if (header && (header === 'base' || header === 'solana')) return header;
  return DEFAULT_NETWORK;
}

// ============ 402 RESPONSE (V2 SPEC — HEADERS) ============

export function create402Response(pathname: string, network: string): NextResponse {
  const price = getPriceForPath(pathname);
  const facilitator = FACILITATORS[network as keyof typeof FACILITATORS] || FACILITATORS.base;
  const altNetwork = network === 'base' ? 'solana' : 'base';
  const altFacilitator = FACILITATORS[altNetwork as keyof typeof FACILITATORS];

  const amountBaseUnits = Math.floor(price * 1_000_000).toString();

  return NextResponse.json(
    {
      error: 'Payment Required',
      code: 402,
      message: `This endpoint requires $${price} USDC`,
      paymentRequirements: {
        scheme: 'exact',
        network: facilitator.network,
        maxAmountRequired: amountBaseUnits,
        resource: pathname,
        payTo: facilitator.payTo,
        asset: facilitator.assetAddress,
        facilitator: facilitator.url,
        maxTimeoutSeconds: 300,
      },
      alternatePayment: {
        network: altFacilitator.network,
        maxAmountRequired: amountBaseUnits,
        payTo: altFacilitator.payTo,
        asset: altFacilitator.assetAddress,
        facilitator: altFacilitator.url,
      },
      networks: {
        base: { provider: FACILITATORS.base.provider, fees: FACILITATORS.base.fees },
        solana: { provider: FACILITATORS.solana.provider, fees: FACILITATORS.solana.fees },
      },
      pricing: PRICING,
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Amount': price.toString(),
        'X-Payment-Currency': 'USDC',
        'X-Payment-Networks': 'base,solana',
      },
    }
  );
}

// ============ PAYMENT VERIFICATION ============

export async function verifyPayment(
  paymentHeader: string,
  pathname: string,
  network: string
): Promise<{ valid: boolean; reason?: string; network?: string }> {
  if (!paymentHeader) return { valid: false, reason: 'missing_payment_header' };

  const price = getPriceForPath(pathname);
  const facilitator = FACILITATORS[network as keyof typeof FACILITATORS] || FACILITATORS.base;
  const amountBaseUnits = Math.floor(price * 1_000_000).toString();

  // Dev mode: accept any well-formed payment
  if (process.env.NODE_ENV === 'development') {
    try {
      JSON.parse(Buffer.from(paymentHeader, 'base64').toString('utf8'));
      return { valid: true, network };
    } catch {
      return { valid: false, reason: 'invalid_base64_json' };
    }
  }

  const requirements = {
    scheme: 'exact',
    network: facilitator.network,
    maxAmountRequired: amountBaseUnits,
    resource: pathname,
    payTo: facilitator.payTo,
    asset: facilitator.assetAddress,
    facilitator: facilitator.url,
    maxTimeoutSeconds: 300,
    mimeType: 'application/json',
    description: 'BTCFi API Query',
  };

  try {
    const response = await fetch(`${facilitator.url}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentHeader,
        paymentRequirements: requirements,
        ...(network === 'solana' ? {
          expectedPayTo: facilitator.payTo,
          expectedAsset: facilitator.assetAddress,
        } : {}),
      }),
    });
    if (!response.ok) return { valid: false, reason: `${network}_facilitator_error`, network };
    const result = await response.json();
    return {
      valid: result.isValid || result.valid || false,
      reason: result.invalidReason || result.reason,
      network,
    };
  } catch (error) {
    console.error(`[x402:${network}] Verification error:`, error);
    return { valid: false, reason: `${network}_facilitator_unreachable`, network };
  }
}

// ============ MIDDLEWARE HELPER ============

/**
 * Check payment for a request. Called from middleware.ts.
 * Returns null if payment OK (or payments disabled), NextResponse if 402/error.
 */
export async function checkPayment(request: NextRequest): Promise<NextResponse | null> {
  if (!X402_ENABLED) return null;

  const pathname = request.nextUrl.pathname;
  const price = getPriceForPath(pathname);

  // Free endpoints
  if (price === 0) return null;

  const network = detectNetwork(request);
  const paymentHeader = request.headers.get('X-Payment') || request.headers.get('x-payment');

  // No payment → 402
  if (!paymentHeader) {
    return create402Response(pathname, network);
  }

  // Verify payment
  const result = await verifyPayment(paymentHeader, pathname, network);
  if (!result.valid) {
    return NextResponse.json(
      {
        error: 'Payment Invalid',
        code: 402,
        reason: result.reason,
        network: result.network,
        message: 'Payment verification failed. Please retry.',
      },
      { status: 402 }
    );
  }

  return null; // Payment valid — proceed
}

// ============ LEGACY COMPAT ============

/**
 * Legacy withPayment() — redirects to middleware-based payment check.
 * Kept for any routes that still call it directly during migration.
 * @deprecated Use middleware-level payment instead.
 */
export async function withPayment(
  request: NextRequest,
  _resource: string,
  _description?: string
): Promise<NextResponse | null> {
  return checkPayment(request);
}

// ============ STATUS ============

export function getX402Status() {
  return {
    enabled: X402_ENABLED,
    version: '2.0',
    sdk: 'custom x402 + NLx402',
    pricing: PRICING,
    networks: {
      base: {
        facilitator: FACILITATORS.base.url,
        provider: FACILITATORS.base.provider,
        fees: FACILITATORS.base.fees,
        payTo: `${FACILITATORS.base.payTo.slice(0, 6)}...${FACILITATORS.base.payTo.slice(-4)}`,
      },
      solana: {
        facilitator: FACILITATORS.solana.url,
        provider: FACILITATORS.solana.provider,
        fees: FACILITATORS.solana.fees,
        payTo: `${FACILITATORS.solana.payTo.slice(0, 6)}...${FACILITATORS.solana.payTo.slice(-4)}`,
        features: ['nonce-locked', 'hash-bound', 'fast-expiring', 'zero-fees'],
      },
    },
    manifest: '/.well-known/x402-manifest.json',
  };
}
