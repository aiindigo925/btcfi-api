# Registry & Directory Submissions — BTCFi MCP Server

**Server:** `@aiindigo/btcfi-mcp` v3.0.1  
**Endpoint:** https://btcfi.aiindigo.com/mcp  
**Repo:** https://github.com/aiindigo925/btcfi-api  
**License:** MIT  
**Date prepared:** 2026-06-14

---

## Files Prepared

| File | Purpose |
|------|---------|
| `mcp/server.json` | Official MCP Registry format (modelcontextprotocol.io) |
| `mcp/registry/smithery.json` | Smithery.ai submission format |

---

## 1. Official MCP Registry (modelcontextprotocol.io)

**What:** The canonical MCP server directory maintained by the MCP team.

**Submission method:** PR to `modelcontextprotocol/servers` repo.

### Steps:

1. **Fork** https://github.com/modelcontextprotocol/servers
2. **Add** `btcfi.json` to the `servers/` directory with content from `mcp/server.json`
3. **Submit PR** with title: `Add BTCFi API — 27 Bitcoin tools with x402 micropayments`
4. **PR description:**
   ```
   ## BTCFi API MCP Server
   
   Bitcoin intelligence for AI agents. 27 tools covering blockchain data,
   AI-powered analytics, security analysis, Solv Protocol BTCFi, ZK proofs,
   and real-time streams.
   
   ### Features
   - 27 tools across 7 categories (core, intelligence, security, staking, solv, zk, system)
   - x402 micropayments ($0.01–$0.05/query) — no API keys needed
   - Free tier: 100 calls/day per IP
   - ZK proofs for private balance/age/set membership verification
   - AI fee prediction, whale detection, address risk scoring
   - Cross-chain SolvBTC data (Ethereum, BNB, Arbitrum)
   - Auto-payment via Base (Coinbase) or Solana (NLx402, zero fees)
   
   ### Package
   ```bash
   npx @aiindigo/btcfi-mcp
   ```
   
   ### Links
   - Website: https://btcfi.aiindigo.com
   - OpenAPI: https://btcfi.aiindigo.com/openapi.json
   - GitHub: https://github.com/aiindigo925/btcfi-api
   ```

### URL:
- https://github.com/modelcontextprotocol/servers

---

## 2. Smithery.ai

**What:** Popular MCP server directory with install scripts and auto-configuration.

**Submission method:** Submit via https://smithery.ai/submit or PR.

### Steps:

1. **Go to** https://smithery.ai/submit
2. **Paste** the contents of `mcp/registry/smithery.json`
3. **Or** fork https://github.com/nicholasgriffintn/mcp-registry and add entry
4. **Verify** the install command works: `npx @aiindigo/btcfi-mcp`

### Auto-install URL (after approval):
```
npx @aiindigo/btcfi-mcp
```

### URL:
- https://smithery.ai/server/io.github.aiindigo925/btcfi (after approval)

---

## 3. Glama MCP Directory

**What:** AI-focused MCP server directory at glama.ai.

**Submission method:** Submit via their website.

### Steps:

1. **Go to** https://glama.ai/mcp/servers
2. **Click** "Submit MCP Server"
3. **Fill in:**
   - **Name:** BTCFi API
   - **Description:** Bitcoin intelligence for AI agents — 27 tools with x402 micropayments
   - **GitHub URL:** https://github.com/aiindigo925/btcfi-api
   - **Install command:** `npx @aiindigo/btcfi-mcp`
   - **Categories:** Blockchain, Finance, AI Agents

### URL:
- https://glama.ai/mcp/servers (after approval)

---

## 4. Composio.dev

**What:** AI agent tooling platform with MCP server registry.

**Submission method:** Submit via their website or GitHub.

### Steps:

1. **Go to** https://app.composio.dev/tools?category=MCP
2. **Click** "Submit Tool"
3. **Fill in:**
   - **Name:** BTCFi API
   - **Description:** Bitcoin intelligence for AI agents — 27 tools for blockchain data, AI analytics, security, Solv Protocol, ZK proofs, with x402 micropayments
   - **GitHub URL:** https://github.com/aiindigo925/btcfi-api
   - **NPM package:** @aiindigo/btcfi-mcp

### URL:
- https://app.composio.dev/tools?category=MCP (after approval)

---

## 5. Toolbase (gettoolbase.com)

**What:** MCP server directory and management tool.

**Submission method:** Submit via their website.

### Steps:

1. **Go to** https://gettoolbase.com/submit
2. **Fill in:**
   - **Name:** BTCFi API
   - **Description:** Bitcoin intelligence for AI agents — 27 tools with x402 micropayments
   - **GitHub URL:** https://github.com/aiindigo925/btcfi-api
   - **Install:** `npx @aiindigo/btcfi-mcp`

### URL:
- https://gettoolbase.com (after approval)

---

## 6. mcp.so

**What:** Community MCP server directory.

**Submission method:** Submit via their website or GitHub.

### Steps:

1. **Go to** https://mcp.so
2. **Click** "Submit" or "Add Server"
3. **Fill in:**
   - **Name:** BTCFi API
   - **Description:** Bitcoin intelligence for AI agents — 27 tools with x402 micropayments
   - **GitHub URL:** https://github.com/aiindigo925/btcfi-api
   - **Install:** `npx @aiindigo/btcfi-mcp`

### URL:
- https://mcp.so (after approval)

---

## 7. NPM Package Listing (already done)

**What:** The NPM package itself serves as a registry entry.

### Steps:

1. **Publish** to npm (if not already):
   ```bash
   cd mcp && npm publish
   ```
2. **Verify** it appears on npmjs.com:
   - https://www.npmjs.com/package/@aiindigo/btcfi-mcp

### URL:
- https://www.npmjs.com/package/@aiindigo/btcfi-mcp

---

## 8. GitHub MCP Server Discovery

**What:** GitHub's own MCP server discovery at github.com/modelcontextprotocol.

### Steps:

1. **Ensure** the repo has the MCP topic: `mcp`
2. **Ensure** the repo description mentions MCP
3. **Submit** to the official `modelcontextprotocol/servers` list (step 1 above)

### URL:
- https://github.com/aiindigo925/btcfi-api

---

## 9. Open Source AI Directories

### a) AI Tooling Directory (aitooling.com)
- Go to https://aitooling.com/submit
- Add BTCFi API with GitHub URL

### b) Futurepedia (futurepedia.io)
- Go to https://futurepedia.io/submit-tool
- Add BTCFi API

### c) There's an AI For That (theresanaiforthat.com)
- Go to https://theresanaiforthat.com/submit/
- Category: Development / Coding
- Add BTCFi API

### d) AI Scout (aiscout.net)
- Submit via their directory

---

## 10. Bitcoin/DeFi Communities

### a) bitcoin.dev
- Suggest adding to https://bitcoin.dev/en/resources at the development resources section

### b) BTCFi Ecosystem
- Submit to Solv Protocol's ecosystem page: https://solv.finance/ecosystem
- Mention BTCPay Server integration if applicable

---

## 11. x402 Ecosystem

### a) x402 Community
- Submit to x402 server list at https://x402.org
- PR to x402 documentation if they have a server registry

---

## 12. Claude Desktop / Cursor / Windsurf Integration

### Claude Desktop
Already documented in mcp/README.md. Users can add:
```json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"]
    }
  }
}
```

### Cursor
Add to `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"]
    }
  }
}
```

### Windsurf
Add to `.windsurfrules` or MCP config:
```json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"]
    }
  }
}
```

---

## Priority Order (Recommended)

1. **Official MCP Registry** (modelcontextprotocol/servers) — highest visibility
2. **NPM publish** — enables all `npx` install commands
3. **Smithery.ai** — most popular MCP directory
4. **Glama.ai** — AI-focused directory
5. **mcp.so** — community directory
6. **Composio.dev** — AI agent platform
7. **Open source AI directories** — broader reach
8. **Bitcoin/DeFi communities** — targeted audience

---

## Quick Reference: All URLs

| Registry | Submission URL | Status |
|----------|---------------|--------|
| Official MCP Registry | https://github.com/modelcontextprotocol/servers | **Fork & PR needed** |
| Smithery | https://smithery.ai/submit | **Submit needed** |
| Glama | https://glama.ai/mcp/servers | **Submit needed** |
| Composio | https://app.composio.dev/tools?category=MCP | **Submit needed** |
| Toolbase | https://gettoolbase.com/submit | **Submit needed** |
| mcp.so | https://mcp.so | **Submit needed** |
| NPM | https://www.npmjs.com/package/@aiindigo/btcfi-mcp | **Publish needed** |
| AI Tooling | https://aitooling.com/submit | **Submit needed** |
| Futurepedia | https://futurepedia.io/submit-tool | **Submit needed** |
| There's an AI For That | https://theresanaiforthat.com/submit/ | **Submit needed** |
| x402 | https://x402.org | **Submit needed** |
