---
title: "Reddit Post for r/SaaS"
type: "reddit-post"
target: "r/SaaS"
date: 2026-06-14
---

# Reddit Post: r/SaaS

---

**Title:** I built a Bitcoin API with 45 endpoints and AI agents pay per query via HTTP 402

---

Hey r/SaaS — build in public update.

I've been building [btcfi.aiindigo.com](https://btcfi.aiindigo.com), a Bitcoin intelligence API designed for AI agents. Here's where things stand:

**The product:**
- 45 API endpoints covering Bitcoin, Ethereum, and Solana
- Pricing: $0.01–$0.05 per query (USDC micropayments)
- No API keys, no subscriptions, no signup
- Free tier: 100 calls/day, no auth required

**What makes it different:**
- Uses HTTP 402 (Payment Required) as an actual protocol — agents pay per query, not per month
- Built-in MCP server so Claude/GPT/Gemini can use it as a tool natively
- `llms.txt` for AI agent discovery (any agent can find and use the API)
- Zero-knowledge proofs for privacy-preserving verification
- YARA-pattern threat analysis on address transaction histories

**Metrics so far:**
- 45 endpoints across 9 categories
- 27 MCP tools registered
- 28 SDK methods
- Dual payment networks (Base + Solana)
- Free Telegram bot with 15 commands
- MIT licensed, fully open source

**Stack:** Next.js on Vercel, mempool.space + Blockstream for Bitcoin data, x402 micropayments via Coinbase facilitator.

**What I learned:**
The x402 payment model is genuinely better for API businesses than subscriptions. Agents don't want monthly plans — they want to pay $0.01 when they need data. Conversion is frictionless when there's no signup.

**What's next:**
- Compiled ZK circuits (currently simulated Groth16)
- Lightning Network data
- Ordinals/BRC-20 support

Happy to answer questions about the architecture, x402 integration, or building for AI agents.

**Repo:** [github.com/aiindigo925/btcfi-api](https://github.com/aiindigo925/btcfi-api)  
**Live:** [btcfi.aiindigo.com](https://btcfi.aiindigo.com)

---

*Tags: bitcoin, api, micropayments, ai-agents, x402, build-in-public, saas*
