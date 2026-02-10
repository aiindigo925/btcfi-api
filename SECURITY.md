# Security Policy — BTCFi API

## Responsible Disclosure

If you discover a security vulnerability, please report it responsibly.

**Contact:** security@aiindigo.com
**PGP:** Available on request
**Response time:** We aim to acknowledge within 48 hours.

Please do NOT file public GitHub issues for security vulnerabilities.

---

## Security Features

### x402 Dual-Facilitator Payments
- **Base network:** Coinbase x402 facilitator at x402.org — fee-free ERC-3009
- **Solana network:** NLx402 by PCEF (501c3 nonprofit) — nonce-locked, hash-bound, zero fees
- Payment IS authentication — no API keys to leak

### Wallet-Based Authentication
- Agents sign requests with their wallet (Ed25519 for Solana, secp256k1 for EVM)
- Nonce-based replay protection (5-minute window, one-time use)
- Timestamp drift tolerance: 60 seconds max
- No API keys. No secrets. Just cryptographic proof.

### Encrypted Responses
- Agents can request encrypted responses via `X-Encrypt-Response` header
- Algorithm: Curve25519 key exchange + XSalsa20-Poly1305 (NaCl box)
- Ephemeral keypairs for each response (perfect forward secrecy)
- Only the requesting agent can decrypt the response

### Threat Detection (PCEF-Inspired)
- YARA-style pattern matching on Bitcoin transactions
- Detects: tumbling, dust attacks, CoinJoin, peel chains, wash trading, consolidation
- Powered by patterns inspired by PCEF's Traceix and YARA rule engines

### Rate Limiting
- Free tier: 100 req/min per IP+UA
- Signed tier: 500 req/min (wallet-verified requests)
- Paid tier: Unlimited (x402 micropayment)
- Staked tier: Unlimited + priority routing
- Progressive backoff for repeat violators

### ZK Proof Security
- Simulated Groth16 proofs (production: compiled circom circuits)
- Balance proofs: salted commitment hides exact balance, only threshold comparison revealed
- Age proofs: UTXO Merkle root proves set without revealing individual UTXOs
- Membership proofs: nullifier prevents proof reuse, Merkle path proves inclusion
- Verification endpoint allows Agent B to verify Agent A's proof without regeneration
- All proofs use `crypto.randomUUID()` salts — no two proofs for the same input are identical
- Cache policy: `no-store` — proofs are never cached at edge or middleware

### Real-Time Stream Security
- SSE streams include inline CORS headers (middleware can't inject on custom Response objects)
- `Access-Control-Allow-Origin: *` for cross-origin agent access
- `X-Content-Type-Options: nosniff` to prevent MIME sniffing
- Cache policy: `no-store` — streams are never cached
- Max connection duration: 5 minutes (prevents resource exhaustion)
- Heartbeat every 30 seconds (keeps connection alive, detects stale clients)
- Whale stream deduplicates via txid Set (prevents duplicate alerts)

### Security Headers
All API responses include:
- `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

---

## Threat Model

### What BTCFi Protects Against
- **API key leakage:** No keys to leak. Payment = auth. Wallet signatures = identity.
- **Replay attacks:** Nonce-based protection with 5-minute TTL
- **Response interception:** Optional Curve25519 encrypted responses
- **Rate limit evasion:** IP+UA combined keys, progressive backoff
- **Malicious address interaction:** YARA-pattern threat analysis warns agents
- **Facilitator tampering:** NLx402 uses hash-bound, nonce-locked proofs

### What BTCFi Does NOT Protect Against
- Compromised agent wallets (agent's responsibility)
- Mempool.space API downtime (upstream dependency)
- On-chain transaction privacy (use ZK proof endpoints for privacy-preserving verification)

---

## Data Handling

**BTCFi stores zero user data.**

- All Bitcoin data is proxied from mempool.space in real-time
- No queries are logged or stored
- No personal information is collected
- Rate limit counters use Vercel KV (persistent) with in-memory fallback
- Nonce store is in-memory (5-minute TTL, reset on cold start)
- Revenue counters use Vercel KV (persistent) with in-memory fallback

---

## Third-Party Dependencies

| Dependency | Purpose | Trust Level |
|-----------|---------|-------------|
| mempool.space | Bitcoin data source | High — open source, widely used |
| NLx402 (thrt.ai) | Solana x402 facilitator | High — PCEF 501(c)(3) nonprofit |
| tweetnacl | Encryption (NaCl) | High — audited, pure JS, widely used |
| Web Crypto API | ZK proof hashing (SHA-256) | High — browser/Node built-in |
| Next.js | Web framework | High — Vercel maintained |

---

## Encryption Standards

| Feature | Algorithm | Library |
|---------|-----------|---------|
| Response encryption | Curve25519 + XSalsa20-Poly1305 | tweetnacl |
| Solana signatures | Ed25519 | tweetnacl |
| EVM signatures | secp256k1 + keccak256 | ethers.js (dynamic import, rejects if unavailable) |
| ZK proofs (live) | Simulated Groth16 zk-SNARKs | Web Crypto SHA-256 (circom circuits planned) |

---

## Credits

- **PCEF (Perkins Cybersecurity Educational Fund):** NLx402 facilitator, Traceix patterns, YARA inspiration
- **zkRune:** ZK circuit templates (Circom/Groth16)
- **Clawd Bot:** Vesting/staking patterns, Fomo3D game theory
- **Utopian Contributors:** P2P encryption architecture patterns

---

Built by AI Indigo. Open source security. No rugs. Just ships.
