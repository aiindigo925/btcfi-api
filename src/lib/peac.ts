/**
 * PEAC Protocol — Cryptographic Receipt Layer
 *
 * On successful x402 payment, generates a signed PEAC-Receipt header.
 * Agents can verify receipts offline without calling BTCFi again.
 *
 * Receipt format: base64url-encoded JSON Web Signature (JWS)
 * Signing: HMAC-SHA256 (upgradeable to Ed25519 when keypair is configured)
 */

import { createHmac, createHash } from 'crypto';

const PEAC_SECRET = process.env.PEAC_SIGNING_KEY;
if (!PEAC_SECRET) {
  console.error('[PEAC] FATAL: PEAC_SIGNING_KEY not set. Receipt generation DISABLED.');
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
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
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
  if (!PEAC_SECRET) {
    throw new Error('[PEAC] Cannot generate receipt: PEAC_SIGNING_KEY not configured');
  }
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
  const signature = createHmac('sha256', PEAC_SECRET!)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}


