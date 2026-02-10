/**
 * BTCFi Encryption Library — MP1 Task 8.4
 * Inspired by Utopian Contributors P2P encryption:
 *   256-bit AES equivalent via NaCl box (Curve25519 + XSalsa20-Poly1305)
 *
 * Agents send X-Encrypt-Response header with their Curve25519 public key.
 * Server encrypts response so only that agent can read it.
 *
 * Uses tweetnacl — pure JS, no native deps, audited crypto.
 * npm install tweetnacl tweetnacl-util
 */

// NOTE: tweetnacl must be installed: npm install tweetnacl tweetnacl-util

/**
 * Encrypt a JSON response for a specific agent's public key.
 *
 * @param data - The JSON-serializable response data
 * @param recipientPublicKeyBase64 - Agent's Curve25519 public key (base64)
 * @returns Encrypted payload as base64 string with nonce prepended, or null on error
 */
export async function encryptResponse(
  data: unknown,
  recipientPublicKeyBase64: string
): Promise<{ encrypted: string; nonce: string; ephemeralPublicKey: string } | null> {
  try {
    // Dynamic import — only loaded when encryption is requested
    const nacl = await import('tweetnacl');
    const { decodeBase64, encodeBase64, decodeUTF8 } = await import('tweetnacl-util');

    const recipientPublicKey = decodeBase64(recipientPublicKeyBase64);
    if (recipientPublicKey.length !== 32) return null;

    // Generate ephemeral keypair for this response (perfect forward secrecy)
    const ephemeral = nacl.default.box.keyPair();
    const nonce = nacl.default.randomBytes(24);
    const message = decodeUTF8(JSON.stringify(data));

    // NaCl box: Curve25519 key exchange + XSalsa20-Poly1305 authenticated encryption
    const encrypted = nacl.default.box(message, nonce, recipientPublicKey, ephemeral.secretKey);
    if (!encrypted) return null;

    return {
      encrypted: encodeBase64(encrypted),
      nonce: encodeBase64(nonce),
      ephemeralPublicKey: encodeBase64(ephemeral.publicKey),
    };
  } catch (error) {
    console.error('[encryption] Failed to encrypt response:', error);
    return null;
  }
}

/**
 * Check if a request wants an encrypted response.
 * Returns the public key if present, null otherwise.
 */
export function getEncryptionKey(headers: Headers): string | null {
  const key = headers.get('X-Encrypt-Response') || headers.get('x-encrypt-response');
  if (!key) return null;
  // Basic validation: base64, ~44 chars for 32 bytes
  if (key.length < 40 || key.length > 50) return null;
  try {
    const decoded = Buffer.from(key, 'base64');
    if (decoded.length !== 32) return null;
    return key;
  } catch {
    return null;
  }
}

/**
 * Build an encrypted response if the agent requested one.
 * Otherwise returns null and the route should return plaintext.
 */
export async function maybeEncryptResponse(
  headers: Headers,
  data: unknown
): Promise<{
  body: Record<string, unknown>;
  contentType: string;
} | null> {
  const publicKey = getEncryptionKey(headers);
  if (!publicKey) return null;

  const result = await encryptResponse(data, publicKey);
  if (!result) return null;

  return {
    body: {
      encrypted: true,
      algorithm: 'x25519-xsalsa20-poly1305',
      ...result,
      decryptionGuide: {
        step1: 'Decode encrypted, nonce, and ephemeralPublicKey from base64',
        step2: 'Use nacl.box.open(encrypted, nonce, ephemeralPublicKey, yourSecretKey)',
        step3: 'Parse the decrypted bytes as UTF-8 JSON',
      },
    },
    contentType: 'application/x-encrypted+json',
  };
}
