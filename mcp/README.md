# @aiindigo/btcfi-mcp

MCP server for BTCFi API — Bitcoin + BTCFi data for AI agents via x402 micropayments.

27 tools for Bitcoin blockchain data, AI-powered intelligence, security analysis, Solv Protocol BTCFi data, ZK proofs, and real-time streams.

## Quick Start

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on Mac, `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": {
        "EVM_PRIVATE_KEY": "your-base-wallet-private-key",
        "PAYMENT_NETWORK": "base"
      }
    }
  }
}
```

Or with Solana (NLx402 — zero fees):

```json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": {
        "SVM_PRIVATE_KEY": "your-solana-private-key",
        "PAYMENT_NETWORK": "solana"
      }
    }
  }
}
```

### Programmatic

```bash
npm install @aiindigo/btcfi-mcp
```

```bash
EVM_PRIVATE_KEY=0x... npx @aiindigo/btcfi-mcp
```

## Tools

| Tool | Description | Price |
|------|-------------|-------|
| `btcfi_get_fees` | Current Bitcoin fee rates + USD estimates | $0.01 |
| `btcfi_get_mempool` | Mempool summary + recent txs | $0.01 |
| `btcfi_get_address` | Address balance + stats | $0.01 |
| `btcfi_get_utxos` | Unspent transaction outputs | $0.01 |
| `btcfi_get_address_txs` | Address transaction history | $0.01 |
| `btcfi_get_tx` | Transaction details | $0.01 |
| `btcfi_get_tx_status` | Transaction confirmation status | $0.01 |
| `btcfi_broadcast_tx` | Broadcast signed transaction | $0.05 |
| `btcfi_get_block` | Block by height or hash | $0.01 |
| `btcfi_get_latest_blocks` | Recent blocks | $0.01 |
| `btcfi_consolidation_advice` | UTXO consolidation advisor | $0.02 |
| `btcfi_fee_prediction` | AI fee prediction (1h/6h/24h) | $0.02 |
| `btcfi_whale_alert` | Large tx detection | $0.02 |
| `btcfi_address_risk` | Address risk scoring | $0.02 |
| `btcfi_network_health` | Network health dashboard | $0.02 |
| `btcfi_threat_analysis` | YARA-pattern threat detection | $0.02 |
| `btcfi_staking_status` | Staking tier check | free |
| `btcfi_solv_reserves` | SolvBTC supply + backing ratio | $0.02 |
| `btcfi_solv_yield` | xSolvBTC APY + strategies | $0.02 |
| `btcfi_solv_liquidity` | Cross-chain liquidity | $0.02 |
| `btcfi_solv_risk` | Multi-factor risk assessment | $0.02 |
| `btcfi_zk_balance_proof` | ZK proof: balance ≥ threshold | $0.03 |
| `btcfi_zk_age_proof` | ZK proof: UTXO age ≥ N blocks | $0.03 |
| `btcfi_zk_membership` | ZK proof: address in set | $0.03 |
| `btcfi_zk_verify` | Verify any ZK proof | $0.01 |
| `btcfi_health` | API health status | free |
| `btcfi_api_index` | Full API index | free |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `BTCFI_API_URL` | API base URL (default: https://btcfi.aiindigo.com) | No |
| `EVM_PRIVATE_KEY` | EVM private key for Base USDC payments | One of |
| `SVM_PRIVATE_KEY` | Solana private key for NLx402 payments | One of |
| `PAYMENT_NETWORK` | `base` or `solana` (default: base) | No |

## Payment Networks

- **Base** (Coinbase): ERC-3009 USDC settlement. Standard fees.
- **Solana** (NLx402): Nonce-locked, hash-bound. Zero facilitator fees via PCEF nonprofit.

## Links

- API: https://btcfi.aiindigo.com
- OpenAPI: https://btcfi.aiindigo.com/openapi.json
- x402 Manifest: https://btcfi.aiindigo.com/.well-known/x402-manifest.json
- Builder: [AI Indigo](https://aiindigo.com)
