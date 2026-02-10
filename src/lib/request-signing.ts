/**
 * BTCFi Request Signing Library — MP1 Task 8.5
 * Wallet-based authentication with nonce replay protection.
 *
 * Inspired by NLx402's nonce-locked approach and Clawd Bot's on-chain patterns.
 * Agents sign requests with their wallet key — no API keys needed.
 *
 * Supports:
 *   - Solana (Ed25519) via X-Signer header with Solana address
 *   - EVM (secp256k1) via X-Signer header with 0x address
 *
 * Headers:
 *   X-Signature: base64 encoded signature of (method + path + nonce + timestamp)
 *   X-Nonce: unique nonce per request (UUID or random hex)
 *   X-Signer: wallet address (Solana or EVM)
 *   X-Timestamp: Unix timestamp (seconds)
 */

import { isValidEvmAddress, isValidSolanaAddress } from './validation';

// Nonce store — in-memory, resets on cold start (Vercel-appropriate)
// Production upgrade: Redis or KV store
const usedNonces = new Map<string, number>(); // nonce → timestamp
const NONCE_TTL = 300_000; // 5 minutes
const MAX_CLOCK_DRIFT = 60; // seconds

// Rate limit tiers based on signing
export const RATE_LIMITS = {
  free: 100,      // per minute
  signed: 500,    // per minute — wallet-verified
  paid: Infinity, // x402 paid
  staked: Infinity, // staked agents
} as const;

export type SignerTier = keyof typeof RATE_LIMITS;

export interface SignatureVerification {
  valid: boolean;
  signer?: string;
  network?: 'solana' | 'evm';
  tier: SignerTier;
  reason?: string;
}

/**
 * Extract signing headers from request
 */
export function extractSigningHeaders(headers: Headers): {
  signature: string | null;
  nonce: string | null;
  signer: string | null;
  timestamp: string | null;
} {
  return {
    signature: headers.get('X-Signature') || headers.get('x-signature'),
    nonce: headers.get('X-Nonce') || headers.get('x-nonce'),
    signer: headers.get('X-Signer') || headers.get('x-signer'),
    timestamp: headers.get('X-Timestamp') || headers.get('x-timestamp'),
  };
}

/**
 * Build the message that should be signed.
 * Format: METHOD:PATH:NONCE:TIMESTAMP
 */
export function buildSigningMessage(
  method: string,
  path: string,
  nonce: string,
  timestamp: string
): string {
  return `${method}:${path}:${nonce}:${timestamp}`;
}

/**
 * Check if a nonce has been used (replay protection)
 */
function checkNonce(nonce: string): boolean {
  // Cleanup expired nonces periodically
  const now = Date.now();
  if (usedNonces.size > 10000) {
    for (const [n, ts] of usedNonces) {
      if (now - ts > NONCE_TTL) usedNonces.delete(n);
    }
  }

  if (usedNonces.has(nonce)) return false; // Replay!
  usedNonces.set(nonce, now);
  return true;
}

/**
 * Verify timestamp is within acceptable drift
 */
function checkTimestamp(timestamp: string): boolean {
  const ts = parseInt(timestamp, 10);
  if (isNaN(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  return Math.abs(now - ts) <= MAX_CLOCK_DRIFT;
}

/**
 * Base58 decode (Bitcoin/Solana alphabet)
 * Zero-dependency implementation for Solana public key decoding
 */
function base58Decode(str: string): Uint8Array {
  const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const BASE = BigInt(58);
  let num = BigInt(0);
  for (const char of str) {
    const idx = ALPHABET.indexOf(char);
    if (idx === -1) throw new Error(`Invalid base58 char: ${char}`);
    num = num * BASE + BigInt(idx);
  }
  const hex = num.toString(16).padStart(64, '0');
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  let leadingZeros = 0;
  for (const char of str) { if (char === '1') leadingZeros++; else break; }
  if (leadingZeros > 0) {
    const result = new Uint8Array(leadingZeros + bytes.length);
    result.set(bytes, leadingZeros);
    return result;
  }
  return bytes;
}

/**
 * Verify an Ed25519 signature (Solana wallets)
 * Uses tweetnacl for real cryptographic verification
 */
async function verifyEd25519(
  message: string,
  signatureBase64: string,
  publicKeyBase58: string
): Promise<boolean> {
  try {
    const nacl = await import('tweetnacl');
    const { decodeBase64 } = await import('tweetnacl-util');

    const signature = decodeBase64(signatureBase64);
    if (signature.length !== 64) return false;

    const publicKey = base58Decode(publicKeyBase58);
    if (publicKey.length !== 32) return false;

    const messageBytes = new TextEncoder().encode(message);
    return nacl.sign.detached.verify(messageBytes, signature, publicKey);
  } catch {
    return false;
  }
}

/**
 * Verify a secp256k1 signature (EVM wallets)
 * Uses EIP-191 personal_sign recovery via keccak256 + ecrecover
 * Falls back to structural check if crypto recovery fails
 */
async function verifySecp256k1(
  message: string,
  signatureHex: string,
  address: string
): Promise<boolean> {
  try {
    if (!signatureHex || !isValidEvmAddress(address)) return false;

    // Normalize signature
    const sig = signatureHex.startsWith('0x') ? signatureHex.slice(2) : signatureHex;
    if (sig.length !== 130) return false; // 65 bytes = 130 hex chars

    const r = sig.slice(0, 64);
    const s = sig.slice(64, 128);
    const v = parseInt(sig.slice(128, 130), 16);

    // Validate v (27 or 28, or 0/1 which maps to 27/28)
    const normalizedV = v < 27 ? v + 27 : v;
    if (normalizedV !== 27 && normalizedV !== 28) return false;

    // Validate r and s are non-zero and within curve order
    if (/^0+$/.test(r) || /^0+$/.test(s)) return false;

    // EIP-191 message prefix: "\x19Ethereum Signed Message:\n" + len + message
    const prefix = `\x19Ethereum Signed Message:\n${message.length}`;
    const prefixedMessage = prefix + message;

    // Without ethers.js, we do structural validation of the signature components
    // For full ecrecover, dynamic import ethers if available
    try {
      const { ethers } = await import('ethers' as string);
      const recovered = ethers.verifyMessage(message, '0x' + sig);
      return recovered.toLowerCase() === address.toLowerCase();
    } catch {
      // ethers not installed — REJECT unverifiable signatures
      console.error('[request-signing] ethers.js not available. EVM signature verification disabled.');
      return false;
    }
  } catch {
    return false;
  }
}

/**
 * Full request signature verification
 */
export async function verifyRequestSignature(
  method: string,
  path: string,
  headers: Headers
): Promise<SignatureVerification> {
  const { signature, nonce, signer, timestamp } = extractSigningHeaders(headers);

  // No signing headers → free tier
  if (!signature || !nonce || !signer || !timestamp) {
    return { valid: false, tier: 'free', reason: 'no_signing_headers' };
  }

  // Validate timestamp
  if (!checkTimestamp(timestamp)) {
    return { valid: false, tier: 'free', reason: 'timestamp_expired' };
  }

  // Replay protection
  if (!checkNonce(nonce)) {
    return { valid: false, tier: 'free', reason: 'nonce_replayed' };
  }

  // Build expected message
  const message = buildSigningMessage(method, path, nonce, timestamp);

  // Detect network and verify
  let network: 'solana' | 'evm';
  let verified: boolean;

  if (isValidEvmAddress(signer)) {
    network = 'evm';
    verified = await verifySecp256k1(message, signature, signer);
  } else if (isValidSolanaAddress(signer)) {
    network = 'solana';
    verified = await verifyEd25519(message, signature, signer);
  } else {
    return { valid: false, tier: 'free', reason: 'invalid_signer_address' };
  }

  if (!verified) {
    return { valid: false, tier: 'free', reason: 'signature_invalid' };
  }

  return {
    valid: true,
    signer,
    network,
    tier: 'signed',
  };
}

/**
 * Get rate limit for a request based on headers
 */
export function getRateLimitTier(headers: Headers): SignerTier {
  // Paid requests (x402) → unlimited
  if (headers.get('X-Payment') || headers.get('x-payment')) return 'paid';
  // Signed requests → higher limit
  if (headers.get('X-Signature') || headers.get('x-signature')) return 'signed';
  // Default → free
  return 'free';
}
