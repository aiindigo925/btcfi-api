# @aiindigo/btcfi

TypeScript SDK for the [BTCFi API](https://btcfi.aiindigo.com) — Bitcoin data, intelligence, on-chain signals, ZK proofs, and x402 micropayments.

## Install

```bash
npm install @aiindigo/btcfi
```

## Quick Start

```ts
import { BTCFi } from '@aiindigo/btcfi';

// Basic usage (free endpoints work without API key)
const client = new BTCFi();

// With API key for paid endpoints
const client = new BTCFi({ apiKey: 'btcfi_xxx' });

// With x402 auto-payment enabled
const client = new BTCFi({
  apiKey: 'btcfi_xxx',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,  // Base USDC
  // OR
  svmPrivateKey: process.env.SVM_PRIVATE_KEY,  // Solana USDC
});
```

## API Modules

### Address — Balance, UTXOs, Transaction History

```ts
const balance = await client.address.getBalance('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
console.log(balance.balance.confirmed.btc); // "50.00000000"
console.log(balance.stats.txCount);         // 1

const utxos = await client.address.getUtxos('1A1zP1...');
console.log(utxos.summary.totalBtc);        // "50.00000000"

const history = await client.address.getTxHistory('1A1zP1...');
history.transactions.forEach(tx => console.log(tx.txid));
```

### Fees — Estimation & Recommendations

```ts
const fees = await client.fees.recommended();
console.log(fees.fees.fastestFee);  // sat/vB for fastest confirmation

const estimate = await client.fees.estimate();
console.log(estimate.estimate.fastest.usd);  // "$0.45"
console.log(estimate.price.btcUsd);          // 104500.00
```

### Mempool — Network State

```ts
const mempool = await client.mempool.recent();
console.log(mempool.mempool.count);     // 45000
console.log(mempool.mempool.vsizeMB);   // "15.2"
console.log(mempool.recentTxs.length);  // recent transactions
```

### Block — Blockchain Queries

```ts
const latest = await client.block.latest();
console.log(latest.blocks[0].height);   // latest block height

const block = await client.block.get(800000);  // by height
const block = await client.block.get('00000000000000000002...');  // by hash
```

### Whales — Large Transaction Tracking

```ts
// List whale transactions (min 100 BTC)
const whales = await client.whales.list(100);
whales.whales.forEach(w => console.log(`${w.amountBtc} BTC: ${w.from} → ${w.to}`));

// On-chain signals
const signals = await client.whales.signals();
const mvrv = await client.whales.mvrv();
const sopr = await client.whales.sopr();

// Real-time SSE subscription
const unsubscribe = client.whales.subscribe((event) => {
  console.log(`🐋 Whale alert: ${event.data.amountBtc} BTC moved`);
});

// Later, to stop:
unsubscribe();
```

### Intelligence — Risk & Entity Analysis

```ts
// Address risk scoring
const risk = await client.intelligence.risk('1A1zP1...');
console.log(risk.data.overallScore);    // 0-100
console.log(risk.data.threatLevel);     // "low" | "medium" | "high" | "critical"

// Entity identification
const entity = await client.intelligence.entity('3Kzh9...');
console.log(entity.data.entity);        // "Binance" | "Coinbase" | ...
console.log(entity.data.confidence);    // 0.95

// Portfolio analysis across multiple addresses
const portfolio = await client.intelligence.portfolio(['1A1zP1...', '3J98t1...']);
console.log(portfolio.data.totalBalance.btc);
```

### ZK Proofs — Zero-Knowledge Verification

```ts
// Prove balance without revealing exact amount
const balanceProof = await client.zk.proofBalance('1A1zP1...', 1_000_000); // 0.01 BTC
console.log(balanceProof.verified);     // true
console.log(balanceProof.proofTimeMs);  // generation time

// Prove account age
const ageProof = await client.zk.proofAge('1A1zP1...', 365); // 1 year
console.log(ageProof.publicInputs);

// Verify any proof
const result = await client.zk.verifyProof('balance', balanceProof.proof, balanceProof.publicInputs);
console.log(result.verified);
```

### Batch — Multi-Address Operations

```ts
const addresses = ['1A1zP1...', '3J98t1...', 'bc1q...'];

const info = await client.batch.addresses(addresses);
info.results.forEach(r => console.log(r.address, r.balance?.btc));

const risks = await client.batch.risk(addresses);
risks.results.forEach(r => console.log(r.address, r.riskScore, r.threatLevel));

const entities = await client.batch.entities(addresses);
entities.results.forEach(r => console.log(r.address, r.entity));
```

### Webhooks — Event Notifications

```ts
// Create a webhook
const { webhook } = await client.webhooks.create('https://example.com/hooks', [
  'whale_transaction',
  'block_new',
  'mempool_alert',
]);
console.log(webhook.id); // "wh_abc123"

// List all webhooks
const { webhooks } = await client.webhooks.list();
webhooks.forEach(w => console.log(w.id, w.url, w.active));

// Delete a webhook
await client.webhooks.delete('wh_abc123');
```

## Features

### Automatic Retry with Exponential Backoff

All requests are automatically retried up to 3 times with exponential backoff and jitter for network errors and 5xx server responses.

```ts
const client = new BTCFi({
  retries: 5,           // max retry attempts (default: 3)
  retryBaseDelay: 1000, // base delay in ms (default: 500)
  timeout: 15000,       // request timeout in ms (default: 30000)
});
```

### Rate Limiting

Built-in client-side rate limiter respects your tier quota. Exceeding the limit throws `RateLimitError`.

```ts
const client = new BTCFi({ rateLimit: 30 }); // 30 requests/minute

console.log(client.rateLimitInfo);
// { used: 5, limit: 30, resetInMs: 45000 }
```

### x402 Payment Auto-Handling

When a private key is configured, the SDK automatically intercepts 402 responses, builds a payment proof, and retries with the payment attached.

```ts
const client = new BTCFi({
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
  paymentNetwork: 'base', // or 'solana'
});
```

### Error Handling

```ts
import { BTCFi, PaymentRequiredError, RateLimitError, MaxRetriesError } from '@aiindigo/btcfi';

try {
  const data = await client.address.getBalance('1A1zP1...');
} catch (e) {
  if (e instanceof PaymentRequiredError) {
    console.log('Payment required:', e.paymentRequirements);
  } else if (e instanceof RateLimitError) {
    console.log('Rate limited, retry after:', e.retryAfterMs, 'ms');
  } else if (e instanceof MaxRetriesError) {
    console.log('All retries failed after', e.attempts, 'attempts');
  }
}
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | — | API key for authenticated requests |
| `baseUrl` | `string` | `https://btcfi.aiindigo.com` | API base URL |
| `paymentNetwork` | `'base' \| 'solana'` | `'base'` | x402 payment network |
| `evmPrivateKey` | `string` | — | EVM private key for Base auto-pay |
| `svmPrivateKey` | `string` | — | Solana private key for auto-pay |
| `timeout` | `number` | `30000` | Request timeout (ms) |
| `retries` | `number` | `3` | Max retry attempts |
| `retryBaseDelay` | `number` | `500` | Base delay for exponential backoff (ms) |
| `rateLimit` | `number` | `60` | Max requests per minute |
| `headers` | `Record<string, string>` | `{}` | Custom request headers |

## License

MIT — [AI Indigo](https://aiindigo.com)
