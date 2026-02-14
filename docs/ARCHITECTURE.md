# BTCFi API — Architecture

## Overview

BTCFi API is a Next.js application deployed on Vercel that provides Bitcoin data and intelligence to AI agents via x402 micropayments.

```
Agent / Browser / Bot
        │
        ▼
  [Vercel Edge Middleware]
        │  CORS → Rate Limiting → x402 Payment Verification
        │
        ▼
  [Route Handlers]
        │  Input validation → Business logic → Response formatting
        │
        ├── mempool.space API (Bitcoin data)
        ├── EVM RPCs (Solv Protocol on-chain reads)
        ├── Solana RPC (staking verification)
        └── Internal libraries (intelligence, threat, ZK proofs)
```

## Endpoint Groups

| Group | Endpoints | Pricing | Description |
|-------|-----------|---------|-------------|
| Core | 10 | $0.01–$0.05 | Fees, mempool, address, UTXOs, tx history, transactions, blocks, broadcast |
| Intelligence | 5 | $0.02 | Fee prediction, whale detection, risk scoring, network health, UTXO consolidation |
| Security | 1 | $0.02 | YARA-pattern threat analysis (8 rules) |
| Solv Protocol | 4 | $0.02 | SolvBTC reserves, yield, liquidity, risk assessment |
| ZK Proofs | 4 | $0.01–$0.03 | Balance range, UTXO age, set membership, proof verification |
| Streams | 2 | $0.01 | Server-Sent Events for blocks, whale transactions |
| System | 2 | Free | Health check, staking status |
| Ethereum | 3 | $0.01 | ETH gas, address balance, transaction details |
| Solana | 2 | $0.01 | SOL priority fees, address balance |

**Total: 33 public endpoints** (31 paid + 2 free)

## Middleware Pipeline

Every request passes through a unified middleware chain:

1. **CORS** — Cross-origin access for agents and browsers
2. **Security Headers** — CSP, HSTS, X-Frame-Options, nosniff
3. **Rate Limiting** — Tiered by authentication method:
   - Free: 100 req/min
   - Wallet-signed: 500 req/min
   - Paid (x402): Unlimited
   - Staked: Unlimited
4. **x402 Payment** — Verifies micropayment for paid endpoints
5. **Cache Policy** — Per-endpoint caching strategy

## Payment Architecture

Dual-network x402 micropayments:

- **Base (EVM)** — Coinbase facilitator, fee-free ERC-3009 USDC transfers
- **Solana** — NLx402 by PCEF (nonprofit, nonce-locked verification)

Agents specify network via `X-Payment-Network` header. Default: Base.

PEAC Protocol provides cryptographic payment receipts — signed proofs binding payment to response, verifiable offline.

## Security Layers

| Layer | Implementation |
|-------|---------------|
| Input Validation | Centralized validators for Bitcoin addresses, txids, block IDs, EVM/Solana addresses |
| Request Signing | Ed25519 (Solana) and secp256k1 (EVM) wallet signatures with nonce replay protection |
| Encrypted Responses | Curve25519 + XSalsa20-Poly1305 (NaCl box) with ephemeral keys |
| Threat Detection | 8 YARA-style pattern rules for transaction analysis |
| ZK Proofs | Groth16 zero-knowledge proofs for privacy-preserving verification |
| Error Sanitization | No internal paths, stack traces, or API keys in error responses |

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@aiindigo/btcfi` | SDK | TypeScript client with 28 methods, auto x402 payment |
| `@aiindigo/btcfi-mcp` | MCP Server | 27 tools for Claude, ChatGPT, Gemini via stdio transport |

## Human Interfaces

- **Web Dashboard** — `/dashboard` with overview, address lookup, whale watch, fee calculator
- **Telegram Bot** — 9 commands + inline mode
- **Chrome Extension** — Price badge, fee calculator, whale alerts, address inspector
- **Swagger UI** — Interactive API docs at `/api/docs`

## Data Sources

| Source | Usage |
|--------|-------|
| mempool.space | Bitcoin blockchain data (primary) |
| Blockstream API | Bitcoin data (fallback) |
| Solv Protocol contracts | SolvBTC reserves, xSolvBTC yield, liquidity |
| Chainlink PoR | Solv reserve verification |
| DeFiLlama | TVL and yield data |

---

*Source: [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api)*
*All endpoints documented in [OpenAPI spec](https://btcfi.aiindigo.com/openapi.json).*
