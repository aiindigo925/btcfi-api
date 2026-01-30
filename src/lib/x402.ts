/**
 * x402 Payment Middleware for BTCFi API
 * 
 * Enables pay-per-query micropayments for AI agents.
 * No API keys. No subscriptions. Payment IS authentication.
 */

import { NextRequest, NextResponse } from 'next/server';

// Configuration
const PRICE_PER_QUERY = 0.01; // $0.01 USDC
const FACILITATOR_URL = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || ''; // Set in env
const NETWORK = process.env.X402_NETWORK || 'base'; // 'base' or 'base-sepolia'
const USDC_ADDRESS = process.env.USDC_ADDRESS || '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'; // Base mainnet USDC

// x402 is currently OPTIONAL - endpoints work without payment for now
// This will be enabled once we have treasury wallet set up
const X402_ENABLED = process.env.X402_ENABLED === 'true';

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
  extra?: Record<string, unknown>;
}

export interface PaymentHeader {
  x402Version: string;
  network: string;
  scheme: string;
  payload: string;
}

/**
 * Convert USD price to USDC base units (6 decimals)
 */
function usdToBaseUnits(usd: number): string {
  return Math.floor(usd * 1_000_000).toString();
}

/**
 * Create payment requirements for a resource
 */
export function createPaymentRequirements(
  resource: string,
  description: string = 'BTCFi API Query'
): PaymentRequirements {
  return {
    scheme: 'exact',
    network: NETWORK,
    maxAmountRequired: usdToBaseUnits(PRICE_PER_QUERY),
    resource,
    description,
    mimeType: 'application/json',
    payTo: TREASURY_ADDRESS,
    maxTimeoutSeconds: 300,
    asset: USDC_ADDRESS,
  };
}

/**
 * Create 402 Payment Required response
 */
export function create402Response(
  paymentRequirements: PaymentRequirements
): NextResponse {
  return NextResponse.json(
    {
      error: 'Payment Required',
      code: 402,
      message: `This endpoint requires payment of $${PRICE_PER_QUERY} USDC`,
      paymentRequirements,
      howToPay: {
        step1: 'Decode the paymentRequirements object',
        step2: `Send ${PRICE_PER_QUERY} USDC to ${TREASURY_ADDRESS} on ${NETWORK}`,
        step3: 'Include payment proof in X-Payment header',
        step4: 'Retry the request',
      },
    },
    {
      status: 402,
      headers: {
        'X-Payment-Required': 'true',
        'X-Payment-Amount': PRICE_PER_QUERY.toString(),
        'X-Payment-Currency': 'USDC',
        'X-Payment-Network': NETWORK,
      },
    }
  );
}

/**
 * Extract payment header from request
 */
export function extractPaymentHeader(request: NextRequest): string | null {
  return request.headers.get('X-Payment') || request.headers.get('x-payment');
}

/**
 * Verify payment (simplified - will integrate with facilitator)
 * 
 * In production, this calls the x402 facilitator to verify the payment proof
 */
export async function verifyPayment(
  paymentHeader: string,
  requirements: PaymentRequirements
): Promise<{ valid: boolean; reason?: string }> {
  if (!paymentHeader) {
    return { valid: false, reason: 'missing_payment_header' };
  }

  try {
    // Decode payment header
    const decoded = JSON.parse(
      Buffer.from(paymentHeader, 'base64').toString('utf8')
    ) as PaymentHeader;

    // Basic validation
    if (!decoded.payload || !decoded.network) {
      return { valid: false, reason: 'invalid_payment_format' };
    }

    // Check network matches
    if (decoded.network !== requirements.network) {
      return { valid: false, reason: 'network_mismatch' };
    }

    // TODO: Call facilitator to verify actual payment
    // For now, accept any well-formed payment header
    // This is for development - production will verify on-chain
    
    console.log('[x402] Payment header received, verification pending facilitator integration');
    
    // Temporary: Accept all payments during development
    if (process.env.NODE_ENV === 'development') {
      return { valid: true };
    }

    // In production, verify with facilitator
    const verifyResponse = await fetch(`${FACILITATOR_URL}/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentHeader,
        paymentRequirements: requirements,
      }),
    });

    if (!verifyResponse.ok) {
      return { valid: false, reason: 'facilitator_verification_failed' };
    }

    const result = await verifyResponse.json();
    return { valid: result.isValid, reason: result.invalidReason };

  } catch (error) {
    console.error('[x402] Payment verification error:', error);
    return { valid: false, reason: 'verification_error' };
  }
}

/**
 * x402 middleware for API routes
 * 
 * Usage in route:
 * ```
 * import { withPayment } from '@/lib/x402';
 * 
 * export async function GET(request: NextRequest) {
 *   const paymentResult = await withPayment(request, '/api/v1/fees');
 *   if (paymentResult) return paymentResult; // Returns 402 if payment needed
 *   
 *   // ... handle request
 * }
 * ```
 */
export async function withPayment(
  request: NextRequest,
  resource: string,
  description?: string
): Promise<NextResponse | null> {
  // Skip payment if disabled
  if (!X402_ENABLED) {
    return null; // Continue to handler
  }

  // Skip payment if no treasury configured
  if (!TREASURY_ADDRESS) {
    console.warn('[x402] Treasury address not configured, skipping payment');
    return null;
  }

  const paymentHeader = extractPaymentHeader(request);
  const requirements = createPaymentRequirements(resource, description);

  // No payment header - return 402
  if (!paymentHeader) {
    return create402Response(requirements);
  }

  // Verify payment
  const verification = await verifyPayment(paymentHeader, requirements);

  if (!verification.valid) {
    return NextResponse.json(
      {
        error: 'Payment Invalid',
        code: 402,
        reason: verification.reason,
        message: 'Payment verification failed. Please try again.',
      },
      { status: 402 }
    );
  }

  // Payment valid - continue to handler
  return null;
}

/**
 * Get x402 configuration status
 */
export function getX402Status() {
  return {
    enabled: X402_ENABLED,
    facilitator: FACILITATOR_URL,
    price: `$${PRICE_PER_QUERY} USDC`,
    network: NETWORK,
    treasury: TREASURY_ADDRESS ? `${TREASURY_ADDRESS.slice(0, 6)}...` : 'not configured',
  };
}
