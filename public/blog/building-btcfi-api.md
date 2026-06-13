---
title: "Building a Bitcoin Intelligence API: Architecture, Data, and the Agent-Native Future"
description: "A technical deep-dive into building 45 Bitcoin intelligence endpoints with x402 micropayments, multi-chain support, ZK proofs, and MCP integration."
date: "2026-06-14"
tags: ["bitcoin", "api", "architecture", "ai-agents", "mcp", "zka", "open-source", "building-in-public"]
---

# Building a Bitcoin Intelligence API: Architecture, Data, and the Agent-Native Future

**TL;DR:** BTCFi API is an open-source Bitcoin intelligence platform with 45 endpoints, x402 micropayments, ZK proofs, and MCP integration. This post covers the architecture decisions, data pipeline design, and why "agent-native" isn't just a buzzword.

---

## Why Build Another Bitcoin API?

The Bitcoin data landscape has good options: Blockstream, Mempool.space, Glassnode, CoinGecko. So why build another one?

Three reasons:

1. **Pricing is broken.** Glassnode charges $49–$799/month. Blockstream charges per-call but with API key management overhead. Neither offers per-query micropayments at the $0.01–$0.05 level.

2. **AI agents are underserved.** Every existing API was designed for humans using dashboards or developers writing code with API keys. None were designed for autonomous agents that need to discover, pay for, and consume data programmatically.

3. **Intelligence is scattered.** Whale tracking is on one platform. Fee prediction is on another. Risk scoring requires enterprise plans. ZK proofs don't exist as a service. BTCFi consolidates 45 endpoints into a single API.

BTCFi API launched as an MIT-licensed open-source project. Every endpoint, every integration pattern, every security decision is auditable. Here's how we built it.

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                  Clients                         │
│  SDK │ MCP Server │ HTTP │ AI Agents │ Telegram  │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│              Next.js API Layer                   │
│  Route handlers │ Middleware │ Error handling    │
│  x402 validation │ Rate limiting │ Signing       │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│            Intelligence Layer                    │
│  Fee prediction │ Whale detection │ Risk scoring │
│  Network health │ YARA patterns │ MVRV/SOPR/NUPL │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│            Data Layer                            │
│  Bitcoin RPC │ Ethereum RPC │ Solana RPC         │
│  Redis cache │ Upstash │ Block explorers         │
└──────────────┬──────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────┐
│          Security Layer                          │
│  ZK proofs (Groth16) │ Encrypted responses       │
│  Wallet signing │ Nonce replay protection        │
└─────────────────────────────────────────────────┘
```

### Why Next.js?

Next.js API routes give us:
- **Serverless deployment** on Vercel (zero ops for 45 endpoints)
- **Edge middleware** for rate limiting and security headers
- **Built-in CORS handling**
- **Hot reload** during development
- **Automatic TypeScript validation** of request/response schemas

Some might say Next.js is a frontend framework. For an API, it's actually ideal: lightweight route handlers, no framework overhead, and free hosting.

### Multi-Chain RPC

BTCFi queries four blockchain networks:

| Network | RPC Sources | Fallback Strategy |
|---------|------------|-------------------|
| Bitcoin | Blockstream, Mempool.space, self-hosted | Auto-failover on timeout |
| Ethereum | Public RPCs + Alchemy | Round-robin with health checks |
| Solana | Helius, QuickNode, public | Priority-based with circuit breakers |
| Base | Coinbase, public | Primary + fallback |

The multi-RPC design means no single point of failure. If one provider goes down, requests automatically route to the next.

## The 45 Endpoints

### Core Bitcoin ($0.01/query)

Ten endpoints covering the basics that every Bitcoin application needs:

- **Fee estimates** — fastest, 30min, 1hr, economy with USD values
- **Mempool** — transaction count, size, fee histogram, congestion level
- **Address data** — balance, transaction count, UTXOs, history
- **Transaction details** — full tx data, confirmation status
- **Block data** — latest blocks, specific block by height/hash
- **Transaction broadcast** — submit signed transactions ($0.05, the only premium write)

### Intelligence ($0.02/query)

Eight endpoints that transform raw data into actionable intelligence:

- **Fee prediction** — AI-powered 1h, 6h, 24h fee forecasts with timing recommendations
- **Whale detection** — large transactions in the mempool before confirmation
- **Address risk scoring** — pattern analysis, known entity matching, risk tiers
- **Network health** — hashrate, difficulty, congestion metrics
- **UTXO consolidation** — fee optimization advice for addresses with many UTXOs
- **On-chain metrics** — MVRV, SOPR, NUPL, HODL waves

These metrics used to require a Glassnode subscription. Now they're $0.02 per query.

### Security ($0.02/query)

One endpoint with serious capability:

- **Threat analysis** — 8 YARA-style pattern rules scan addresses for known malicious patterns. Not a signature database — pattern matching that catches new threats.

### ZK Proofs ($0.01–$0.03/query)

Four endpoints for zero-knowledge proofs:

- **Balance proof** — prove you hold ≥ X BTC without revealing your address
- **Age proof** — prove your UTXO is ≥ N blocks old
- **Membership proof** — prove your address belongs to a set
- **Verification** — verify any ZK proof

Built on Groth16 (the same proof system used by Zcash). This is Bitcoin-native privacy without leaving the Bitcoin network.

### Solv Protocol / BTCFi ($0.02/query)

Four endpoints for the SolvBTC ecosystem:

- **Reserves** — SolvBTC supply, backing ratio, TVL across chains
- **Yield** — xSolvBTC APY, yield strategy breakdowns
- **Liquidity** — cross-chain distribution and depth
- **Risk** — multi-factor risk assessment

### Cross-Chain (Ethereum + Solana, $0.01/query)

Five endpoints for multi-chain coverage:

- **Ethereum** — gas prices, address balance, transaction details
- **Solana** — priority fees, address balance

### Real-Time Streams ($0.01/query)

Two Server-Sent Events endpoints:

- **General stream** — new blocks, fee changes, mempool surges
- **Whale stream** — real-time alerts for large transactions

### Free Endpoints

- Health check
- Staking status
- Agent discovery (`/llms.txt`)
- MCP server info
- x402 manifest

## The Agent-Native Design

"Agent-native" isn't a feature — it's an architectural philosophy. Every design decision was made with autonomous agents as first-class citizens.

### Discovery: `/llms.txt`

When an AI agent encounters an API, it needs to understand what the API does without reading hundreds of pages of documentation. The `/llms.txt` file (inspired by `robots.txt`) provides:

- Complete endpoint listing with descriptions
- Authentication methods
- Pricing tiers
- Available integration paths (MCP, SDK, HTTP)

An agent reads one file and knows everything it needs to make API calls.

### Integration: MCP Server

The MCP (Model Context Protocol) server is the primary way AI agents consume BTCFi data:

```bash
npx @aiindigo/btcfi-mcp
```

This installs a server that exposes 27 tools. An AI agent (Claude, ChatGPT, Gemini) can:

1. List available tools
2. Call `get_fees` → get Bitcoin fee estimates
3. Call `get_whale_alerts` → detect large transactions
4. Call `get_address_risk` → score an address
5. Call `generate_balance_proof` → create a ZK proof

Each tool call maps to an HTTP request. The MCP server handles x402 payments transparently.

### SDK: `@aiindigo/btcfi`

For developers who want programmatic access:

```typescript
import { BTCFi } from '@aiindigo/btcfi';

const btcfi = new BTCFi({ evmPrivateKey: process.env.KEY });

// One line, one query, one payment
const fees = await btcfi.getFees();
const whales = await btcfi.getWhaleAlerts();
const proof = await btcfi.generateBalanceProof('bc1q...', 1_000_000);
```

28 methods. Every endpoint. x402 handled automatically.

## Security Model

Security in an open-source, per-query API requires different thinking than traditional API key management.

### Wallet-Based Authentication

Instead of API keys, BTCFi uses wallet-based request signing:

- **Ed25519** for Solana addresses
- **secp256k1** for EVM addresses

Sign requests with your private key. The server verifies the signature. No shared secrets to manage.

### Encrypted Responses

Sensitive data (risk scores, threat analysis) is encrypted in transit using:

- **Curve25519** for key exchange
- **XSalsa20-Poly1305** for authenticated encryption

The client decrypts locally. Even if someone intercepts the response, they can't read it.

### ZK Proofs for Privacy

The ZK endpoints let users prove claims about their Bitcoin holdings without revealing which address they control:

```typescript
// Prove you hold ≥ 1 BTC without revealing your address
const proof = await btcfi.generateBalanceProof(
  'bc1q...',       // your address (sent to server)
  100_000_000,     // threshold in satoshis (1 BTC)
  'satoshi'
);
// proof.proof can be shared publicly
// Verifiers can confirm the claim without knowing the address
```

### Replay Protection

Every signed request includes a nonce and timestamp. Replayed requests are rejected. This prevents payment replay attacks and ensures each x402 payment is consumed exactly once.

## Building in Public: What We Learned

### 3 Security Audits, 35+ Bugs Fixed

Three rounds of auditing found bugs ranging from:
- Missing input validation on address parameters
- Rate limit bypass via header manipulation
- Cache poisoning through URL normalization issues
- Error messages leaking internal paths

All fixed. All documented. All in the open.

### 144+ Tasks, 5 Major Releases

From initial core endpoints to ZK proofs, MCP integration, and multi-chain support — every milestone is documented in the ROADMAP.md. No vaporware.

### Revenue Reality

Starting from zero, the x402 model means revenue scales directly with usage. No $49/month subscriptions to inflate vanity metrics. Real queries, real payments, real value.

## What's Next

- **On-chain staking contracts** — stake USDC to earn tier discounts
- **WebSocket feeds** — upgrade SSE to WebSocket for lower latency
- **Self-hosted Bitcoin node** — full data sovereignty
- **Chrome extension** — price badge, whale alerts, address inspector
- **More AI agent examples** — LangChain, CrewAI, AutoGPT integrations

## Try It

```bash
# Free — no signup, no API keys
curl https://btcfi.aiindigo.com/api/v1/fees

# See what AI agents see
curl https://btcfi.aiindigo.com/llms.txt

# Install the SDK
npm install @aiindigo/btcfi

# Run the MCP server
npx @aiindigo/btcfi-mcp
```

Full docs: [btcfi.aiindigo.com](https://btcfi.aiindigo.com)
Source: [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api)
License: MIT

---

*Building Bitcoin infrastructure should be open, affordable, and accessible to machines. BTCFi API is our answer to that vision.*
