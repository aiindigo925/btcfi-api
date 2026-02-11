# BTCFi API — Master Plan 5 (MP5)

**Title:** BTCFi Expansion — Distribution, Retention, Multi-Chain
**Created:** 2026-02-11
**Status:** Planning
**Depends on:** MP0–MP4 (complete)
**Total Tasks:** 42
**Estimated Effort:** 6 phases, ~2 weeks

---

## Overview

MP5 expands BTCFi from a Bitcoin-only API into a multi-channel, multi-chain intelligence platform. Each phase is ordered by impact-to-effort ratio — ship the highest-leverage features first.

**Goals:**
- Grow organic reach via automated content channels
- Convert one-time users into daily active users
- Enable remote AI agent connections without local install
- Expand data coverage beyond Bitcoin
- Dogfood the FutureTools AI marketplace
- Ship Chrome extension for mainstream adoption

---

## Phase 1 — Whale Alert Telegram Channel (5 tasks)

**Why first:** 30 minutes of work, compounds daily. Whale channels grow organically — people share big moves. Every post links back to the BTCFi ecosystem.

**Channel:** @BTCFi_Whales (public, broadcast-only)

| # | Task | Details |
|---|------|---------|
| 1.1 | Create Telegram channel | @BTCFi_Whales, public, set description + avatar + pinned intro |
| 1.2 | Add channel posting to bot | New lib function `postWhaleAlert(channelId, whale)` using grammY `bot.api.sendMessage` |
| 1.3 | Create Vercel Cron job | `/api/cron/whales` — runs every 15 min, calls `/api/v1/intelligence/whales`, posts new txs above threshold (e.g. >10 BTC) |
| 1.4 | Deduplicate alerts | Track posted txids in Upstash Redis with 24h TTL to avoid duplicate posts |
| 1.5 | Add ecosystem footer to channel posts | Every alert includes links: btcfi.aiindigo.com, aiindigo.com, futuretoolsai.com, openclawterrace.com |

**Post format:**
```
🐋 WHALE ALERT

💰 142.5 BTC ($14,250,000)
📄 TX: abc123def456...
⏱ 2 minutes ago
📊 Fee: 12 sat/vB

—
🔗 btcfi.aiindigo.com | @BTC_Fi_Bot
AI Indigo | FutureTools AI | OpenClaw Terrace
```

**Env vars:** `WHALE_CHANNEL_ID` (Telegram channel chat ID)
**Cron config:** Add to `vercel.json`: `{ "path": "/api/cron/whales", "schedule": "*/15 * * * *" }`

**Files to create/modify:**
- `src/app/api/cron/whales/route.ts` (new)
- `src/lib/telegram-bot.ts` (add channel posting function)
- `vercel.json` (add cron entry)

---

## Phase 2 — Portfolio Tracker / Watch Alerts (8 tasks)

**Why second:** Turns one-time users into daily active users. People who watch addresses come back every day. Uses Upstash Redis (already in stack).

**Commands:** `/watch <addr>`, `/unwatch <addr>`, `/watchlist`, `/alerts on|off`

| # | Task | Details |
|---|------|---------|
| 2.1 | Design Redis schema | `watch:{chatId}` → Set of addresses. `watchers:{addr}` → Set of chatIds. `balance:{addr}` → last known balance |
| 2.2 | Add `/watch` command | Validates address, stores in Redis, confirms to user. Max 5 addresses per user (free tier) |
| 2.3 | Add `/unwatch` command | Removes address from user's watchlist |
| 2.4 | Add `/watchlist` command | Shows all watched addresses with current balances |
| 2.5 | Add `/alerts` command | Toggle DM notifications on/off |
| 2.6 | Create balance check cron | `/api/cron/watchlist` — runs every 10 min, checks balances for all watched addresses |
| 2.7 | Send balance change alerts | Compare with stored balance, DM user if changed: "📍 bc1q... balance changed: +0.5 BTC ($50,000)" |
| 2.8 | Add risk change alerts | If risk score changes by >10 points, alert the watcher |

**Alert format:**
```
📍 Address Alert

bc1q7cyf...xyz
💰 Balance: 2.5 BTC → 3.0 BTC (+0.5 BTC)
💵 Value: ~$300,000
📊 New TX detected

—
🔗 /address bc1q7cyf...xyz for details
```

**Env vars:** None new (Upstash Redis already configured)
**Cron config:** `{ "path": "/api/cron/watchlist", "schedule": "*/10 * * * *" }`

**Files to create/modify:**
- `src/lib/watchlist.ts` (new — Redis operations)
- `src/lib/telegram-bot.ts` (add /watch, /unwatch, /watchlist, /alerts commands)
- `src/app/api/cron/watchlist/route.ts` (new)
- `vercel.json` (add cron entry)

---

## Phase 3 — Hosted MCP (Streamable HTTP) (7 tasks)

**Why third:** Unlocks remote AI agent connections without `npx`. Every MCP client (Claude, ChatGPT, Cursor, Windsurf) can connect via URL. Also unlocks Smithery listing.

**Endpoint:** `POST /api/mcp` (Streamable HTTP transport)

| # | Task | Details |
|---|------|---------|
| 3.1 | Install MCP SDK server deps | Add `@modelcontextprotocol/sdk` to main package.json |
| 3.2 | Create MCP HTTP handler | `/api/mcp/route.ts` — implements Streamable HTTP transport per MCP spec |
| 3.3 | Port tool definitions | Reuse tool definitions from `mcp/src/index.ts`, adapt for HTTP context |
| 3.4 | Handle session management | MCP session headers, initialization, tool listing, tool calling |
| 3.5 | Add x402 payment bypass for MCP | Internal key or free tier for MCP tool calls (same as Telegram bot pattern) |
| 3.6 | Submit to Smithery | Now have HTTPS endpoint: `https://btcfi.aiindigo.com/api/mcp` |
| 3.7 | Update README and docs | Document hosted MCP endpoint, add to ROADMAP and CHANGELOG |

**MCP client config (for users):**
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

**Files to create/modify:**
- `src/app/api/mcp/route.ts` (new)
- `src/lib/mcp-tools.ts` (new — shared tool definitions)
- `src/middleware.ts` (add `/api/mcp` to free paths or internal bypass)
- `mcp/server.json` (add remote transport option)
- `README.md`, `docs/CHANGELOG.md`, `docs/ROADMAP.md`

---

## Phase 4 — Multi-Chain Expansion (8 tasks)

**Why fourth:** Your audience lives across BTC, ETH, SOL. Same x402 payment model, same MCP tools — more data sources. Start with gas/fee data (identical infrastructure pattern), then expand.

**New endpoint groups:**
- `/api/v1/eth/*` — Ethereum data
- `/api/v1/sol/*` — Solana data

| # | Task | Details |
|---|------|---------|
| 4.1 | Add ETH RPC provider | Alchemy/Infura free tier, add to `src/lib/rpc.ts` with failover |
| 4.2 | ETH gas endpoint | `GET /api/v1/eth/gas` — base fee, priority fee, gas price in gwei + USD |
| 4.3 | ETH address endpoint | `GET /api/v1/eth/address/{addr}` — ETH balance, token balances, tx count |
| 4.4 | ETH tx endpoint | `GET /api/v1/eth/tx/{hash}` — transaction details, status, gas used |
| 4.5 | Add SOL RPC provider | Helius/QuickNode free tier, add to `src/lib/rpc.ts` |
| 4.6 | SOL fees endpoint | `GET /api/v1/sol/fees` — priority fees, recent slot, TPS |
| 4.7 | SOL address endpoint | `GET /api/v1/sol/address/{addr}` — SOL balance, token accounts |
| 4.8 | Add multi-chain to Telegram bot | `/eth_gas`, `/sol_fees`, `/eth_address`, `/sol_address` commands |

**Pricing:** Same as BTC endpoints — $0.01 core, $0.02 intelligence
**x402 payment:** Same USDC on Base/Solana — no changes needed

**Files to create/modify:**
- `src/lib/ethereum.ts` (new)
- `src/lib/solana.ts` (new)
- `src/app/api/v1/eth/gas/route.ts` (new)
- `src/app/api/v1/eth/address/[addr]/route.ts` (new)
- `src/app/api/v1/eth/tx/[hash]/route.ts` (new)
- `src/app/api/v1/sol/fees/route.ts` (new)
- `src/app/api/v1/sol/address/[addr]/route.ts` (new)
- `src/lib/telegram-bot.ts` (add new commands)
- `src/lib/x402.ts` (add pricing for new paths)
- `src/middleware.ts` (no changes — paths auto-handled)
- MCP tools (add to both stdio and HTTP server)

**Env vars:** `ETH_RPC_URL`, `SOL_RPC_URL`

---

## Phase 5 — FutureTools AI Marketplace Listing (6 tasks)

**Why fifth:** Dogfood your own marketplace. BTCFi becomes the flagship paid agent on futuretoolsai.com. Demonstrates the business model to other developers.

| # | Task | Details |
|---|------|---------|
| 5.1 | Create BTCFi agent listing | Title, description, pricing, screenshots, demo video link |
| 5.2 | Add "Try it" integration | Embed Telegram bot or MCP connection as try-before-you-buy |
| 5.3 | Write agent documentation | Getting started guide, use cases, code examples |
| 5.4 | Create landing page section | Featured agent showcase on futuretoolsai.com homepage |
| 5.5 | Add analytics tracking | Track referrals from FutureTools AI to btcfi.aiindigo.com |
| 5.6 | Cross-link from BTCFi | Add "Available on FutureTools AI" badge to btcfi.aiindigo.com |

**Files to modify:**
- `futuretoolsai.com` repo (agent listing pages)
- `btcfi` repo (badge on landing page)
- `README.md` (add FutureTools AI link)

---

## Phase 6 — Chrome Extension (8 tasks)

**Why last:** Highest effort, needs Chrome Web Store review (~1-5 days). But permanent distribution — once listed, it grows via search.

**Features:** Price badge in toolbar, right-click address lookup, whale alert notifications, fee calculator popup.

| # | Task | Details |
|---|------|---------|
| 6.1 | Scaffold extension | `manifest.json` (Manifest V3), popup, background service worker, content script |
| 6.2 | Price badge | Background script polls `/api/v1/fees` every 60s, shows BTC price in toolbar badge |
| 6.3 | Popup UI | Click badge → popup with price, fees, mempool summary. Clean dark UI matching BTCFi brand |
| 6.4 | Context menu: address lookup | Right-click any selected text → "Lookup on BTCFi" → popup with balance + risk |
| 6.5 | Content script: address detection | Detect BTC addresses on any page, add hover tooltip with balance |
| 6.6 | Whale alert notifications | Background script checks whales every 5 min, sends Chrome notification for big moves |
| 6.7 | Extension options page | Settings: notification threshold, price alert targets, dark/light theme |
| 6.8 | Chrome Web Store submission | Screenshots, description, privacy policy, submit for review |

**Tech stack:** Vanilla JS/HTML/CSS (no framework needed for extension), Manifest V3
**Permissions:** `activeTab`, `contextMenus`, `notifications`, `storage`, `alarms`

**Files to create:**
- `extension/manifest.json`
- `extension/popup.html` + `popup.js` + `popup.css`
- `extension/background.js`
- `extension/content.js`
- `extension/options.html` + `options.js`
- `extension/icons/` (16, 48, 128px)

---

## Summary

| Phase | Feature | Tasks | Impact | Effort |
|-------|---------|-------|--------|--------|
| 1 | Whale Alert Channel | 5 | 🔥🔥🔥🔥🔥 | ⚡ Low |
| 2 | Portfolio Tracker | 8 | 🔥🔥🔥🔥 | ⚡⚡ Medium |
| 3 | Hosted MCP | 7 | 🔥🔥🔥🔥 | ⚡⚡ Medium |
| 4 | Multi-Chain | 8 | 🔥🔥🔥 | ⚡⚡⚡ High |
| 5 | FutureTools Listing | 6 | 🔥🔥🔥 | ⚡ Low |
| 6 | Chrome Extension | 8 | 🔥🔥🔥 | ⚡⚡⚡ High |
| **Total** | | **42** | | |

---

## Dependencies & Env Vars

**New env vars needed:**
- `WHALE_CHANNEL_ID` — Telegram channel chat ID for whale alerts
- `ETH_RPC_URL` — Ethereum RPC endpoint (Alchemy/Infura)
- `SOL_RPC_URL` — Solana RPC endpoint (Helius/QuickNode)

**Existing deps used:**
- Upstash Redis (watchlist storage, txid dedup)
- grammY (bot + channel posting)
- Vercel Cron (whale alerts, watchlist checks)
- x402 middleware (payment for new chain endpoints)

**New npm deps:**
- `@modelcontextprotocol/sdk` (Phase 3 — hosted MCP)
- `ethers` (Phase 4 — already installed)
- `@solana/web3.js` (Phase 4 — Solana RPC)

---

## Revenue Model

| Channel | Revenue | Growth |
|---------|---------|--------|
| API (x402) | Direct — $0.01–$0.05/query | Developers + AI agents pay per query |
| Telegram Bot | Indirect — free, drives API adoption | Organic growth via whale channel |
| MCP (stdio) | Direct — agents pay x402 | Claude/ChatGPT/Cursor users |
| MCP (hosted) | Direct — agents pay x402 | Zero-install, URL-based connection |
| Chrome Extension | Indirect — free, drives API adoption | Chrome Web Store distribution |
| FutureTools AI | Direct — marketplace fees | Flagship agent listing |

---

## Execution Order

```
Phase 1 (Whale Channel)     → Ship in 1 session
Phase 2 (Portfolio Tracker)  → Ship in 1–2 sessions
Phase 3 (Hosted MCP)         → Ship in 1 session
Phase 4 (Multi-Chain)        → Ship in 2–3 sessions
Phase 5 (FutureTools)        → Ship in 1 session
Phase 6 (Chrome Extension)   → Ship in 2 sessions
```

---

*No token. No rugs. Just ships.* 🚀
