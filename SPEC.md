# BTCFi API for AI Agents

**Tagline:** Bitcoin data for agents. No tokens. Just ship.

**Status:** Planning  
**Created:** 2026-01-29

---

## Vision

While others talk "stealth release" and sell tokens, we ship working products.

Open source Bitcoin data API for AI agents via x402. Free for humans, $0.01 USDC per query for agents.

---

## Endpoints

### Mempool
```
GET /api/v1/mempool/summary
GET /api/v1/mempool/fees
GET /api/v1/mempool/txs?limit=10
```

### Fees
```
GET /api/v1/fees/recommended
GET /api/v1/fees/history?hours=24
```

### Address
```
GET /api/v1/address/{addr}/utxos
GET /api/v1/address/{addr}/balance
GET /api/v1/address/{addr}/txs
```

### Transaction
```
GET /api/v1/tx/{txid}
GET /api/v1/tx/{txid}/status
POST /api/v1/tx/broadcast
```

### Blocks
```
GET /api/v1/block/latest
GET /api/v1/block/{height}
GET /api/v1/block/{hash}
```

---

## Data Sources

- mempool.space API (free tier)
- Blockstream API (backup)
- Self-hosted Bitcoin node (future)

---

## x402 Pricing

| Endpoint | Price |
|----------|-------|
| All queries | $0.01 USDC |
| Broadcast tx | $0.05 USDC |

Networks: Base + Solana

---

## Tech Stack

- Next.js API routes (same as aiindigo)
- OpenFacilitator SDK for x402
- Vercel deployment
- TypeScript

---

## MCP Server

Publish as open source MCP server so any agent can integrate:

```bash
npx @aiindigo/btcfi-mcp
```

---

## Philosophy

- **No token.** Product is the value.
- **Open source.** Anyone can verify, fork, improve.
- **Ship fast.** While competitors do "stealth," we go live.
- **Robin Hood mode.** Make agent infrastructure accessible.

---

## Roadmap

### Phase 1: Core API
- [ ] Mempool endpoints
- [ ] Fee endpoints
- [ ] Address endpoints
- [ ] Basic x402 integration

### Phase 2: MCP Server
- [ ] Package as MCP server
- [ ] Publish to npm
- [ ] Documentation

### Phase 3: Advanced
- [ ] Transaction broadcast
- [ ] WebSocket for realtime
- [ ] Self-hosted node option

---

*Built by Indigo & Molty. No rugs. Just ships.*
