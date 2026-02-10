/**
 * x402 Dual-Facilitator Payment Middleware for BTCFi API
 *
 * Two payment networks:
 *   Base  → pay.aiindigo.com (OpenFacilitator)
 *   Solana → thrt.ai/nlx402 (PCEF NLx402 — free, nonprofit, nonce-locked)
 *
 * No API keys. No subscriptions. Payment IS authentication.
 */

import { NextRequest, NextResponse } from 'next/server';

// ============ PRICING ============

const PRICING: Record<string, number> = {
  default: 0.01,        // $0.01 USDC — standard queries
  broadcast: 0.05,      // $0.05 USDC — tx broadcast (write op)
  intelligence: 0.02,   // $0.02 USDC — smart analysis
  solv: 0.02,           // $0.02 USDC — Solv Protocol data
  security: 0.02,       // $0.02 USDC — threat analysis
  zk: 0.03,             // $0.03 USDC — ZK proof generation
};

// ============ FACILITATORS ============

interface FacilitatorConfig {
  url: string;
  network: string;
  asset: string;
  assetAddress: string;
  payTo: string;
  fees: string;
  provider: string;
}

const FACILITATORS: Record<string, FacilitatorConfig> = {
  base: {
    url: process.env.X402_FACILITATOR_URL || 'https://pay.aiindigo.com',
    network: 'base',
    asset: 'USDC',
    assetAddress: process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    payTo: process.env.TREASURY_ADDRESS || '0x3F3a0E01B10d0bC94E143a65Fa23Fd3E1CB0E920',
    fees: 'standard',
    provider: 'OpenFacilitator (AI Indigo)',
  },
  solana: {
    url: process.env.NLX402_URL || 'https://thrt.ai/nlx402',
    network: 'solana',
    asset: 'USDC',
    assetAddress: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Solana USDC mint
    payTo: process.env.TREASURY_ADDRESS_SOLANA || 'DoQy1nDKFnZVzvA4FiMi82hdv1Wb6eiyVHdHyzg7TRi2',
    fees: 'zero',
    provider: 'NLx402 (PCEF 501c3 nonprofit)',
  },
};

const DEFAULT_NETWORK = process.env.X402_NETWORK || 'base';
const X402_ENABLED = process.env.X402_ENABLED === 'true';

// ============ TYPES ============

export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  facilitator: string;
  extra?: Record<string, unknown>;
}

// ============ HELPERS ============

function getPriceForResource(resource: string): number {
  if (resource.includes('/broadcast')) return PRICING.broadcast;
  if (resource.includes('/intelligence')) return PRICING.intelligence;
  if (resource.includes('/solv') || resource.includes('/defi')) return PRICING.solv;
  if (resource.includes('/security') || resource.includes('/threat')) return PRICING.security;
  if (resource.includes('/zk')) return PRICING.zk;
  return PRICING.default;
}

function usdToBaseUnits(usd: number, network: string): string {
  // Both Base USDC and Solana USDC use 6 decimals
  return Math.floor(usd * 1_000_000).toString();
}

function detectNetwork(request: NextRequest): string {
  const header = request.headers.get('X-Payment-Network')
    || request.headers.get('x-payment-network');
  if (header && FACILITATORS[header.toLowerCase()]) {
    return header.toLowerCase();
  }
  return DEFAULT_NETWORK;
}

// ============ PAYMENT REQUIREMENTS ============

export function createPaymentRequirements(
  resource: string,
  network: string = DEFAULT_NETWORK,
  description: string = 'BTCFi API Query'
): PaymentRequirements {
  const price = getPriceForResource(resource);
  const facilitator = FACILITATORS[network] || FACILITATORS[DEFAULT_NETWORK];

  return {
    scheme: 'exact',
    network: facilitator.network,
    maxAmountRequired: usdToBaseUnits(price, network),
    resource,
    description,
    mimeType: 'application/json',
    payTo: facilitator.payTo,
    maxTimeoutSeconds: 300,
    asset: facilitator.assetAddress,
    facilitator: facilitator.url,
  };
}

// ============ 402 RESPONSE ============

export function create402Response(
  paymentRequirements: PaymentRequirements,
  alternateNetwork?: string
): NextResponse {
  const price = getPriceForResource(paymentRequirements.resource);

  // Build alternate payment option
  const altNetwork = alternateNetwork
    || (paymentRequirements.network === 'base' ? 'solana' : 'base');
  const altRequirements = createPaymentRequirements(
    paymentRequirements.resource,
    altNetwork
  );

  return NextResponse.json(
    {
      error: 'Payment Required',
      code: 402,
      message: `This endpoint requires payment of $${price} USDC`,
      paymentRequirements,
      alternatePayment: altRequirements,
      networks: {
        base: {
          facilitator: FACILITATORS.base.url,
          fees: FACILITATORS.base.fees,
          provider: FACILITATORS.base.provider,
        },
        solana: {
          facilitator: FACILITATORS.solana.url,
          fees: FACILITATORS.solana.fees,
          provider: FACILITATORS.solana.provider,
          note: 'NLx402: nonce-locked, hash-bound, zero facilitator fees',
        },
      },
      howToPay: {
        step1: 'Choose network: set X-Payment-Network header to "base" or "solana"',
        step2: `Send $${price} USDC to the payTo address for your chosen network`,
        step3: 'Include payment proof in X-Payment header (base64 JSON)',
        step4: 'Retry the request',
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

// ============ PAYMENT EXTRACTION ============

export function extractPaymentHeader(request: NextRequest): string | null {
  return request.headers.get('X-Payment') || request.headers.get('x-payment');
}

// ============ VERIFICATION ============

async function verifyBasePayment(
  paymentHeader: string,
  requirements: PaymentRequirements
): Promise<{ valid: boolean; reason?: string }> {
  const facilitator = FACILITATORS.base;
  try {
    const response = await fetch(`${facilitator.url}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentHeader, paymentRequirements: requirements }),
    });
    if (!response.ok) return { valid: false, reason: 'base_facilitator_verification_failed' };
    const result = await response.json();
    return { valid: result.isValid, reason: result.invalidReason };
  } catch (error) {
    console.error('[x402:base] Verification error:', error);
    return { valid: false, reason: 'base_facilitator_unreachable' };
  }
}

async function verifySolanaPayment(
  paymentHeader: string,
  requirements: PaymentRequirements
): Promise<{ valid: boolean; reason?: string }> {
  const facilitator = FACILITATORS.solana;
  try {
    // NLx402 verification — nonce-locked, hash-bound
    const response = await fetch(`${facilitator.url}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentHeader,
        paymentRequirements: requirements,
        // NLx402 expects these for tamper-resistance
        expectedPayTo: facilitator.payTo,
        expectedAsset: facilitator.assetAddress,
      }),
    });
    if (!response.ok) return { valid: false, reason: 'nlx402_verification_failed' };
    const result = await response.json();
    return { valid: result.isValid || result.valid, reason: result.invalidReason || result.reason };
  } catch (error) {
    console.error('[x402:solana] NLx402 verification error:', error);
    return { valid: false, reason: 'nlx402_unreachable' };
  }
}

export async function verifyPayment(
  paymentHeader: string,
  requirements: PaymentRequirements
): Promise<{ valid: boolean; reason?: string; network?: string }> {
  if (!paymentHeader) return { valid: false, reason: 'missing_payment_header' };

  try {
    const decoded = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString('utf8')
    );

    if (!decoded.payload) return { valid: false, reason: 'invalid_payment_format' };

    const network = decoded.network || requirements.network;

    // Dev mode: accept any well-formed payment
    if (process.env.NODE_ENV === 'development') {
      return { valid: true, network };
    }

    // Route to correct facilitator
    if (network === 'solana') {
      const result = await verifySolanaPayment(paymentHeader, requirements);
      return { ...result, network: 'solana' };
    } else {
      const result = await verifyBasePayment(paymentHeader, requirements);
      return { ...result, network: 'base' };
    }
  } catch (error) {
    console.error('[x402] Payment verification error:', error);
    return { valid: false, reason: 'verification_error' };
  }
}

// ============ MIDDLEWARE ============

export async function withPayment(
  request: NextRequest,
  resource: string,
  description?: string
): Promise<NextResponse | null> {
  if (!X402_ENABLED) return null;

  const network = detectNetwork(request);
  const paymentHeader = extractPaymentHeader(request);
  const requirements = createPaymentRequirements(resource, network, description);

  if (!paymentHeader) {
    return create402Response(requirements);
  }

  const verification = await verifyPayment(paymentHeader, requirements);

  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'Payment Invalid',
        code: 402,
        reason: verification.reason,
        network: verification.network,
        message: 'Payment verification failed. Please try again.',
      },
      { status: 402 }
    );
  }

  return null;
}

// ============ STATUS ============

export function getX402Status() {
  return {
    enabled: X402_ENABLED,
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
    howToChoose: 'Set X-Payment-Network header to "base" or "solana"',
  };
}
