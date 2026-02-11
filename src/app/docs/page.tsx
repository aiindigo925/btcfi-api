/**
 * Documentation Site — Task 20
 * Comprehensive BTCFi API documentation
 */

import Link from 'next/link';

const css = {
  container: { maxWidth: '800px', margin: '0 auto', padding: '40px 24px' } as React.CSSProperties,
  h1: { fontSize: '32px', fontWeight: 700, color: '#f7931a', marginBottom: '8px' },
  h2: { fontSize: '22px', fontWeight: 600, color: '#fff', marginTop: '48px', marginBottom: '16px', borderBottom: '1px solid #222', paddingBottom: '8px' },
  h3: { fontSize: '16px', fontWeight: 600, color: '#f7931a', marginTop: '32px', marginBottom: '8px' },
  p: { color: '#aaa', fontSize: '14px', lineHeight: '1.7', marginBottom: '16px' },
  code: { background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#ccc', display: 'block' as const, overflowX: 'auto' as const, whiteSpace: 'pre' as const, marginBottom: '16px' },
  inline: { background: '#111', border: '1px solid #222', borderRadius: '4px', padding: '2px 6px', fontSize: '12px', color: '#f7931a', fontFamily: 'monospace' },
  table: { width: '100%', borderCollapse: 'collapse' as const, marginBottom: '16px', fontSize: '13px' },
  th: { textAlign: 'left' as const, padding: '8px 12px', borderBottom: '2px solid #222', color: '#888', fontSize: '11px', textTransform: 'uppercase' as const },
  td: { padding: '8px 12px', borderBottom: '1px solid #1a1a1a', color: '#ccc' },
  tdCode: { padding: '8px 12px', borderBottom: '1px solid #1a1a1a', color: '#f7931a', fontFamily: 'monospace', fontSize: '12px' },
  nav: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px', marginBottom: '32px' },
  navLink: { color: '#888', textDecoration: 'none', fontSize: '13px', display: 'block', padding: '4px 0' },
  badge: { display: 'inline-block', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' },
  link: { color: '#f7931a', textDecoration: 'none' },
};

export default function DocsPage() {
  return (
    <div style={css.container}>
      <h1 style={css.h1}>₿ BTCFi API Documentation</h1>
      <p style={{ ...css.p, fontSize: '16px', color: '#888' }}>
        Bitcoin data, intelligence, security, Solv Protocol, and ZK proofs for AI agents via x402 micropayments.
      </p>

      {/* Quick nav */}
      <div style={css.nav}>
        <div style={{ color: '#666', fontSize: '11px', marginBottom: '8px', textTransform: 'uppercase' }}>Contents</div>
        {['Quick Start', 'Authentication', 'x402 Payments', 'Core Endpoints', 'Intelligence', 'Security', 'Solv Protocol', 'ZK Proofs', 'Streams', 'SDK', 'MCP Server', 'Rate Limits', 'Error Codes'].map(s => (
          <a key={s} href={`#${s.toLowerCase().replace(/ /g, '-')}`} style={css.navLink}>{s}</a>
        ))}
      </div>

      {/* Quick Start */}
      <h2 style={css.h2} id="quick-start">Quick Start</h2>
      <p style={css.p}>BTCFi API requires no API keys. Payment IS authentication. Query any endpoint, pay with USDC on Base or Solana.</p>
      <div style={css.code}>{`# 1. Try a free endpoint
curl https://btcfi.aiindigo.com/api/health

# 2. Try a paid endpoint (returns 402 with payment instructions)
curl https://btcfi.aiindigo.com/api/v1/fees

# 3. Pay and retry with proof
curl -H "X-Payment: <payment-proof>" \\
     -H "X-Payment-Network: base" \\
     https://btcfi.aiindigo.com/api/v1/fees

# 4. Or use the SDK
npm install @aiindigo/btcfi`}</div>

      {/* Authentication */}
      <h2 style={css.h2} id="authentication">Authentication</h2>
      <p style={css.p}>
        BTCFi uses three authentication tiers. No API keys or accounts needed.
      </p>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Tier</th><th style={css.th}>Rate Limit</th><th style={css.th}>How</th></tr></thead>
        <tbody>
          <tr><td style={css.td}>Free</td><td style={css.td}>100/min</td><td style={css.td}>No headers needed</td></tr>
          <tr><td style={css.td}>Signed</td><td style={css.td}>500/min</td><td style={css.td}>X-Signature + X-Nonce + X-Signer headers</td></tr>
          <tr><td style={css.td}>Paid</td><td style={css.td}>Unlimited</td><td style={css.td}>X-Payment header (x402 proof)</td></tr>
          <tr><td style={css.td}>Staked</td><td style={css.td}>Unlimited</td><td style={css.td}>X-Staker header with staked wallet</td></tr>
        </tbody>
      </table>

      <h3 style={css.h3}>Wallet Signature Auth</h3>
      <p style={css.p}>Sign requests with your wallet for higher rate limits. Format: <span style={css.inline}>METHOD:PATH:NONCE:TIMESTAMP</span></p>
      <div style={css.code}>{`Headers:
  X-Signature: <base64-signature>
  X-Nonce: <unique-uuid>
  X-Signer: <wallet-address>  (0x... for EVM, base58 for Solana)
  X-Timestamp: <unix-seconds>

Message to sign: "GET:/api/v1/fees:abc123:1707700000"
Supported: Ed25519 (Solana), secp256k1 (EVM)`}</div>

      {/* x402 Payments */}
      <h2 style={css.h2} id="x402-payments">x402 Payments</h2>
      <p style={css.p}>
        Paid endpoints return HTTP 402 with payment instructions. Pay with USDC on Base or Solana, include proof in retry.
      </p>
      <div style={css.code}>{`// 402 Response body:
{
  "error": "Payment Required",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base",
    "maxAmountRequired": "10000",  // $0.01 in USDC base units
    "payTo": "0xA6Bb...7150",
    "asset": "0x8335...2913",      // Base USDC
    "facilitator": "https://x402.org/facilitator"
  },
  "alternatePayment": {
    "network": "solana",
    "payTo": "8f2L...uRqQ",
    "asset": "EPjF...Dt1v",        // Solana USDC
    "facilitator": "https://thrt.ai/nlx402"
  }
}`}</div>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Network</th><th style={css.th}>Facilitator</th><th style={css.th}>Fees</th></tr></thead>
        <tbody>
          <tr><td style={css.td}>Base</td><td style={css.td}>Coinbase x402</td><td style={css.td}>Zero (ERC-3009)</td></tr>
          <tr><td style={css.td}>Solana</td><td style={css.td}>NLx402 (PCEF)</td><td style={css.td}>Zero (nonprofit)</td></tr>
        </tbody>
      </table>

      {/* Core Endpoints */}
      <h2 style={css.h2} id="core-endpoints">Core Endpoints</h2>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Endpoint</th><th style={css.th}>Price</th><th style={css.th}>Description</th></tr></thead>
        <tbody>
          {[
            ['GET /api/v1/fees', '$0.01', 'Recommended fees + USD estimates'],
            ['GET /api/v1/mempool', '$0.01', 'Mempool summary, fee histogram, recent txs'],
            ['GET /api/v1/address/{addr}', '$0.01', 'Balance, tx count, funded/spent stats'],
            ['GET /api/v1/address/{addr}/utxos', '$0.01', 'Unspent transaction outputs'],
            ['GET /api/v1/address/{addr}/txs', '$0.01', 'Transaction history'],
            ['GET /api/v1/tx/{txid}', '$0.01', 'Transaction details'],
            ['GET /api/v1/tx/{txid}/status', '$0.01', 'Confirmation status'],
            ['POST /api/v1/tx/broadcast', '$0.05', 'Broadcast signed tx (body: { txHex })'],
            ['GET /api/v1/block/latest', '$0.01', 'Latest blocks (?limit=N)'],
            ['GET /api/v1/block/{id}', '$0.01', 'Block by height or hash'],
          ].map(([ep, price, desc]) => (
            <tr key={ep as string}><td style={css.tdCode}>{ep}</td><td style={css.td}>{price}</td><td style={css.td}>{desc}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Intelligence */}
      <h2 style={css.h2} id="intelligence">Intelligence</h2>
      <p style={css.p}>AI-powered analysis endpoints. All $0.02 USDC.</p>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Endpoint</th><th style={css.th}>Description</th></tr></thead>
        <tbody>
          {[
            ['GET /api/v1/intelligence/consolidate/{addr}', 'UTXO consolidation advice — dust detection, optimal timing'],
            ['GET /api/v1/intelligence/fees', 'Fee prediction for 1h, 6h, 24h windows'],
            ['GET /api/v1/intelligence/whales', 'Large transaction detection + whale alerts'],
            ['GET /api/v1/intelligence/risk/{addr}', 'Address risk scoring — transaction pattern analysis'],
            ['GET /api/v1/intelligence/network', 'Network health — hashrate, difficulty, congestion'],
          ].map(([ep, desc]) => (
            <tr key={ep as string}><td style={css.tdCode}>{ep}</td><td style={css.td}>{desc}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Security */}
      <h2 style={css.h2} id="security">Security</h2>
      <p style={css.p}>YARA-pattern threat analysis. $0.02 USDC.</p>
      <div style={css.code}>{`GET /api/v1/security/threat/{addr}

Response: {
  "data": {
    "address": "bc1...",
    "overallScore": 25,
    "threatLevel": "low",
    "matchedPatterns": [...],
    "recommendations": [...]
  }
}`}</div>

      {/* Solv Protocol */}
      <h2 style={css.h2} id="solv-protocol">Solv Protocol</h2>
      <p style={css.p}>BTCFi DeFi data from Solv Protocol. All $0.02 USDC.</p>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Endpoint</th><th style={css.th}>Description</th></tr></thead>
        <tbody>
          {[
            ['GET /api/v1/solv/reserves', 'SolvBTC supply across chains, backing ratio, TVL'],
            ['GET /api/v1/solv/yield', 'xSolvBTC APY, yield strategies, comparisons'],
            ['GET /api/v1/solv/liquidity', 'Cross-chain liquidity distribution (?chain=ethereum)'],
            ['GET /api/v1/solv/risk', 'Multi-factor risk assessment'],
          ].map(([ep, desc]) => (
            <tr key={ep as string}><td style={css.tdCode}>{ep}</td><td style={css.td}>{desc}</td></tr>
          ))}
        </tbody>
      </table>

      {/* ZK Proofs */}
      <h2 style={css.h2} id="zk-proofs">ZK Proofs</h2>
      <p style={css.p}>Zero-knowledge proofs for privacy-preserving verification. Groth16 protocol.</p>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Endpoint</th><th style={css.th}>Price</th><th style={css.th}>Description</th></tr></thead>
        <tbody>
          {[
            ['POST /api/v1/zk/balance-proof', '$0.03', 'Prove balance ≥ threshold without revealing amount'],
            ['POST /api/v1/zk/age-proof', '$0.03', 'Prove UTXO age ≥ N blocks'],
            ['POST /api/v1/zk/membership', '$0.03', 'Prove address belongs to trusted set'],
            ['POST /api/v1/zk/verify', '$0.01', 'Verify any ZK proof without regeneration'],
          ].map(([ep, price, desc]) => (
            <tr key={ep as string}><td style={css.tdCode}>{ep}</td><td style={css.td}>{price}</td><td style={css.td}>{desc}</td></tr>
          ))}
        </tbody>
      </table>

      {/* Streams */}
      <h2 style={css.h2} id="streams">Streams</h2>
      <p style={css.p}>Server-Sent Events (SSE) for real-time data.</p>
      <div style={css.code}>{`// General events: new_block, fee_change, mempool_surge
const es = new EventSource('https://btcfi.aiindigo.com/api/v1/stream');

// Whale alerts only (min BTC threshold)
const whales = new EventSource('https://btcfi.aiindigo.com/api/v1/stream/whales?min=50');

es.onmessage = (e) => console.log(JSON.parse(e.data));`}</div>

      {/* SDK */}
      <h2 style={css.h2} id="sdk">SDK</h2>
      <div style={css.code}>{`npm install @aiindigo/btcfi`}</div>
      <div style={css.code}>{`import { BTCFi } from '@aiindigo/btcfi';

// Free usage (gets 402 on paid endpoints)
const btcfi = new BTCFi();
const health = await btcfi.getHealth();

// Auto-pay with Base USDC
const paid = new BTCFi({
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
  paymentNetwork: 'base',
});
const fees = await paid.getFees();

// Auto-pay with Solana USDC (zero facilitator fees)
const solPaid = new BTCFi({
  svmPrivateKey: process.env.SVM_PRIVATE_KEY,
  paymentNetwork: 'solana',
});`}</div>
      <p style={css.p}>28 methods covering all endpoints. See <a href="https://www.npmjs.com/package/@aiindigo/btcfi" style={css.link}>npm package</a> for full API reference.</p>

      {/* MCP */}
      <h2 style={css.h2} id="mcp-server">MCP Server</h2>
      <p style={css.p}>27-tool Model Context Protocol server for Claude Desktop, Cursor, and other MCP clients.</p>
      <div style={css.code}>{`// Claude Desktop config (~/.config/Claude/claude_desktop_config.json)
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": {
        "SVM_PRIVATE_KEY": "your-solana-key",
        "PAYMENT_NETWORK": "solana"
      }
    }
  }
}`}</div>

      {/* Rate Limits */}
      <h2 style={css.h2} id="rate-limits">Rate Limits</h2>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Tier</th><th style={css.th}>Limit</th><th style={css.th}>Headers</th></tr></thead>
        <tbody>
          <tr><td style={css.td}>Free</td><td style={css.td}>100/min</td><td style={css.td}>None</td></tr>
          <tr><td style={css.td}>Signed</td><td style={css.td}>500/min</td><td style={css.td}>X-Signature, X-Nonce, X-Signer, X-Timestamp</td></tr>
          <tr><td style={css.td}>Paid (x402)</td><td style={css.td}>Unlimited</td><td style={css.td}>X-Payment, X-Payment-Network</td></tr>
          <tr><td style={css.td}>Staked</td><td style={css.td}>Unlimited</td><td style={css.td}>X-Staker</td></tr>
        </tbody>
      </table>

      {/* Error Codes */}
      <h2 style={css.h2} id="error-codes">Error Codes</h2>
      <table style={css.table}>
        <thead><tr><th style={css.th}>Code</th><th style={css.th}>Meaning</th></tr></thead>
        <tbody>
          <tr><td style={css.td}>200</td><td style={css.td}>Success</td></tr>
          <tr><td style={css.td}>400</td><td style={css.td}>Bad request — invalid address, txid, or parameters</td></tr>
          <tr><td style={css.td}>402</td><td style={css.td}>Payment required — includes payment instructions</td></tr>
          <tr><td style={css.td}>404</td><td style={css.td}>Not found — address/tx/block doesn&apos;t exist</td></tr>
          <tr><td style={css.td}>429</td><td style={css.td}>Rate limited — upgrade tier or wait</td></tr>
          <tr><td style={css.td}>500</td><td style={css.td}>Server error — upstream API failure</td></tr>
          <tr><td style={css.td}>503</td><td style={css.td}>Service degraded — try again shortly</td></tr>
        </tbody>
      </table>

      {/* Links */}
      <div style={{ marginTop: '48px', borderTop: '1px solid #222', paddingTop: '24px', textAlign: 'center' as const }}>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <Link href="/" style={css.link}>Home</Link>
          <Link href="/api/docs" style={css.link}>Interactive Docs</Link>
          <Link href="/dashboard" style={css.link}>Dashboard</Link>
          <a href="https://www.npmjs.com/package/@aiindigo/btcfi" style={css.link}>SDK</a>
          <a href="https://www.npmjs.com/package/@aiindigo/btcfi-mcp" style={css.link}>MCP</a>
        </div>
        <p style={{ color: '#444', fontSize: '12px', marginTop: '16px' }}>
          Built by <a href="https://aiindigo.com" style={css.link}>AI Indigo</a> · v3.0.0
        </p>
      </div>
    </div>
  );
}
