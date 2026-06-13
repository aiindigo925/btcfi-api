---
title: "How x402 Micropayments Work: A Developer's Guide to Bitcoin-Native API Billing"
description: "Learn how HTTP 402 + stablecoin micropayments let you pay $0.01–$0.05 per API query — no accounts, no Stripe, no subscriptions. A practical guide with code examples."
date: "2026-06-14"
tags: ["x402", "micropayments", "bitcoin", "api", "http402", "stablecoins", "USDC", "developer-guide", "web3"]
---

# How x402 Micropayments Work: A Developer's Guide to Bitcoin-Native API Billing

**TL;DR:** x402 lets you pay for API queries with stablecoins (USDC) at the HTTP level. No accounts. No Stripe. No subscriptions. Just make a request, get a `402 Payment Required` response, pay $0.01–$0.05, and get your data. Here's how it works and why it matters for developers.

---

## The Problem with API Billing Today

Every developer has been through this cycle:

1. Find an API that does what you need
2. Sign up for an account
3. Enter credit card details
4. Generate an API key
5. Set up billing alerts
6. Deal with minimum charges, overage fees, and invoice management
7. Cancel when you stop using it (if you remember)

For a single query — say, checking Bitcoin fee estimates — you might pay $49/month for a subscription that includes 10,000 queries you'll never use. Or $0.50 per query on a pay-as-you-go plan. Meanwhile, the actual marginal cost of serving that query is fractions of a cent.

This friction kills use cases. AI agents can't easily sign up for accounts. Side projects get abandoned because of billing overhead. Prototyping requires entering financial information before you've even confirmed the API works for your use case.

**x402 fixes this.**

## What Is x402?

x402 is a protocol that uses the HTTP `402 Payment Required` status code — which has existed since HTTP/1.1 in 1997 but was never widely implemented — to enable per-request micropayments.

Here's the flow:

1. **You make an HTTP request** to an API endpoint
2. **The server responds with HTTP 402** and includes payment requirements (amount, currency, recipient address, network)
3. **You send the payment** (typically a stablecoin like USDC on a Layer 2 network)
4. **You include the payment proof** in a header on your next request
5. **The server verifies the payment** and returns the data

That's it. No accounts. No API keys. No OAuth flows. No subscription management.

The protocol was formalized by Coinbase in 2024 as a standard way for HTTP servers to request payment and for clients to pay using stablecoins on EVM-compatible chains. The key innovation is making payments *programmatic* — software can pay for itself.

## Why This Matters for API Developers

### No Account Creation Required

Traditional API billing requires user accounts for:
- Tracking usage and enforcing limits
- Managing billing and invoicing
- Sending payment reminders and dunning emails
- Handling disputes and refunds

x402 eliminates all of this. The payment *is* the authentication. If you've paid, you get the data. The server doesn't need to know who you are — just that you've paid.

### Per-Query Pricing at the HTTP Level

Instead of $49/month subscriptions or $0.50/query rates, x402 enables true micro-pricing:

| Query Type | x402 Price | Traditional Price |
|-----------|-----------|-------------------|
| Bitcoin fee estimates | $0.01 | $49/mo subscription |
| Address balance lookup | $0.01 | $0.10–$0.50/query |
| Whale transaction detection | $0.02 | $799/mo (Glassnode) |
| Risk scoring | $0.02 | $0.25–$1.00/query |
| ZK proof generation | $0.03 | N/A (not available) |

When you're paying $0.01 per query, you don't need to think about whether a query is "worth it." Just ask.

### AI Agents Can Pay for Themselves

This is the real breakthrough. AI agents — LangChain tools, MCP servers, CrewAI crews — need to access external data, but they can't:
- Fill out signup forms
- Enter credit card details
- Manage API key rotation
- Handle billing disputes

With x402, an agent can:
1. Discover the API at `/llms.txt`
2. Read the payment requirements from a `402` response
3. Pay from its own wallet (or a pre-funded wallet)
4. Include the payment proof in the request header
5. Get the data

The agent is a first-class citizen in the payment flow. This is how the API economy should work for machines.

## How btcfi-api Implements x402

[BTCFi API](https://btcfi.aiindigo.com) is a Bitcoin intelligence platform with 45 endpoints — fees, mempool data, whale detection, risk scoring, ZK proofs, and more. Every paid endpoint uses x402 micropayments.

### Payment Networks

BTCFi supports two payment networks:

| Network | Asset | Facilitator | Fees |
|---------|-------|-------------|------|
| **Base** (EVM L2) | USDC | Coinbase (ERC-3009) | Zero |
| **Solana** | USDC | NLx402 (PCEF nonprofit) | Zero |

Both networks have zero transaction fees, so your $0.01 payment actually costs $0.01 — not $0.01 + gas.

### The Payment Flow in Practice

When you request a paid endpoint without payment:

```
GET /api/v1/intelligence/whales
```

You get back:

```http
HTTP/1.1 402 Payment Required
Content-Type: application/json

{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "base",
      "maxAmountRequired": "20000",
      "resource": "https://btcfi.aiindigo.com/api/v1/intelligence/whales",
      "description": "Whale transaction detection",
      "payTo": "0xA6Bba2453673196ae22fb249C7eA9FA118a87150",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "network": "base"
    }
  ]
}
```

You pay 20,000 USDC units ($0.02) to the specified address, get a payment proof, and include it in your next request.

### Free Tier

Not everything requires payment. BTCFi offers a free tier:

- **100 calls/day per IP** — no signup, no API keys
- **Free endpoints** — `/api/health`, `/api/v1/staking/status`, `/llms.txt`
- **Agent discovery** — `/llms.txt` is always free, so agents can discover the API before paying

This means you can explore the API, read documentation, and test free endpoints before spending a cent.

## Code Examples

### cURL

```bash
# Free endpoint — just works
curl https://btcfi.aiindigo.com/api/v1/fees

# Paid endpoint without payment → gets 402
curl -v https://btcfi.aiindigo.com/api/v1/intelligence/whales

# Paid endpoint with x402 payment proof
curl -X GET https://btcfi.aiindigo.com/api/v1/intelligence/whales \
  -H "X-Payment: <base64-encoded-payment-proof>"
```

### Python

```python
import requests
from btcfi import BTCFi

# Using the SDK (handles x402 payments automatically)
btcfi = BTCFi(evm_private_key="your-private-key")

# Free endpoint
health = btcfi.get_health()

# Paid endpoint — auto-pays via x402
fees = btcfi.get_fees()
whales = btcfi.get_whale_alerts()
risk = btcfi.get_address_risk("bc1q...")
```

### JavaScript / TypeScript

```typescript
import { BTCFi } from '@aiindigo/btcfi';

// Auto-pay with Base USDC
const btcfi = new BTCFi({
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

// Free endpoints — no payment needed
const health = await btcfi.getHealth();

// Paid endpoints — auto-pays $0.02
const whales = await btcfi.getWhaleAlerts();
const risk = await btcfi.getAddressRisk('bc1q...');

// ZK proofs — $0.03
const proof = await btcfi.generateBalanceProof(
  'bc1q...',
  1000000, // threshold in satoshis
  'satoshi'
);
```

### Using the MCP Server (AI Agents)

```bash
# Install the MCP server
npx @aiindigo/btcfi-mcp

# Or add to your MCP client config:
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": {
        "EVM_PRIVATE_KEY": "your-key"
      }
    }
  }
}
```

The MCP server exposes 27 tools that AI agents (Claude, ChatGPT, Gemini) can call directly. Each tool maps to a BTCFi endpoint, and the MCP server handles x402 payments automatically.

## x402 vs. Traditional API Billing

| Feature | x402 (BTCFi) | Stripe/Subscription | API Key Plans |
|---------|-------------|-------------------|---------------|
| **Account required** | No | Yes | Yes |
| **Minimum charge** | $0.01 | $49/mo | Varies |
| **Payment method** | USDC (on-chain) | Credit card | Credit card |
| **AI agent compatible** | Yes | No | Limited |
| **Setup time** | 0 seconds | 5-10 minutes | 2-5 minutes |
| **Transaction fees** | $0 (Base/Solana) | 2.9% + $0.30 | N/A |
| **Global access** | Any wallet | Card required | Card required |
| **Cancellation** | Stop paying | Cancel subscription | Cancel plan |
| **Overage** | Pay per query | Overage fees | Block or overage |

The traditional model optimizes for *predictable revenue*. x402 optimizes for *frictionless access*. For developers and AI agents, the latter wins.

## The Bigger Picture: x402 and the Machine Economy

We're entering an era where software agents are economic actors. They need to:
- Pay for data (APIs)
- Pay for compute (inference)
- Pay for storage (files, embeddings)
- Pay for actions (transactions, messages)

Human-centric billing (accounts, credit cards, subscriptions) doesn't work for agents. x402 provides the missing piece: **machine-native payments**.

The BTCFi API is a working example of this future. An AI agent can:
1. Discover the API via `GET /llms.txt` (free)
2. Read the OpenAPI spec (free)
3. Decide which queries are relevant to its task
4. Pay $0.01–$0.05 per query from a wallet
5. Get structured data back

No human intervention required. No accounts to create. No credit cards to share.

This is what "agent-native" means in practice.

## Getting Started

1. **Explore the free tier:** `curl https://btcfi.aiindigo.com/api/v1/fees`
2. **Read the agent docs:** `curl https://btcfi.aiindigo.com/llms.txt`
3. **Install the SDK:** `npm install @aiindigo/btcfi`
4. **Try the MCP server:** `npx @aiindigo/btcfi-mcp`
5. **Fund a wallet with USDC on Base** and start making paid queries

Full documentation: [btcfi.aiindigo.com](https://btcfi.aiindigo.com)
GitHub: [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api)
Open source (MIT).

---

*If you're building AI agents, tools, or Bitcoin applications, x402 micropayments give you the simplest billing model available. No accounts. No subscriptions. Just pay and query.*
