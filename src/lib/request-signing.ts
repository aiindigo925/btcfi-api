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

// Rate limit tiers
export const RATE_LIMITS = {
  free: 100,      // per minute
  paid: Infinity, // x402 paid
  staked: Infinity, // staked agents
} as const;

export type SignerTier = keyof typeof RATE_LIMITS;

/**
 * Get rate limit tier for a request based on headers.
 * Returns 'paid' if X-Payment header is present, otherwise 'free'.
 * The 'signed' tier has been removed — unsigned requests without
 * X-Payment are always free tier.
 */
export function getRateLimitTier(headers: Headers): SignerTier {
  // Paid requests (x402) → unlimited
  if (headers.get('X-Payment') || headers.get('x-payment')) return 'paid';
  // Default → free
  return 'free';
}
