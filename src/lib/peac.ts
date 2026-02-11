/**
 * PEAC Protocol — Cryptographic Receipt Layer
 *
 * On successful x402 payment, generates a signed PEAC-Receipt header.
 * Agents can verify receipts offline without calling BTCFi again.
 *
 * Receipt format: base64url-encoded JSON Web Signature (JWS)
 * Signing: HMAC-SHA256 (upgradeable to Ed25519 when keypair is configured)
 */

import { createHmac } from 'crypto';

const PEAC_SECRET = process.env.PEAC_SIGNING_KEY || 'btcfi-peac-default-key';
if (!process.env.PEAC_SIGNING_KEY) {
  console.warn('[PEAC] WARNING: Using default signing key. Set PEAC_SIGNING_KEY in production.');
}
const PEAC_VERSION = '0.9.15';

export interface PEACReceiptPayload {
  /** PEAC protocol version */
  v: string;
  /** ISO timestamp */
  ts: string;
  /** Resource path */
  res: string;
  /** Amount paid (USDC base units) */
  amt: string;
  /** Currency */
  cur: string;
  /** Payment rail (base or solana) */
  rail: string;
  /** SHA-256 hash of response body (first 16 chars) */
  rh: string;
  /** Provider */
  iss: string;
}

function base64url(data: string): string {
  return Buffer.from(data).toString('base64url');
}

function sha256short(data: string): string {
  return createHmac('sha256', 'hash').update(data).digest('hex').slice(0, 16);
}

/**
 * Generate a PEAC receipt for a successful payment.
 */
export function generatePEACReceipt(
  resource: string,
  amount: string,
  network: string,
  responseBody: string
): string {
  const payload: PEACReceiptPayload = {
    v: PEAC_VERSION,
    ts: new Date().toISOString(),
    res: resource,
    amt: amount,
    cur: 'USDC',
    rail: network,
    rh: sha256short(responseBody),
    iss: 'btcfi.aiindigo.com',
  };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'PEAC' }));
  const body = base64url(JSON.stringify(payload));
  const signature = createHmac('sha256', PEAC_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

/**
 * Verify a PEAC receipt locally.
 */
export function verifyPEACReceipt(receipt: string): { valid: boolean; payload?: PEACReceiptPayload; error?: string } {
  try {
    const parts = receipt.split('.');
    if (parts.length !== 3) return { valid: false, error: 'invalid_format' };

    const [header, body, signature] = parts;
    const expectedSig = createHmac('sha256', PEAC_SECRET)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return { valid: false, error: 'invalid_signature' };

    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as PEACReceiptPayload;
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'parse_error' };
  }
}
