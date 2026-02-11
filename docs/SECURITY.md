# BTCFi API — Security

## Reporting Vulnerabilities

**Contact:** security@aiindigo.com

We take security seriously. If you discover a vulnerability, please report it via email. We aim to respond within 48 hours and will coordinate disclosure timelines with you.

## Security Model

BTCFi API is a **read-only data proxy** — it does not hold user funds, store private keys, or manage wallets. All Bitcoin data is fetched from public APIs and on-chain sources.

### What We Protect Against

- **Unauthorized access** — Rate limiting, wallet-based authentication, x402 payment gating
- **Replay attacks** — Nonce-based protection with timestamp drift checks
- **Data interception** — Optional encrypted responses using NaCl box (Curve25519 + XSalsa20-Poly1305)
- **Malicious input** — Centralized input validation for all address formats, transaction IDs, and query parameters
- **Information leakage** — Sanitized error responses, no internal paths or stack traces exposed

### What We Don't Store

- No user data or PII
- No private keys or wallet credentials
- No API keys (authentication is wallet-based or x402 payment)
- No query logs (stateless request processing)

## Authentication Methods

| Method | Rate Limit | How It Works |
|--------|-----------|--------------|
| Anonymous | 100 req/min | No headers required |
| Wallet-signed | 500 req/min | Sign request with Ed25519 (Solana) or secp256k1 (EVM) wallet |
| x402 Payment | Unlimited | Pay per query via USDC micropayment |
| Staked | Unlimited | Hold USDC in escrow contract |

## Security Features

### Input Validation
All endpoints validate inputs before processing:
- Bitcoin addresses: P2PKH, P2SH, Bech32, Bech32m, Taproot
- Transaction IDs: 64-character hex
- Block identifiers: numeric height or 64-character hex hash
- EVM addresses: 0x-prefixed, 42 characters with checksum
- Solana addresses: Base58, 32–44 characters
- Request body size limit enforced

### Rate Limiting
Tiered rate limiting with progressive backoff:
- Per-IP tracking with configurable windows
- Signed requests receive elevated limits
- Paid and staked requests bypass limits
- Rate limit headers exposed via CORS for client awareness

### Encrypted Responses
Agents can request encrypted responses via `X-Encrypt-Response` header:
- Agent provides their Curve25519 public key
- Server encrypts response with NaCl box (XSalsa20-Poly1305)
- Ephemeral server keys provide perfect forward secrecy
- Only the requesting agent can decrypt

### Request Signing & Replay Protection
- Wallet signature verification (Ed25519 for Solana, secp256k1 for EVM)
- Nonce-based replay protection with TTL
- Timestamp drift window prevents clock-skew attacks
- All four signing headers required for elevated access

### Threat Detection
8 YARA-style pattern rules analyze Bitcoin transaction behavior:
- Mixing/tumbling detection
- Dust attack identification
- Wash trading patterns
- Rapid consolidation alerts
- Fresh address large output detection

### Zero-Knowledge Proofs
Privacy-preserving verification using Groth16 ZK-SNARKs:
- Balance range proofs (prove balance > threshold without revealing amount)
- UTXO age proofs (prove holder status without revealing which UTXOs)
- Set membership proofs (prove inclusion in a group without revealing identity)
- Independent verification endpoint

### PEAC Protocol
Cryptographic payment receipts:
- Signed proof binding payment to response
- Verifiable offline without calling BTCFi
- Machine-readable terms at `/.well-known/peac.txt`

## Dependencies

All cryptographic operations use audited, well-maintained libraries:
- `tweetnacl` — NaCl box encryption, Ed25519 signatures
- `ethers` — EVM signature recovery (secp256k1)
- `snarkjs` — Groth16 ZK proof generation and verification

## Security Headers

All responses include:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (strict)
- `Strict-Transport-Security` (HSTS)

## Audits

The codebase has undergone 3 comprehensive security audits across MP0–MP4, covering all 31 endpoints, middleware, payment verification, rate limiting, and cryptographic operations. All identified issues have been resolved.

---

*Source: [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api)*
*Questions? Contact security@aiindigo.com*
