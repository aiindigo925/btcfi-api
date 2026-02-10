# @aiindigo/btcfi

TypeScript SDK for BTCFi API — Bitcoin + BTCFi data for AI agents via x402 micropayments.

## Install

```bash
npm install @aiindigo/btcfi
```

## Quick Start

```typescript
import { BTCFi } from '@aiindigo/btcfi';

const btcfi = new BTCFi();

// Get current fees
const fees = await btcfi.getFees();
console.log(fees.fees.recommended);

// Get Solv Protocol reserves
const reserves = await btcfi.getSolvReserves();
console.log(reserves.data.totalSolvBTC);

// Threat analysis
const threat = await btcfi.getThreatAnalysis('bc1q...');
console.log(threat.data.overallRisk);
```

## Configuration

```typescript
const btcfi = new BTCFi({
  baseUrl: 'https://btcfi.aiindigo.com', // default
  paymentNetwork: 'base',                // 'base' or 'solana'
  timeout: 30000,                        // ms
  retries: 2,                            // auto-retry on failure
  paymentHeaders: {                      // x402 payment proof
    'X-Payment': '<proof>',
  },
});
```

## Methods

### Core Bitcoin
| Method | Description | Price |
|--------|-------------|-------|
| `getFees()` | Recommended fee rates + USD estimates | $0.01 |
| `getMempool()` | Mempool summary + recent txs | $0.01 |
| `getAddress(addr)` | Address balance + stats | $0.01 |
| `getUtxos(addr)` | Unspent outputs | $0.01 |
| `getAddressTxs(addr)` | Transaction history | $0.01 |
| `getTx(txid)` | Transaction details | $0.01 |
| `getTxStatus(txid)` | Confirmation status | $0.01 |
| `broadcastTx(txHex)` | Broadcast signed tx | $0.05 |
| `getBlock(id)` | Block by height or hash | $0.01 |
| `getLatestBlocks(limit)` | Recent blocks | $0.01 |

### Intelligence
| Method | Description | Price |
|--------|-------------|-------|
| `getFeePrediction()` | AI fee prediction (1h/6h/24h) | $0.02 |
| `getWhaleAlerts()` | Large tx detection | $0.02 |
| `getAddressRisk(addr)` | Address risk scoring | $0.02 |
| `getNetworkHealth()` | Network health analysis | $0.02 |
| `getConsolidationAdvice(addr)` | UTXO consolidation advice | $0.02 |

### Security
| Method | Description | Price |
|--------|-------------|-------|
| `getThreatAnalysis(addr)` | YARA-pattern threat analysis | $0.02 |

### Solv Protocol (BTCFi)
| Method | Description | Price |
|--------|-------------|-------|
| `getSolvReserves()` | SolvBTC supply + chain breakdown + TVL | $0.02 |
| `getSolvYield()` | xSolvBTC APY + yield strategies | $0.02 |
| `getSolvLiquidity(chain?)` | Cross-chain liquidity distribution | $0.02 |
| `getSolvRisk()` | Multi-factor risk assessment | $0.02 |

### ZK Proofs
| Method | Description | Price |
|--------|-------------|-------|
| `generateBalanceProof(addr, threshold, unit?)` | Prove balance ≥ threshold | $0.03 |
| `generateAgeProof(addr, minBlocks)` | Prove UTXO age ≥ N blocks | $0.03 |
| `generateMembershipProof(addr, setRoot, proof)` | Prove address in set | $0.03 |
| `verifyProof(type, proof, publicInputs)` | Verify any ZK proof | $0.01 |

### Real-Time Streams
| Method | Description | Price |
|--------|-------------|-------|
| `stream({ channel?, min? })` | SSE stream (blocks, fees, whales) | $0.01 |

### System
| Method | Description | Price |
|--------|-------------|-------|
| `getStakingStatus(addr?)` | Staking tier check | Free |
| `getHealth()` | API + RPC health status | Free |
| `getApiIndex()` | Full API index | Free |

## Error Handling

```typescript
import { BTCFi, PaymentRequiredError, BTCFiError } from '@aiindigo/btcfi';

try {
  const fees = await btcfi.getFees();
} catch (error) {
  if (error instanceof PaymentRequiredError) {
    // x402 payment needed
    console.log(error.paymentRequirements);
  } else if (error instanceof BTCFiError) {
    console.log(error.statusCode, error.message);
  }
}
```

## Payment Networks

| Network | Facilitator | Fees |
|---------|-------------|------|
| Base (USDC) | Coinbase x402 | Zero (ERC-3009) |
| Solana (USDC) | NLx402 by PCEF | Zero (nonprofit) |

Set `X-Payment-Network: base` or `X-Payment-Network: solana` header.

## Examples

See `examples/` directory for runnable agent scripts:

```bash
npx tsx examples/fee-optimizer.ts
npx tsx examples/whale-watcher.ts
npx tsx examples/solv-yield-monitor.ts
npx tsx examples/threat-scanner.ts
npx tsx examples/portfolio-risk.ts
npx tsx examples/zk-trust-proof.ts
npx tsx examples/realtime-whale-alert.ts
```

## Links

- **API:** https://btcfi.aiindigo.com
- **MCP Server:** `@aiindigo/btcfi-mcp`
- **OpenAPI Spec:** https://btcfi.aiindigo.com/openapi.json
- **Built by:** [AI Indigo](https://aiindigo.com)
