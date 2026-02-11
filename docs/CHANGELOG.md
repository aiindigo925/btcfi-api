# BTCFi API — Changelog

## v3.0.0 (2026-02-11)

**Major release: Full platform with ZK proofs, real-time streams, and human interfaces.**

### New Endpoints
- `POST /api/v1/zk/balance-proof` — Zero-knowledge balance range proof
- `POST /api/v1/zk/age-proof` — Zero-knowledge UTXO age proof
- `POST /api/v1/zk/membership` — Zero-knowledge set membership proof
- `POST /api/v1/zk/verify` — Verify any BTCFi ZK proof
- `GET /api/v1/stream` — Server-Sent Events for blocks, fees, mempool
- `GET /api/v1/stream/whales` — Real-time whale transaction alerts
- `GET /api/health` — System health check
- `GET /api/admin/revenue` — Revenue analytics (admin-only)

### New Features
- PEAC Protocol: cryptographic payment receipts at `/.well-known/peac.txt`
- x402 V2: CAIP-2 chain identifiers, Discovery extension
- Web dashboard at `/dashboard` (overview, address lookup, whale watch, fee calculator)
- Telegram bot: 9 commands + inline mode
- Chrome extension: price badge, whale alerts, address inspector
- Swagger UI interactive docs at `/api/docs`
- Vercel Cron health monitoring

### Improvements
- OpenAPI spec updated to 29 paths with full response schemas
- 3 security audits with 35+ bugs fixed
- Rate limit tier spoofing prevention
- SSE streams with proper CORS headers
- Cache policies per endpoint type

---

## v2.0.0 (2026-02-10)

**Solv Protocol integration, MCP server, SDK, and production deployment.**

### New Endpoints
- `GET /api/v1/solv/reserves` — SolvBTC multi-chain supply and TVL
- `GET /api/v1/solv/yield` — xSolvBTC APY and yield strategies
- `GET /api/v1/solv/liquidity` — Cross-chain liquidity distribution
- `GET /api/v1/solv/risk` — 5-factor risk assessment
- `GET /api/v1/block/latest` — Recent blocks

### New Packages
- `@aiindigo/btcfi` — TypeScript SDK with 28 methods
- `@aiindigo/btcfi-mcp` — MCP server with 27 tools

### New Features
- Multi-chain RPC layer with auto-failover
- Production landing page
- OpenAPI 3.1 specification
- Revenue analytics
- 5 agent cookbook examples

---

## v1.1.0 (2026-02-10)

**Security hardening and advanced features.**

### New Endpoints
- `GET /api/v1/intelligence/fees` — Fee prediction engine
- `GET /api/v1/intelligence/whales` — Whale transaction monitor
- `GET /api/v1/intelligence/risk/{addr}` — Address risk scoring
- `GET /api/v1/intelligence/network` — Network health dashboard
- `GET /api/v1/intelligence/consolidate/{addr}` — UTXO consolidation advisor
- `GET /api/v1/security/threat/{addr}` — YARA-pattern threat analysis
- `GET /api/v1/staking/status` — Staking tier check

### New Features
- Dual-facilitator x402: Base (Coinbase) + Solana (NLx402/PCEF)
- Encrypted responses (Curve25519 + XSalsa20-Poly1305)
- Wallet-based request signing with replay protection
- 8 YARA-style threat detection patterns
- Staking tiers with drip credit mechanics
- Comprehensive input validation
- Security headers (CSP, HSTS, X-Frame-Options)

---

## v1.0.0 (2026-02-10)

**Initial release: Core Bitcoin data API.**

### Endpoints
- `GET /api/v1` — API index
- `GET /api/v1/fees` — Current fee rates
- `GET /api/v1/mempool` — Mempool summary
- `GET /api/v1/address/{addr}` — Address balance and stats
- `GET /api/v1/address/{addr}/utxos` — Address UTXOs
- `GET /api/v1/address/{addr}/txs` — Transaction history
- `GET /api/v1/tx/{txid}` — Transaction details
- `GET /api/v1/tx/{txid}/status` — Confirmation status
- `POST /api/v1/tx/broadcast` — Broadcast raw transaction
- `GET /api/v1/block/{id}` — Block by height or hash

### Features
- x402 micropayment gating ($0.01–$0.05 per query)
- CORS for cross-origin agent access
- Rate limiting (100 req/min free tier)
- Error sanitization
