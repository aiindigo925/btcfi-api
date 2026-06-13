---
title: "Building a Bitcoin Intelligence API: Architecture Decisions Behind 45 Endpoints"
description: "How we built btcfi.aiindigo.com — a 45-endpoint Bitcoin intelligence platform for AI agents, powered by x402 micropayments, zero-knowledge proofs, and MCP."
date: 2026-06-14
author: "AI Indigo"
tags: ["bitcoin", "api", "architecture", "x402", "micropayments", "mcp", "ai-agents", "zeroknowledge"]
canonical: "https://btcfi.aiindigo.com/blog/building-bitcoin-intelligence-api"
---

# Building a Bitcoin Intelligence API: Architecture Decisions Behind 45 Endpoints

*How we went from "I need Bitcoin data for an AI agent" to a 45-endpoint platform with micropayments, ZK proofs, and a Model Context Protocol server — in open source.*

---

## The Starting Point

Every Bitcoin builder has the same realization eventually: the data you need is scattered across a dozen APIs, each with its own auth model, rate limits, and pricing. Mempool.space for fees. Blockstream for addresses. On-chain analytics require paid dashboards. Lightning data is its own rabbit hole.

I wanted one API that an AI agent could call — pay a few cents per query — and get everything: mempool stats, whale alerts, risk scoring, UTXO consolidation advice, zero-knowledge proofs. No API keys. No subscriptions. Just HTTP + micropayments.

That's [btcfi.aiindigo.com](https://btcfi.aiindigo.com). Here's how we built it.

## Architecture Overview

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
        ├── Blockstream API (fallback)
        ├── EVM RPCs (Solv Protocol on-chain reads)
        ├── Solana RPC (staking verification)
        ├── DeFiLlama (TVL data)
        └── Internal libraries (intelligence, threat, ZK proofs)
```

It's a Next.js application deployed on Vercel. Every request hits Edge Middleware first, then routes to handler functions that pull data from upstream sources and apply intelligence layers on top.

Simple stack. Powerful when composed.

## The Middleware Pipeline

The most important architectural decision was moving all cross-cutting concerns into middleware. Every request passes through this chain:

1. **CORS** — Agents, browsers, and bots need cross-origin access
2. **Security Headers** — CSP, HSTS, X-Frame-Options, nosniff
3. **Rate Limiting** — Tiered by authentication:
   - Free: 100 req/min
   - Wallet-signed: 500 req/min
   - Paid (x402): Unlimited
4. **x402 Payment** — Verifies USDC micropayment for paid endpoints
5. **Cache Policy** — Per-endpoint caching strategy

This means individual route handlers are clean — they only deal with business logic. No auth boilerplate in every endpoint.

## Data Sources: The Aggregation Layer

Bitcoin data comes from multiple providers. Here's what we settled on:

### Primary: mempool.space

[mempool.space](https://mempool.space/api) is the backbone. It provides fee estimates, mempool snapshots, address data, transaction details, and block information. It's open, well-documented, and fast.

```typescript
// src/lib/bitcoin.ts
const MEMPOOL_API = 'https://mempool.space/api';

export async function getRecommendedFees(): Promise<RecommendedFees> {
  const data = await fetch(`${MEMPOOL_API}/v1/fees/recommended`);
  return data.json();
}
```

The API is clean enough that a thin wrapper gives us typed interfaces for everything: `MempoolSummary`, `RecommendedFees`, `AddressInfo`, `UTXO`, `Transaction`, `Block`.

### Fallback: Blockstream

When mempool.space is slow or rate-limited, we fall back to Blockstream's API. Same data, different provider. The middleware handles retries transparently.

### On-Chain: EVM RPCs + Solana

For Solv Protocol data (SolvBTC reserves, xSolvBTC yield), we read directly from smart contracts via EVM RPCs. Solana data comes from public RPCs for staking verification.

### Supplementary: Chainlink PoR + DeFiLlama

Proof of Reserve data from Chainlink for Solv. TVL and yield comparisons from DeFiLlama.

The key insight: **don't depend on a single data source**. Build abstraction layers so you can swap providers without touching route handlers.

## Pricing Architecture: x402 Micropayments

This is where it gets interesting. BTCFi API uses [x402](https://x402.org) — HTTP status code 402 (Payment Required) as an actual protocol, not just a legacy code.

### The Pricing Tiers

```typescript
// src/lib/x402.ts
export const ROUTE_PRICING: Record<string, number> = {
  // Core queries: $0.01
  '/api/v1/fees': 0.01,
  '/api/v1/mempool': 0.01,
  '/api/v1/address': 0.01,
  '/api/v1/tx': 0.01,
  '/api/v1/block': 0.01,

  // Intelligence: $0.02
  '/api/v1/intelligence': 0.02,
  '/api/v1/intelligence/mvrv': 0.02,
  '/api/v1/intelligence/sopr': 0.02,

  // ZK Proofs: $0.03
  '/api/v1/zk/balance-proof': 0.03,

  // Transaction broadcast: $0.05
  '/api/v1/tx/broadcast': 0.05,

  // Free
  '/api/health': 0,
  '/api/v1': 0,
};
```

### Dual-Network Payment

Agents can pay on either network:

- **Base (EVM L2)** — Coinbase facilitator, zero gas fees, ERC-3009 USDC transfers
- **Solana** — NLx402 by PCEF (a nonprofit), zero fees

Agents specify their preferred network via `X-Payment-Network` header. Default is Base.

### Why x402?

Traditional API auth (API keys, OAuth, JWT) is designed for humans managing dashboards. AI agents don't have dashboards. They need to:

1. Discover an endpoint
2. Know the price
3. Pay
4. Get the data

x402 does this in a single HTTP round-trip. The agent sends a payment proof in the `X-Payment` header, the server verifies it with the facilitator, and returns the data. No signup. No key management. No subscription tiers.

The facilitator (Coinbase on Base, PCEF on Solana) handles USDC transfers with zero gas fees. The agent pays $0.01 in USDC, the facilitator routes it, done.

## Agent Discovery: llms.txt and MCP

How do AI agents even find the API? Two mechanisms:

### llms.txt

At `https://btcfi.aiindigo.com/llms.txt`, we publish a structured discovery file — the machine-readable equivalent of a landing page. It lists every endpoint, pricing tier, authentication method, and integration option.

```
## Core Bitcoin Endpoints ($0.01)
- GET /api/v1/fees — Fee estimates (fastest, 30min, 1hr, economy) with USD values
- GET /api/v1/mempool — Mempool summary, tx count, size, fee histogram
- GET /api/v1/address/{addr} — Address balance, tx count, funded/spent stats
...
```

Any agent that reads llms.txt can construct requests to any endpoint. No documentation portal required.

### MCP Server

The [Model Context Protocol](https://modelcontextprotocol.io) server provides structured tool access for Claude, ChatGPT, Gemini, and any MCP-compatible agent.

We ship two versions:

1. **Hosted HTTP MCP** — `POST https://btcfi.aiindigo.com/api/mcp` (Streamable HTTP transport, zero-install)
2. **NPM package** — `npx @aiindigo/btcfi-mcp` (stdio transport, for local agent processes)

Both expose 27 tools:

```typescript
// src/lib/mcp-tools.ts
export const TOOLS: ToolDef[] = [
  {
    name: 'btcfi_get_fees',
    description: 'Get current Bitcoin fee rates with USD estimates.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/fees',
    method: 'GET',
  },
  {
    name: 'btcfi_whale_alert',
    description: 'Detect large Bitcoin transactions and whale movements.',
    endpoint: '/api/v1/intelligence/whales',
    method: 'GET',
  },
  // ... 25 more tools
];
```

The hosted MCP at `/api/mcp` implements JSON-RPC 2.0 over HTTP, with full MCP lifecycle handling (`initialize`, `tools/list`, `tools/call`). No WebSocket needed.

**Client config is trivial:**
```json
{
  "mcpServers": {
    "btcfi": {
      "url": "https://btcfi.aiindigo.com/api/mcp",
      "transport": "streamable-http"
    }
  }
}
```

## Intelligence Layer: Where Raw Data Becomes Insight

The endpoints that differentiate BTCFi from a raw data proxy are the intelligence endpoints. These take raw mempool and blockchain data and add analysis layers:

### Whale Detection

Scans recent transactions for movements above a configurable BTC threshold:

```typescript
// src/app/api/v1/intelligence/whales/route.ts
const minBtc = sanitizeFloat(searchParams.get('min'), 10, 1, 10000);
const whales = await getWhaleTransactions(minBtc);
```

### UTXO Consolidation Advisor

Analyzes an address's UTXO set and recommends consolidation timing based on current fee rates:

```typescript
// src/lib/intelligence.ts
const estimatedVsize = OVERHEAD + (utxoCount * INPUT_VSIZE) + OUTPUT_VSIZE;

// Compare consolidation cost against future spending cost
const netSavings = currentSpendCostSats - afterConsolidationSats - consolidationFeeSats;
```

It tells you: "You have 47 UTXOs. At current economy fees (4 sat/vB), consolidating saves you 12,400 sats ($8.20) on future transactions."

### On-Chain Metrics

MVRV ratio, SOPR, NUPL, HODL waves — the metrics that on-chain analysts use to gauge market sentiment. Computed from UTXO age distributions and transaction history.

### Threat Analysis

Eight YARA-style pattern rules scan transaction histories for known threat indicators:

```typescript
// src/app/api/v1/security/threat/[addr]/route.ts
const report = await analyzeThreat(addr);
```

Inspired by PCEF's pattern matching approach (Traceix + YARA), this gives agents a risk score without requiring them to build their own analysis pipeline.

### Fee Prediction

AI-powered fee forecasting for 1h, 6h, and 24h windows. Agents use this to decide *when* to broadcast transactions.

## Zero-Knowledge Proofs: Privacy-Preserving Verification

The ZK endpoints are experimental but functional. Three proof types:

1. **Balance Range** — Prove an address has ≥ X BTC without revealing exact balance
2. **UTXO Age** — Prove UTXOs are ≥ N blocks old without revealing which UTXOs
3. **Set Membership** — Prove an address belongs to a set without revealing the address

```typescript
// POST /api/v1/zk/balance-proof
{
  "address": "bc1q...",
  "threshold": 100000000,  // 1 BTC in sats
  "unit": "sats"
}

// Response
{
  "proofType": "balance_range",
  "proof": { "pi_a": [...], "pi_b": [...], "pi_c": [...] },
  "publicInputs": ["threshold_hash", "range_commitment"],
  "verified": true,
  "proofTimeMs": 42
}
```

Currently using simulated Groth16 proofs (deterministic field hashes for verification). The architecture is ready for compiled circom circuits when production-grade proving is needed.

Why ZK for an API? Because agent-to-agent trust is the next frontier. Agent A wants to prove to Agent B that it meets a financial threshold — without revealing its portfolio. ZK proofs make that possible.

## Security Architecture

Six security layers, applied in depth:

| Layer | Implementation |
|-------|---------------|
| Input Validation | Centralized validators for Bitcoin addresses, txids, block IDs, EVM/Solana addresses |
| Request Signing | Ed25519 (Solana) and secp256k1 (EVM) with nonce replay protection |
| Encrypted Responses | Curve25519 + XSalsa20-Poly1305 (NaCl box) with ephemeral keys |
| Threat Detection | 8 YARA-style pattern rules |
| ZK Proofs | Groth16 for privacy-preserving verification |
| Error Sanitization | No internal paths, stack traces, or API keys in error responses |

The validation library is centralized — every address, transaction ID, and block identifier goes through the same validators:

```typescript
// src/lib/validation.ts
const BECH32_REGEX = /^(bc1)[a-zA-HJ-NP-Z0-9]{25,89}$/;
const P2PKH_REGEX = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
const P2SH_REGEX = /^3[a-km-zA-HJ-NP-Z1-9]{25,34}$/;

export function isValidBitcoinAddress(address: string): boolean {
  return BECH32_REGEX.test(address) || P2PKH_REGEX.test(address) || P2SH_REGEX.test(address);
}
```

No endpoint accepts malformed input. Period.

## PEAC Protocol: Cryptographic Receipts

Every paid response includes a `PEAC-Receipt` header — a signed, verifiable proof that payment was made and the response hasn't been tampered with:

```json
{
  "v": "0.9.15",
  "ts": "2026-06-14T12:00:00Z",
  "res": "/api/v1/intelligence/whales",
  "amt": "0.02",
  "cur": "USDC",
  "rail": "base",
  "rh": "a1b2c3d4e5f6..."
}
```

Agents can verify receipts offline without calling BTCFi again. This enables trustless caching and audit trails.

## Deployment: Why Vercel

Next.js on Vercel gives us:

- **Edge Middleware** — Payment verification runs at the edge, before hitting the origin
- **Serverless Functions** — Each route handler scales independently
- **Zero DevOps** — No servers to manage, patch, or monitor
- **Preview Deployments** — Every PR gets a live URL

For an API that serves AI agents 24/7, the serverless model works well. The trade-off is cold starts, which we mitigate with cache headers on hot endpoints.

## Distribution: npm Packages + MCP Registry

We publish two packages:

| Package | Description |
|---------|-------------|
| `@aiindigo/btcfi` | TypeScript SDK — 28 methods with auto x402 payment |
| `@aiindigo/btcfi-mcp` | MCP Server — 27 tools for Claude, ChatGPT, Gemini |

Both are on npm. The MCP server is also registered on the [MCP Registry](https://registry.modelcontextprotocol.io) and indexed on [Glama](https://glama.ai/mcp/servers).

## What I'd Do Differently

1. **Start with the MCP server.** We built the REST API first and bolted MCP on later. If I were starting over, I'd design the MCP tools first and derive the REST endpoints from them.

2. **Cache more aggressively.** Mempool data changes constantly, but address balances don't change every request. We could cache address queries for 30 seconds without stale data.

3. **Add WebSocket support earlier.** SSE streams work, but WebSocket would give agents bidirectional real-time data without polling.

4. **Circuit breakers for upstream providers.** When mempool.space is slow, we should fail fast and fall back to Blockstream. Right now we retry, which adds latency.

## What's Next

- **Compiled ZK circuits** — Move from simulated proofs to production Groth16 with circom
- **Lightning Network data** — Channel capacity, routing fees, node health
- **Ordinals/BRC-20** — Inscription data and token balances
- **More on-chain metrics** — Stock-to-flow, NVT ratio, MVRV Z-Score

## Try It

```bash
# Free — no auth needed
curl https://btcfi.aiindigo.com/api/v1/fees

# MCP — connect any agent
npx @aiindigo/btcfi-mcp

# SDK
npm install @aiindigo/btcfi
```

```typescript
import { BTCFi } from "@aiindigo/btcfi";
const btcfi = new BTCFi({ network: "base" });
const fees = await btcfi.fees();
const risk = await btcfi.intelligence.risk("bc1q...");
```

---

**GitHub:** [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api) · **License:** MIT · **Live:** [btcfi.aiindigo.com](https://btcfi.aiindigo.com)

*No token. No API keys. Just Bitcoin data.*
