# BTCFi API for AI Agents

**Tagline:** Bitcoin data for agents. No tokens. Just ship.

**Status:** Live — v3.0.0 (MP0–MP3 complete)  
**Created:** 2026-01-29  
**Updated:** 2026-02-11

---

## Vision

While others talk "stealth release" and sell tokens, we ship working products.

Open source Bitcoin data API for AI agents via x402. 31 endpoints. Dual payment networks. Zero facilitator fees.

---

## Endpoints

### Core ($0.01 USDC)
```
GET  /api/v1/fees                          — Fee rates + USD estimates
GET  /api/v1/mempool                       — Mempool summary + recent txs
GET  /api/v1/address/{addr}                — Balance + chain/mempool stats
GET  /api/v1/address/{addr}/utxos          — Unspent outputs
GET  /api/v1/address/{addr}/txs            — Transaction history
GET  /api/v1/tx/{txid}                     — Transaction details
GET  /api/v1/tx/{txid}/status              — Confirmation status
GET  /api/v1/block/{id}                    — Block by height or hash
GET  /api/v1/block/latest                  — Recent blocks
POST /api/v1/tx/broadcast                  — Broadcast signed tx ($0.05)
```

### Intelligence ($0.02 USDC)
```
GET  /api/v1/intelligence/fees             — AI fee prediction (1h/6h/24h)
GET  /api/v1/intelligence/whales           — Large tx detection
GET  /api/v1/intelligence/risk/{addr}      — Address risk scoring
GET  /api/v1/intelligence/network          — Network health analysis
GET  /api/v1/intelligence/consolidate/{addr} — UTXO consolidation advice
```

### Security ($0.02 USDC)
```
GET  /api/v1/security/threat/{addr}        — YARA-pattern threat analysis
```

### Solv Protocol ($0.02 USDC)
```
GET  /api/v1/solv/reserves                 — SolvBTC supply + backing ratio + TVL
GET  /api/v1/solv/yield                    — xSolvBTC APY + yield strategies
GET  /api/v1/solv/liquidity                — Cross-chain liquidity distribution
GET  /api/v1/solv/risk                     — Multi-factor risk assessment
```

### ZK Proofs ($0.03 generate / $0.01 verify)
```
POST /api/v1/zk/balance-proof             — Prove balance ≥ threshold (Groth16)
POST /api/v1/zk/age-proof                 — Prove UTXO age ≥ N blocks
POST /api/v1/zk/membership                — Prove address in set
POST /api/v1/zk/verify                    — Verify any ZK proof ($0.01)
```

### Real-Time Streams ($0.01 USDC)
```
GET  /api/v1/stream                        — SSE: new blocks, fee changes, mempool surges
GET  /api/v1/stream/whales?min=100         — SSE: whale transaction alerts
```

### System (Free)
```
GET  /api/health                           — Health + RPC status + uptime
GET  /api/v1                               — Full API index
GET  /api/v1/staking/status                — Staking tier check
```

---

## Data Sources

- mempool.space API (primary)
- Solv Protocol on-chain (Ethereum, BNB, Arbitrum)
- Whistle Network RPC (Solana)
- Public EVM RPCs (Base, Ethereum, BNB, Arbitrum, Avalanche)

---

## x402 Pricing

| Tier | Price | Endpoints |
|------|-------|-----------|
| Core | $0.01 USDC | fees, mempool, address, tx, block |
| Intelligence | $0.02 USDC | fee prediction, whales, risk, network, consolidation |
| Security | $0.02 USDC | YARA threat analysis |
| Solv | $0.02 USDC | reserves, yield, liquidity, risk |
| ZK Proofs | $0.03 USDC | balance proof, age proof, membership proof |
| ZK Verify | $0.01 USDC | verify any proof |
| Streams | $0.01 USDC | real-time events, whale alerts |
| Broadcast | $0.05 USDC | tx broadcast |
| System | Free | health, index, staking |

Payment networks: **Base** (Coinbase x402, fee-free) and **Solana** (NLx402/PCEF, zero fees).

---

## Tech Stack

- Next.js 15 API routes
- x402 SDK (@x402/next) + custom NLx402 for Solana
- Vercel deployment (iad1, sfo1)
- TypeScript throughout
- Middleware-level payment, caching, rate limiting, CORS, security headers

---

## Security

- Dual-facilitator x402 (Base + Solana NLx402)
- YARA-pattern threat analysis (PCEF-inspired)
- Wallet signature authentication (Ed25519 + secp256k1)
- Encrypted responses (Curve25519 + XSalsa20-Poly1305)
- Nonce-based replay protection
- Tiered rate limiting with KV-backed persistence
- ZK proofs for privacy-preserving verification (Groth16)

---

## MCP Server (27 tools)

```bash
npx @aiindigo/btcfi-mcp
```

Package: `@aiindigo/btcfi-mcp` | Transport: stdio | Auto-pay: Base + Solana

---

## SDK (28 methods)

```bash
npm install @aiindigo/btcfi
```

Package: `@aiindigo/btcfi` | Auto-pay: Base + Solana | Streams: EventSource

---

## Staking

Agent staking tiers with vesting-drip mechanics:

| Tier | Stake | Rate Limit | Drip |
|------|-------|------------|------|
| Free | $0 | 100/min | — |
| Staker | $100 USDC | 500/min | 10 credits/day |
| Whale | $1000 USDC | Unlimited | 200 credits/day |

Fomo3D bonus: last agent to stake in each 24h period earns 10% bonus credits.

---

## Philosophy

- **No token.** Product is the value.
- **Open source.** Anyone can verify, fork, improve.
- **Ship fast.** While competitors do "stealth," we go live.
- **Robin Hood mode.** Make agent infrastructure accessible.

---

## Roadmap

### MP0: Foundation ✅
- Core Bitcoin endpoints (fees, mempool, address, tx, block)
- x402 payment integration (Base)
- MCP server + SDK
- Landing page + OpenAPI spec

### MP1: Intelligence + Security ✅
- AI-powered fee prediction, whale detection, risk scoring
- YARA-pattern threat analysis
- Wallet signature auth + encrypted responses
- Staking tiers with vesting-drip

### MP2: BTCFi + Dual Payment ✅
- Solv Protocol integration (reserves, yield, liquidity, risk)
- Solana NLx402 payment network
- Response caching + rate limiting
- Admin revenue dashboard

### MP3: ZK + Streams + Polish ✅
- ZK proof system (balance, age, membership, verify)
- Real-time SSE streams (events, whale alerts)
- OpenAPI spec finalization
- Error monitoring + response caching
- MCP auto-payment (Base + Solana)
- SDK auto-pay + stream support

### MP4+: Production Hardening
- [ ] Production deploy + npm publish
- [ ] MCP registry submissions
- [ ] Uptime monitoring
- [ ] Compiled circom circuits (replace simulated Groth16)
- [ ] On-chain staking contracts (Base + Solana)

---

*Built by AI Indigo. No rugs. Just ships.*
