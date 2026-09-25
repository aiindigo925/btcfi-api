/**
 * PEAC Protocol — Cryptographic Receipt Layer
 *
 * On successful x402 payment, generates a signed PEAC-Receipt header.
 * Agents can verify receipts offline without calling BTCFi again.
 *
 * Receipt format: base64url-encoded JSON Web Signature (JWS)
 * Signing: HMAC-SHA256 (upgradeable to Ed25519 when keypair is configured)
 */

const PEAC_SECRET = process.env.PEAC_SIGNING_KEY;
if (!PEAC_SECRET) {
  console.error('[PEAC] FATAL: PEAC_SIGNING_KEY not set. Receipt generation DISABLED.');
}
const PEAC_VERSION = '0.9.15';

/** Web Crypto API helper: HMAC-SHA256 (Edge Runtime compatible) */
async function hmacSha256Base64url(key: string, data: string): Promise<string> {
  const keyData = new TextEncoder().encode(key);
  const msgData = new TextEncoder().encode(data);
  const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Web Crypto API helper: SHA-256 hex (Edge Runtime compatible) */
async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64url(data: string): string {
  return btoa(data).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

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

async function sha256short(data: string): Promise<string> {
  return (await sha256Hex(data)).slice(0, 16);
}

/**
 * Generate a PEAC receipt for a successful payment.
 */
export async function generatePEACReceipt(
  resource: string,
  amount: string,
  network: string,
  responseBody: string
): Promise<string> {
  if (!PEAC_SECRET) {
    return '';
  }
  const payload: PEACReceiptPayload = {
    v: PEAC_VERSION,
    ts: new Date().toISOString(),
    res: resource,
    amt: amount,
    cur: 'USDC',
    rail: network,
    rh: await sha256short(responseBody),
    iss: 'btcfi.aiindigo.com',
  };

  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'PEAC' }));
  const body = base64url(JSON.stringify(payload));
  const signature = await hmacSha256Base64url(PEAC_SECRET!, `${header}.${body}`);

  return `${header}.${body}.${signature}`;
}


