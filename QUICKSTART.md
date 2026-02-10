# BTCFi API — Quickstart

Bitcoin data for agents. No tokens. Just ship.

## 30-Second Start (MCP for Claude Desktop)

```bash
npx @aiindigo/btcfi-mcp
```

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": {
        "EVM_PRIVATE_KEY": "your-key-for-auto-payment",
        "PAYMENT_NETWORK": "base"
      }
    }
  }
}
```

Ask Claude: *"What are current Bitcoin fees?"* — it works.

## SDK (TypeScript/Node)

```bash
npm install @aiindigo/btcfi
```

```typescript
import BTCFi from '@aiindigo/btcfi';

// Free tier (100 req/min, gets 402 on paid endpoints)
const btcfi = new BTCFi();

// Auto-pay tier (unlimited, auto-signs x402 payments)
const btcfi = new BTCFi({
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
  paymentNetwork: 'base', // or 'solana' with svmPrivateKey
});

// Get fees
const fees = await btcfi.getFees();
console.log(fees.estimate.fastest); // { satPerByte: 12, totalSats: 3000, usd: "2.85" }

// Address balance
const info = await btcfi.getAddress('bc1q...');
console.log(info.balance.confirmed.btc); // "0.5432"

// Threat analysis
const threat = await btcfi.getThreatAnalysis('1A1zP1...');
console.log(threat.data.threatLevel); // "clean"

// Solv reserves
const reserves = await btcfi.getSolvReserves();
console.log(reserves.reserves.totalSolvBTC); // "12,345.67"
```

## curl

```bash
# Free endpoints
curl https://btcfi.aiindigo.com/api/health
curl https://btcfi.aiindigo.com/api/v1

# Paid endpoints return 402 with payment instructions
curl https://btcfi.aiindigo.com/api/v1/fees
# → 402 { paymentRequirements: { amount: "0.01", network: "base", ... } }

# Pay with x402 header
curl -H "X-Payment: <base64-proof>" \
     -H "X-Payment-Network: base" \
     https://btcfi.aiindigo.com/api/v1/fees
```

## Pricing

| Tier | Price | Endpoints |
|------|-------|-----------|
| Core | $0.01 USDC | fees, mempool, address, tx, block |
| Intelligence | $0.02 USDC | fee prediction, whales, risk, network, consolidation |
| Security | $0.02 USDC | YARA threat analysis |
| Solv | $0.02 USDC | reserves, yield, liquidity, risk |
| ZK Proofs | $0.03 USDC | balance proof, age proof, membership proof |
| ZK Verify | $0.01 USDC | verify any proof |
| Streams | $0.01 USDC | real-time events, whale alerts (SSE) |
| Broadcast | $0.05 USDC | tx broadcast |
| System | Free | health, index, staking status |

Payment networks: **Base** (Coinbase x402, fee-free) and **Solana** (NLx402/PCEF, free).

## Agent Recipes

### Fee Optimizer Bot

```typescript
const btcfi = new BTCFi({ evmPrivateKey: '...' });

async function shouldSendNow() {
  const fees = await btcfi.getFees();
  const prediction = await btcfi.getFeePrediction();
  const currentFee = fees.fees.recommended.halfHourFee;
  return currentFee < 10; // sat/vB threshold
}
```

### Whale Alert Bot

```typescript
const btcfi = new BTCFi({ evmPrivateKey: '...' });

async function checkWhales() {
  const whales = await btcfi.getWhaleAlerts();
  for (const tx of whales.data.transactions || []) {
    console.log(`🐋 ${tx.valueBtc} BTC moved`);
  }
}
setInterval(checkWhales, 60_000);
```

### Portfolio Monitor

```typescript
const btcfi = new BTCFi({ evmPrivateKey: '...' });
const addresses = ['bc1q...', 'bc1q...'];

async function portfolioBalance() {
  const balances = await Promise.all(
    addresses.map(a => btcfi.getAddress(a))
  );
  const totalBtc = balances.reduce(
    (sum, b) => sum + parseFloat(b.balance.confirmed.btc), 0
  );
  console.log(`Total: ${totalBtc} BTC`);
}
```

## Wallet Signing (Higher Rate Limits)

Sign requests with your wallet for 500 req/min (vs 100 free):

```
X-Signature: base64(sign(METHOD:PATH:NONCE:TIMESTAMP))
X-Nonce: unique-per-request
X-Signer: your-wallet-address
X-Timestamp: unix-seconds
```

## Links

- API Docs: https://btcfi.aiindigo.com/api/v1
- OpenAPI Spec: https://btcfi.aiindigo.com/openapi.json
- MCP: `npx @aiindigo/btcfi-mcp`
- SDK: `npm install @aiindigo/btcfi`
- Security: [SECURITY.md](./SECURITY.md)

---

*Built by AI Indigo. No rugs. Just ships.*
