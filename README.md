# BTCFi API

**Bitcoin Data & Intelligence for AI Agents**

Live at [btcfi.aiindigo.com](https://btcfi.aiindigo.com) · Built by [AI Indigo](https://aiindigo.com) · [GitHub](https://github.com/aiindigo925/btcfi-api)

---

BTCFi API provides 33 endpoints across Bitcoin, Ethereum, and Solana — accessible via x402 micropayments. Pay $0.01–$0.05 per query in USDC — no API keys, no subscriptions.

## Free for Humans

No payments, no signup, no API keys. Just open Telegram.

- **[@BTC_Fi_Bot](https://t.me/BTC_Fi_Bot)** — 15 commands + inline mode. `/price`, `/fees`, `/mempool`, `/address`, `/tx`, `/whale`, `/risk`, `/network`, `/help`, `/eth_gas`, `/sol_fees`, `/watch`, `/unwatch`, `/watchlist`, `/alerts`. Completely free.
- **[@BTCFi_Whales](https://t.me/BTCFi_Whales)** — Real-time whale transaction alerts, auto-posted every 15 min with buy/sell signals. Just join the channel.
- **[Web Dashboard](https://btcfi.aiindigo.com/dashboard)** — Live BTC price, fees, mempool, address lookup, whale watch.
- **Chrome Extension** — Price badge, whale alerts, address inspector (coming to Chrome Web Store).

## Quick Start

**For AI Agents (MCP):**
```bash
npx @aiindigo/btcfi-mcp
```

**For Developers (SDK):**
```bash
npm install @aiindigo/btcfi
```

```typescript
import { BTCFi } from "@aiindigo/btcfi";

const btcfi = new BTCFi({ network: "base" });
const fees = await btcfi.fees();
const risk = await btcfi.intelligence.risk("bc1q...");
```

## Endpoints

| Group | Count | Price | Examples |
|-------|-------|-------|---------|
| Core | 10 | $0.01–$0.05 | fees, mempool, address, UTXOs, tx history, transactions, blocks |
| Intelligence | 5 | $0.02 | fee prediction, whale alerts, risk scoring, network health, UTXO consolidation |
| Security | 1 | $0.02 | YARA-pattern threat analysis |
| Solv Protocol | 4 | $0.02 | SolvBTC reserves, yield, liquidity, risk |
| ZK Proofs | 4 | $0.01–$0.03 | balance range, UTXO age, set membership, verification |
| Streams | 2 | $0.01 | real-time blocks, whale transactions (SSE) |
| System | 2 | Free | health, staking status |
| Ethereum | 3 | $0.01 | ETH gas, address balance, transaction details |
| Solana | 2 | $0.01 | SOL priority fees, address balance |

Full specification: [OpenAPI 3.1](https://btcfi.aiindigo.com/openapi.json)

## Payment

Dual-network x402 micropayments in USDC:

- **Base** — Coinbase facilitator (fee-free)
- **Solana** — NLx402 by PCEF (nonprofit)

No API keys. No sign-up. Just pay and query.

## Security

- Wallet-based request signing (Ed25519 + secp256k1)
- Encrypted responses (Curve25519 + XSalsa20-Poly1305)
- Zero-knowledge proofs (Groth16)
- 8 YARA-style threat detection patterns
- Nonce replay protection
- PEAC Protocol cryptographic receipts

Report vulnerabilities: security@aiindigo.com

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
| [`@aiindigo/btcfi-mcp`](https://www.npmjs.com/package/@aiindigo/btcfi-mcp) | MCP Server — 27 tools for Claude, ChatGPT, Gemini |
| [MCP Registry](https://registry.modelcontextprotocol.io) | `io.github.aiindigo925/btcfi` |
| [Glama](https://glama.ai/mcp/servers) | Indexed — searchable MCP directory |
| [@BTC_Fi_Bot](https://t.me/BTC_Fi_Bot) | Telegram bot — 9 commands + inline mode |

## License

MIT

---

*No token. No API keys. Just Bitcoin data. Ship > talk.* 🚀
