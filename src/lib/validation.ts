/**
 * BTCFi Input Validation Library — MP1 Task 10.2
 * Centralized validation for all endpoints.
 * No endpoint accepts malformed input.
 */

// ============ BITCOIN ADDRESS ============

const BECH32_REGEX = /^(bc1)[a-zA-HJ-NP-Z0-9]{25,89}$/;
const P2PKH_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const P2SH_REGEX = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/;

export function isValidBitcoinAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  return BECH32_REGEX.test(address) || P2PKH_REGEX.test(address) || P2SH_REGEX.test(address);
}

export function getAddressType(address: string): string | null {
  if (!address) return null;
  if (address.startsWith('bc1p') && address.length === 62) return 'taproot (P2TR)';
  if (address.startsWith('bc1q') && address.length === 42) return 'segwit (P2WPKH)';
  if (address.startsWith('bc1q') && address.length === 62) return 'segwit (P2WSH)';
  if (address.startsWith('bc1')) return 'bech32';
  if (address.startsWith('3')) return 'P2SH';
  if (address.startsWith('1')) return 'P2PKH (legacy)';
  return null;
}

// ============ TRANSACTION ID ============

const TXID_REGEX = /^[a-fA-F0-9]{64}$/;

export function isValidTxid(txid: string): boolean {
  if (!txid || typeof txid !== 'string') return false;
  return TXID_REGEX.test(txid);
}

// ============ BLOCK IDENTIFIERS ============

export function isValidBlockHeight(id: string): boolean {
  const n = parseInt(id, 10);
  return !isNaN(n) && n >= 0 && n <= 10_000_000 && id === n.toString();
}

export function isValidBlockHash(id: string): boolean {
  return TXID_REGEX.test(id); // Same format as txid: 64 hex chars
}

export function parseBlockId(id: string): { type: 'height' | 'hash'; value: string } | null {
  if (isValidBlockHeight(id)) return { type: 'height', value: id };
  if (isValidBlockHash(id)) return { type: 'hash', value: id.toLowerCase() };
  return null;
}

// ============ RAW TRANSACTION HEX ============

const HEX_REGEX = /^[a-fA-F0-9]+$/;

export function isValidRawTxHex(hex: string): boolean {
  if (!hex || typeof hex !== 'string') return false;
  if (hex.length < 20) return false; // Way too short for any valid tx
  if (hex.length > 2_000_000) return false; // Unreasonably large
  return HEX_REGEX.test(hex);
}

// ============ QUERY PARAMETERS ============

export function sanitizeInt(
  value: string | null,
  defaultVal: number,
  min: number,
  max: number
): number {
  if (!value) return defaultVal;
  const n = parseInt(value, 10);
  if (isNaN(n)) return defaultVal;
  return Math.min(max, Math.max(min, n));
}

export function sanitizeFloat(
  value: string | null,
  defaultVal: number,
  min: number,
  max: number
): number {
  if (!value) return defaultVal;
  const n = parseFloat(value);
  if (isNaN(n)) return defaultVal;
  return Math.min(max, Math.max(min, n));
}

// ============ STRING SANITIZATION ============

export function sanitizeString(input: string, maxLength: number = 256): string {
  if (!input || typeof input !== 'string') return '';
  // Strip control characters, null bytes, and trim
  return input
    .replace(/[\x00-\x1f\x7f]/g, '')
    .replace(/[<>"'`;(){}]/g, '') // Strip common injection chars
    .trim()
    .slice(0, maxLength);
}

// ============ WALLET ADDRESSES (EVM + SOLANA) ============

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const SOLANA_ADDRESS_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export function isValidEvmAddress(address: string): boolean {
  return EVM_ADDRESS_REGEX.test(address);
}

export function isValidSolanaAddress(address: string): boolean {
  return SOLANA_ADDRESS_REGEX.test(address);
}

// ============ REQUEST BODY ============

const MAX_BODY_SIZE = 1_000_000; // 1MB

export function validateBodySize(body: string): boolean {
  return Buffer.byteLength(body, 'utf8') <= MAX_BODY_SIZE;
}

// ============ ERROR FACTORY ============

export interface ValidationError {
  success: false;
  error: string;
  code: string;
}

export function validationError(message: string, code: string): ValidationError {
  return { success: false, error: message, code };
}

export const ERRORS = {
  INVALID_ADDRESS: validationError('Invalid Bitcoin address format', 'INVALID_ADDRESS'),
  INVALID_TXID: validationError('Invalid transaction ID — must be 64 hex characters', 'INVALID_TXID'),
  INVALID_BLOCK_ID: validationError('Invalid block identifier — must be height (number) or hash (64 hex chars)', 'INVALID_BLOCK_ID'),
  INVALID_RAW_TX: validationError('Invalid raw transaction hex', 'INVALID_RAW_TX'),
  BODY_TOO_LARGE: validationError('Request body too large (max 1MB)', 'BODY_TOO_LARGE'),
  RATE_LIMITED: validationError('Rate limit exceeded', 'RATE_LIMITED'),
  NOT_FOUND: validationError('Resource not found', 'NOT_FOUND'),
  INTERNAL: validationError('Internal server error', 'INTERNAL_ERROR'),
} as const;
