# BTCFi API — Roadmap

**Product:** BTCFi API — Bitcoin Data & Intelligence for AI Agents
**Live at:** [btcfi.aiindigo.com](https://btcfi.aiindigo.com)
**By:** [AI Indigo](https://aiindigo.com)
**Source:** [GitHub](https://github.com/aiindigo925/btcfi-api)

---

## Completed

### MP0 — Core API (8 tasks)
- 11 core endpoints: fees, mempool, address, UTXOs, transactions, blocks, broadcast
- x402 micropayment integration (Base + Solana)
- Middleware: CORS, rate limiting, security headers

### MP1 — Security & Advanced Features (22 tasks)
- Dual-facilitator x402: Coinbase (Base, fee-free) + NLx402/PCEF (Solana, nonprofit)
- 5 intelligence endpoints: fee prediction, whale detection, risk scoring, network health, UTXO consolidation
- Threat detection with 8 YARA-style pattern rules
- Encrypted responses (Curve25519 + XSalsa20-Poly1305)
- Wallet-based request signing with nonce replay protection
- Staking tier system (free/staker/whale)
- Security hardening: input validation, error sanitization, rate limit tiers

### MP2 — Ship, Connect, Earn (25 tasks)
- Solv Protocol integration: reserves, yield, liquidity, risk across 4 chains
- Multi-chain RPC layer with auto-failover
- MCP server with 27 tools (`@aiindigo/btcfi-mcp`)
- TypeScript SDK with 28 methods (`@aiindigo/btcfi`)
- Production landing page and OpenAPI 3.1 specification
- Health monitoring and revenue analytics
- 5 agent cookbook examples

### MP3 — ZK Proofs & Real-Time Streams (30 tasks)
- 4 ZK proof endpoints: balance range, UTXO age, set membership, verification
- Server-Sent Events streams: general events + whale alerts
- Production hardening: persistent rate limiting, error tracking
- OpenAPI spec updated to 31 endpoints

### MP4 — Platform Expansion (20 tasks)
- npm packages published: `@aiindigo/btcfi@3.0.0` + `@aiindigo/btcfi-mcp@3.0.1`
- MCP Registry: `io.github.aiindigo925/btcfi` on registry.modelcontextprotocol.io ✅
- Glama: indexed at glama.ai/mcp/servers ✅
- Smithery: skipped (requires remote HTTP transport, not stdio)
- PEAC Protocol: cryptographic payment receipts + `/.well-known/peac.txt`
- x402 V2: CAIP-2 chain IDs, Discovery extension
- Telegram bot [@BTC_Fi_Bot](https://t.me/BTC_Fi_Bot): 9 commands + inline mode via grammY ✅
- Chrome extension: price badge, fee calculator, whale alerts, address inspector
- Web dashboard: overview, address lookup, whale watch, fee calculator
- Swagger UI interactive docs at `/api/docs`
- Uptime monitoring via Vercel Cron
- 3 security audits with 35+ bugs found and fixed

---

## Current Status

| Metric | Count |
|--------|-------|
| API Endpoints | 31 |
| MCP Tools | 27 |
| SDK Methods | 28 |
| YARA Patterns | 8 |
| ZK Proof Types | 4 |
| Payment Networks | 2 (Base + Solana) |
| Total Tasks Completed | 86+ |

---

## Planned

### MP5 — Growth & Ecosystem
- On-chain staking contracts (Base + Solana)
- WebSocket real-time feeds upgrade
- Multi-chain expansion (Ethereum, Solana native data)
- Self-hosted Bitcoin node for full data sovereignty
- x402 ecosystem directory listing
- Newsletter integration
- Documentation site

---

## Philosophy

- **No token.** Revenue from x402 micropayments — pure utility.
- **Open source.** Every endpoint, circuit, and pattern is auditable.
- **Agent-native.** Built for machines first, humans second.
- **Privacy by design.** ZK proofs, encrypted responses, no data stored.
- **Ship > talk.** Working product over promises.

---

*Built by AI Indigo. No rugs. Just ships.* 🚀
