# BTCFi API

**Bitcoin Data & Intelligence for AI Agents**

Live at [btcfi.aiindigo.com](https://btcfi.aiindigo.com) · Built by [AI Indigo](https://aiindigo.com) · [GitHub](https://github.com/aiindigo925/btcfi-api)

---

BTCFi API provides 31 Bitcoin data and intelligence endpoints accessible via x402 micropayments. Pay $0.01–$0.05 per query in USDC — no API keys, no subscriptions.

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

**For Humans:**
- [Web Dashboard](https://btcfi.aiindigo.com/dashboard)
- [Telegram Bot](https://t.me/BTCFiBot) — `/price`, `/fees`, `/whale`, `/risk`
- [Chrome Extension](https://btcfi.aiindigo.com) — price badge, whale alerts, address inspector
- [Interactive API Docs](https://btcfi.aiindigo.com/api/docs)

## Endpoints

| Group | Count | Price | Examples |
|-------|-------|-------|---------|
| Core | 11 | $0.01 | fees, mempool, address, UTXOs, transactions, blocks |
| Intelligence | 5 | $0.02 | fee prediction, whale alerts, risk scoring, network health |
| Security | 1 | $0.02 | YARA-pattern threat analysis |
| Solv Protocol | 4 | $0.02 | SolvBTC reserves, yield, liquidity, risk |
| ZK Proofs | 4 | $0.01–$0.03 | balance range, UTXO age, set membership |
| Streams | 2 | $0.01 | real-time blocks, whale transactions (SSE) |
| System | 4 | Free | health, index, staking status |

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

## Packages

| Package | Description |
|---------|-------------|
| [`@aiindigo/btcfi`](https://www.npmjs.com/package/@aiindigo/btcfi) | TypeScript SDK — 28 methods |
| [`@aiindigo/btcfi-mcp`](https://www.npmjs.com/package/@aiindigo/btcfi-mcp) | MCP Server — 27 tools for Claude, ChatGPT, Gemini |

## License

MIT

---

*No token. No API keys. Just Bitcoin data. Ship > talk.* 🚀
