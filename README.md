# BTCFi API

**Bitcoin Intelligence API for AI Agents**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-4.2.0-blue.svg)](https://github.com/aiindigo925/btcfi-api)

Live at [btcfi.aiindigo.com](https://btcfi.aiindigo.com) · Built by [AI Indigo](https://aiindigo.com) · [GitHub](https://github.com/aiindigo925/btcfi-api)

---

BTCFi API is an agent-native Bitcoin intelligence platform providing 80+ endpoints across Bitcoin, Ethereum, Solana, Lightning Network, Runes, and Taproot Assets. Powered by x402 micropayments — pay $0.01–$0.05 per query in USDC, no API keys or subscriptions required. CoinGecko integration provides multi-currency pricing (38 fiat currencies). AI agents discover endpoints at `/llms.txt` and integrate via MCP, SDK, or raw HTTP.

## Free Tier

100 calls/day per IP — no signup, no API keys, just make a request:

```bash
curl https://btcfi.aiindigo.com/api/v1/fees
```

```json
{
  "fastest": 12,
  "30min": 8,
  "1hr": 5,
  "economy": 3,
  "fastestUSD": "$2.40",
  "recommended": "8 sat/vB"
}
```

## Quick Start

**AI Agents (MCP):**
```bash
npx @aiindigo/btcfi-mcp
```

**SDK:**
```bash
npm install @aiindigo/btcfi
```

```typescript
import { BTCFi } from "@aiindigo/btcfi";

const btcfi = new BTCFi({ network: "base" });
const fees = await btcfi.fees();
const risk = await btcfi.intelligence.risk("bc1q...");
```

**Raw HTTP:**
```bash
# Free endpoint — no auth needed
curl https://btcfi.aiindigo.com/api/v1/mempool

# Paid endpoint — requires x402 micropayment
curl -X GET https://btcfi.aiindigo.com/api/v1/intelligence/whales \
  -H "X-Payment: <x402-payment-proof>"
```

**OpenAPI Spec:**
```
https://btcfi.aiindigo.com/openapi.json
```

## API Reference

### Core Bitcoin Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/fees` | Fee estimates (fastest, 30min, 1hr, economy) with USD values | $0.01 |
| `GET /api/v1/mempool` | Mempool summary, tx count, size, fee histogram | $0.01 |
| `GET /api/v1/address/{addr}` | Address balance, tx count, funded/spent stats | $0.01 |
| `GET /api/v1/address/{addr}/utxos` | Unspent transaction outputs | $0.01 |
| `GET /api/v1/address/{addr}/txs` | Transaction history | $0.01 |
| `GET /api/v1/tx/{txid}` | Full transaction details | $0.01 |
| `GET /api/v1/tx/{txid}/status` | Confirmation status | $0.01 |
| `POST /api/v1/tx/broadcast` | Broadcast signed transaction | $0.05 |
| `GET /api/v1/block/latest` | Latest blocks with details | $0.01 |
| `GET /api/v1/block/{id}` | Block by height or hash | $0.01 |

### Intelligence Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/intelligence/fees` | AI fee prediction (1h, 6h, 24h windows) | $0.02 |
| `GET /api/v1/intelligence/whales` | Large transaction detection | $0.02 |
| `GET /api/v1/intelligence/risk/{addr}` | Address risk scoring | $0.02 |
| `GET /api/v1/intelligence/network` | Hashrate, difficulty, congestion | $0.02 |
| `GET /api/v1/intelligence/consolidate/{addr}` | UTXO consolidation advice | $0.02 |
| `GET /api/v1/intelligence/mvrv` | MVRV ratio | $0.02 |
| `GET /api/v1/intelligence/sopr` | SOPR (Spent Output Profit Ratio) | $0.02 |
| `GET /api/v1/intelligence/nupl` | NUPL (Net Unrealized Profit/Loss) | $0.02 |
| `GET /api/v1/intelligence/hodl-waves` | HODL wave distribution | $0.02 |

### Security Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/security/threat/{addr}` | YARA-pattern threat analysis (8 patterns) | $0.02 |

### ZK Proof Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `POST /api/v1/zk/balance-proof` | Prove balance ≥ threshold | $0.03 |
| `POST /api/v1/zk/age-proof` | Prove UTXO age ≥ N blocks | $0.03 |
| `POST /api/v1/zk/membership` | Prove set membership | $0.03 |
| `POST /api/v1/zk/verify` | Verify any ZK proof | $0.01 |

### Solv Protocol Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/solv/reserves` | SolvBTC supply, backing ratio, TVL | $0.02 |
| `GET /api/v1/solv/yield` | xSolvBTC APY, yield strategies | $0.02 |
| `GET /api/v1/solv/liquidity` | Cross-chain SolvBTC distribution | $0.02 |
| `GET /api/v1/solv/risk` | Multi-factor risk assessment | $0.02 |

### Cross-Chain Endpoints

**Ethereum ($0.01):**
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/eth/gas` | ETH gas prices |
| `GET /api/v1/eth/address/{addr}` | ETH address balance |
| `GET /api/v1/eth/tx/{hash}` | ETH transaction details |

**Solana ($0.01):**
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/sol/fees` | SOL priority fees |
| `GET /api/v1/sol/address/{addr}` | SOL address balance |

### Runes Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/runes` | List all Bitcoin Runes tokens | $0.02 |
| `GET /api/v1/runes/trending` | Trending Runes by 24h activity | $0.02 |
| `GET /api/v1/runes/{ticker}` | Runes token details | $0.02 |
| `GET /api/v1/runes/{ticker}/holders` | Holder distribution | $0.02 |
| `GET /api/v1/runes/{ticker}/transfers` | Recent transfers | $0.02 |

### Taproot Assets Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/taproot/assets/{addr}` | Taproot Assets held by address | $0.02 |
| `GET /api/v1/taproot/assets/{addr}/{assetId}` | Taproot Asset details | $0.02 |

### Lightning Network Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/lightning/node/{pubkey}` | Lightning node info | $0.02 |
| `GET /api/v1/lightning/channels/{chanId}` | Channel details | $0.02 |
| `GET /api/v1/lightning/routing-fee` | Routing fee estimate | $0.02 |
| `GET /api/v1/intelligence/lightning` | Lightning network intelligence | $0.02 |

### Portfolio Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/portfolio` | List portfolios | $0.01 |
| `GET /api/v1/portfolio/{userId}` | Get user portfolio | $0.01 |
| `GET /api/v1/portfolio/{userId}/analytics` | Portfolio analytics | $0.02 |
| `GET /api/v1/intelligence/portfolio/{addr}` | Address portfolio analysis | $0.02 |

### Alerts Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/alerts` | List alert rules | Free |
| `GET /api/v1/alerts/rules` | Manage alert rules | Free |
| `DELETE /api/v1/alerts/rules/{id}` | Delete alert rule | Free |
| `GET /api/v1/alerts/history` | Alert trigger history | Free |
| `POST /api/v1/alerts/evaluate` | Evaluate alert conditions | Free |

### Price Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/price` | BTC price (CoinGecko: 38 fiat currencies) | Free |

### Real-Time Streams

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/v1/stream` | SSE: new blocks, fee changes, mempool surges | $0.01 |
| `GET /api/v1/stream/whales` | SSE: whale transaction alerts (`?min=100` BTC) | $0.01 |

### Agent Integration

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/mcp` | MCP server info and tools | Free |
| `GET /llms.txt` | AI agent discovery file | Free |
| `GET /api/v1/agent-skills` | Agent skill registry | Free |

### System Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `GET /api/health` | System health check | Free |
| `GET /api/v1/staking/status` | Staking tier and rate limit status | Free |

## Pricing

| Category | Price (USDC) |
|----------|-------------|
| Core Bitcoin (fees, mempool, address, tx, block) | $0.01 |
| Intelligence (whales, risk, MVRV, SOPR, NUPL, HODL waves, cluster, graph) | $0.02 |
| Security (threat analysis) | $0.02 |
| Solv Protocol (reserves, yield, liquidity, risk) | $0.02 |
| Runes (tokens, holders, transfers, trending) | $0.02 |
| Taproot Assets (asset list, asset details) | $0.02 |
| Lightning Network (nodes, channels, routing fees) | $0.02 |
| Portfolio (addresses, analytics) | $0.01–$0.02 |
| ZK Proofs (balance, age, membership) | $0.03 |
| Transaction broadcast | $0.05 |
| Ethereum / Solana | $0.01 |
| Streams (SSE) | $0.01 |
| Price (CoinGecko multi-currency) | Free |
| Alerts (rules, history, evaluate) | Free |
| System (health, status) | Free |
| Agent Discovery (/llms.txt, /api/mcp) | Free |

**Free Tier:** 100 calls/day per IP, no signup required.

## Authentication

BTCFi API uses **x402 micropayments** — no API keys, no OAuth, no subscriptions.

1. **Free endpoints** — No authentication. Just make a request.
2. **Paid endpoints** — Include an `X-Payment` header with a USDC micropayment proof.
3. **Payment networks:**
   - **Base** (EVM L2) — Coinbase facilitator, zero fees, ERC-3009
   - **Solana** — NLx402 by PCEF (nonprofit), zero fees

**Request signing** (optional, for higher rate limits):
- Wallet-based signing with Ed25519 (Solana) or secp256k1 (EVM)
- Headers: `X-Signature`, `X-Nonce`, `X-Signer`, `X-Timestamp`

## Free for Humans

No payments, no signup. Just open Telegram:

- **[@BTC_Fi_Bot](https://t.me/BTC_Fi_Bot)** — 28 commands + inline mode. `/price`, `/fees`, `/mempool`, `/address`, `/tx`, `/whale`, `/risk`, `/network`, `/help`, `/eth_gas`, `/sol_fees`, `/watch`, `/unwatch`, `/watchlist`, `/alerts`, `/runes`, `/ordinals`, `/lightning`, `/portfolio`, `/taproot`, `/cluster`, `/graph`, `/batch`, `/webhooks`, `/price eur`, `/price gbp`, `/price jpy`
- **[@BTCFi_Whales](https://t.me/BTCFi_Whales)** — Real-time whale transaction alerts, auto-posted every 15 min
- **[Web Dashboard](https://btcfi.aiindigo.com/dashboard)** — Live BTC price, fees, mempool, address lookup, whale watch

## Security

- Wallet-based request signing (Ed25519 + secp256k1)
- Encrypted responses (Curve25519 + XSalsa20-Poly1305)
- Zero-knowledge proofs (Groth16)
- 8 YARA-style threat detection patterns
- Nonce replay protection
- PEAC Protocol cryptographic receipts
- Tiered rate limiting (free: 100/min, signed: 500/min, paid: unlimited)

Report vulnerabilities: **security@aiindigo.com**

## Self-Hosted

Run the API locally for development or private deployment:

```bash
git clone https://github.com/aiindigo925/btcfi-api.git
cd btcfi-api
npm install
cp .env.example .env    # Configure environment variables
npm run dev              # Start on port 3001
```

Required environment variables:
- `UPSTASH_REDIS_REST_URL` — Redis connection for caching
- `UPSTASH_REDIS_REST_TOKEN` — Redis auth token
- `X402_NETWORK` — Payment network (base or solana)
- `X402_FACILITATOR_URL` — x402 facilitator endpoint

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/ROADMAP.md](docs/ROADMAP.md) | Project history and future plans |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design and endpoint reference |
| [docs/SECURITY.md](docs/SECURITY.md) | Security model and features |
| [docs/CHANGELOG.md](docs/CHANGELOG.md) | Version history |

## Packages & Distribution

| Package | Description |
|---------|-------------|
| [`@aiindigo/btcfi`](https://www.npmjs.com/package/@aiindigo/btcfi) | TypeScript SDK — 28 methods |
| [`@aiindigo/btcfi-mcp`](https://www.npmjs.com/package/@aiindigo/btcfi-mcp) | MCP Server — 45 tools for Claude, ChatGPT, Gemini |
| [MCP Registry](https://registry.modelcontextprotocol.io) | `io.github.aiindigo925/btcfi` |
| [Glama](https://glama.ai/mcp/servers) | Indexed — searchable MCP directory |
| [@BTC_Fi_Bot](https://t.me/BTC_Fi_Bot) | Telegram bot — 28 commands + inline mode |

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

[MIT](LICENSE) — Copyright © 2026 [AI Indigo](https://aiindigo.com)

---

*No token. No API keys. Just Bitcoin data. Ship > talk.* 🚀
