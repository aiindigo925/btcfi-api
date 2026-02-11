# @aiindigo/btcfi

TypeScript SDK for the [BTCFi API](https://btcfi.aiindigo.com) — Bitcoin data, intelligence, security, Solv Protocol, and ZK proofs via x402 micropayments.

## Install

```bash
npm install @aiindigo/btcfi
```

## Quick Start

```ts
import { BTCFi } from '@aiindigo/btcfi';

const btcfi = new BTCFi();

// Free endpoints
const health = await btcfi.getHealth();

// Paid endpoints (returns 402 PaymentRequiredError without payment)
const fees = await btcfi.getFees();

// Auto-pay with private key
const btcfiPaid = new BTCFi({
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,  // Base USDC
  // OR
  svmPrivateKey: process.env.SVM_PRIVATE_KEY,  // Solana USDC
});
const whales = await btcfiPaid.getWhaleAlerts();
```

## 28 Methods

### Core
| Method | Endpoint | Price |
|--------|----------|-------|
| `getFees()` | GET /api/v1/fees | $0.01 |
| `getMempool()` | GET /api/v1/mempool | $0.01 |
| `getAddress(addr)` | GET /api/v1/address/:addr | $0.01 |
| `getUtxos(addr)` | GET /api/v1/address/:addr/utxos | $0.01 |
| `getAddressTxs(addr)` | GET /api/v1/address/:addr/txs | $0.01 |
| `getTx(txid)` | GET /api/v1/tx/:txid | $0.01 |
| `getTxStatus(txid)` | GET /api/v1/tx/:txid/status | $0.01 |
| `broadcastTx(hex)` | POST /api/v1/tx/broadcast | $0.05 |
| `getBlock(id)` | GET /api/v1/block/:id | $0.01 |
| `getLatestBlocks(n)` | GET /api/v1/block/latest | $0.01 |

### Intelligence
| Method | Endpoint | Price |
|--------|----------|-------|
| `getConsolidationAdvice(addr)` | GET /api/v1/intelligence/consolidate/:addr | $0.02 |
| `getFeePrediction()` | GET /api/v1/intelligence/fees | $0.02 |
| `getWhaleAlerts()` | GET /api/v1/intelligence/whales | $0.02 |
| `getAddressRisk(addr)` | GET /api/v1/intelligence/risk/:addr | $0.02 |
| `getNetworkHealth()` | GET /api/v1/intelligence/network | $0.02 |

### Security
| Method | Endpoint | Price |
|--------|----------|-------|
| `getThreatAnalysis(addr)` | GET /api/v1/security/threat/:addr | $0.02 |

### Solv Protocol
| Method | Endpoint | Price |
|--------|----------|-------|
| `getSolvReserves()` | GET /api/v1/solv/reserves | $0.02 |
| `getSolvYield()` | GET /api/v1/solv/yield | $0.02 |
| `getSolvLiquidity(chain?)` | GET /api/v1/solv/liquidity | $0.02 |
| `getSolvRisk()` | GET /api/v1/solv/risk | $0.02 |

### ZK Proofs
| Method | Endpoint | Price |
|--------|----------|-------|
| `generateBalanceProof(addr, threshold, unit?)` | POST /api/v1/zk/balance-proof | $0.03 |
| `generateAgeProof(addr, minBlocks)` | POST /api/v1/zk/age-proof | $0.03 |
| `generateMembershipProof(addr, root, proof)` | POST /api/v1/zk/membership | $0.03 |
| `verifyProof(type, proof, inputs)` | POST /api/v1/zk/verify | $0.01 |

### Streams & System
| Method | Endpoint | Price |
|--------|----------|-------|
| `stream({ channel, min })` | GET /api/v1/stream | $0.01 |
| `getStakingStatus(addr?)` | GET /api/v1/staking/status | free |
| `getHealth()` | GET /api/health | free |
| `getApiIndex()` | GET /api/v1 | free |

## Payment Networks

| Network | Facilitator | Fees |
|---------|------------|------|
| Base | Coinbase x402 (ERC-3009) | Zero |
| Solana | NLx402 (PCEF nonprofit) | Zero |

## Real-Time Streams

```ts
const es = btcfi.stream({ channel: 'whales', min: 100 });
es.onmessage = (e) => console.log(JSON.parse(e.data));
es.onerror = () => es.close();
```

## Error Handling

```ts
import { BTCFi, PaymentRequiredError } from '@aiindigo/btcfi';

try {
  const fees = await btcfi.getFees();
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    console.log('Pay:', e.paymentRequirements);
  }
}
```

## License

MIT — [AI Indigo](https://aiindigo.com)
