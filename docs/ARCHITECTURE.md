# BTCFi API — Architecture

## Overview

BTCFi API is a Next.js application deployed on Vercel that provides Bitcoin data and intelligence to AI agents via x402 micropayments.

```
Agent / Browser / Telegram Bot
        │
        ▼
  [Vercel Edge Middleware]
        │  CORS → Rate Limiting → x402 Payment Verification → Revenue Tracking
        │
        ▼
  [Route Handlers]
        │  Input validation → Business logic → Response formatting
        │
        ├── mempool.space API (Bitcoin data)
        ├── EVM RPCs (Solv Protocol, Ethereum, address data)
        ├── Solana RPC (SOL fees, address, staking verification)
        ├── CoinGecko (multi-currency pricing, 38 fiat currencies)
        └── Internal libraries (intelligence, threat, ZK proofs, portfolio)

┌──────────────────────────────────────────────────────────────┐
│  Telegram Bot (local webhook server)                         │
│  PM2 process manager · Cloudflare Tunnel · Port 3400        │
│  38 commands + inline mode → calls Vercel API (external)     │
│  MarkdownV2 escaping with replySafe plain-text fallback      │
└──────────────────────────────────────────────────────────────┘
```

## Endpoint Groups

| Group | Endpoints | Pricing | Description |
|-------|-----------|---------|-------------|
| Core Bitcoin | 10 | $0.01–$0.05 | Fees, mempool, address, UTXOs, tx history, tx details, broadcast, blocks |
| Intelligence | 20 | $0.02 | Fees prediction, whales, risk, network, consolidate, MVRV, SOPR, NUPL, HODL waves, cluster, graph, graph SVG, entity, portfolio, history, mempool-intel, mining, lightning, l2, signal |
| Security | 1 | $0.02 | YARA-pattern threat analysis (8 rules) |
| Solv Protocol | 4 | $0.02 | SolvBTC reserves, yield, liquidity, risk assessment |
| ZK Proofs | 4 | $0.01–$0.03 | Balance range, UTXO age, set membership, proof verification |
| Runes | 5 | $0.02 | Token list, trending, details, holders, transfers |
| Taproot Assets | 2 | $0.02 | Asset list and details by address |
| Lightning Network | 4 | $0.02 | Node info, channel details, routing fees, network intelligence |
| Ethereum | 3 | $0.01 | ETH gas, address balance, transaction details |
| Solana | 2 | $0.01 | SOL priority fees, address balance |
| Portfolio | 4 | $0.01–$0.02 | CRUD portfolios, analytics, address portfolio analysis |
| Alerts | 5 | Free | Rule management, evaluation, history |
| Real-Time Streams | 2 | $0.01 | SSE: blocks/fees/mempool + whale transactions |
| Price | 1 | Free | BTC price (CoinGecko: 38 fiat currencies) |
| Agent Integration | 3 | Free | MCP server info, /llms.txt discovery, agent skills |
| System | 3 | Free | Health check, staking status, API keys |
| Webhooks | 5 | Free | Push notifications with HMAC signatures (X-API-Key auth) |

**Total: 90+ public endpoints** (80+ paid + system + webhooks)

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
5. **Revenue Tracking** — Persistent payment + USD value counters (Upstash Redis)
6. **Cache Policy** — Per-endpoint caching strategy

## Payment Architecture

Dual-network x402 micropayments:

- **Base (EVM)** — Coinbase facilitator, fee-free ERC-3009 USDC transfers
- **Solana** — NLx402 by PCEF (nonprofit, nonce-locked verification)

Agents specify network via `X-Payment-Network` header. Default: Base.

PEAC Protocol provides cryptographic payment receipts — signed proofs binding payment to response, verifiable offline. Receipts use HMAC-SHA256 via Web Crypto API (Edge Runtime compatible).

## Security Layers

| Layer | Implementation |
|-------|---------------|
| Input Validation | Centralized validators for Bitcoin addresses, txids, block IDs, EVM/Solana addresses |
| Request Signing | Ed25519 (Solana) and secp256k1 (EVM) wallet signatures with nonce replay protection |
| Encrypted Responses | Curve25519 + XSalsa20-Poly1305 (NaCl box) with ephemeral keys |
| Threat Detection | 8 YARA-style pattern rules for transaction analysis |
| ZK Proofs | Groth16 zero-knowledge proofs for privacy-preserving verification |
| Error Sanitization | No internal paths, stack traces, or API keys in error responses |
| NPM Supply Chain | 7-day cooling period, npq-hero guard, lockfile validation |
| Web Crypto API | All cryptographic operations use Edge Runtime-compatible Web Crypto (no Node.js crypto) |

## Packages

| Package | npm | Description |
|---------|-----|-------------|
| `@aiindigo/btcfi` | SDK | TypeScript client with 30+ methods, auto x402 payment |
| `@aiindigo/btcfi-mcp` | MCP Server | 35+ tools for Claude, ChatGPT, Gemini via stdio transport |

## Human Interfaces

- **Web Dashboard** — `/dashboard` with overview, address lookup, whale watch, fee calculator, admin, analytics, revenue, API keys, watchlist
- **Telegram Bot** — 38 commands + inline mode. Local webhook server (PM2 + Cloudflare Tunnel). MarkdownV2 formatting with automatic plain-text fallback via `replySafe()`.
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
| CoinGecko | Multi-currency BTC pricing (38 fiat currencies) |

## Runtime & Infrastructure

| Component | Details |
|-----------|---------|
| Framework | Next.js 15.5.12 (App Router, Edge Middleware) |
| Hosting | Vercel (serverless) |
| Database | Upstash Redis (cloudflare build, Edge-compatible) |
| Bot | PM2 process + Cloudflare Tunnel (port 3400) |
| Crypto | Web Crypto API (no Node.js crypto module) |
| Node.js | v25.8.1 |

---

*Source: [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api)*
*All endpoints documented in [OpenAPI spec](https://btcfi.aiindigo.com/openapi.json).*
