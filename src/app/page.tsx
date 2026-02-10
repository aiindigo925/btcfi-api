/**
 * BTCFi API Landing Page — Task 14.2
 * Dark theme, agent-focused, live data
 */

import { getBlockHeight, getBtcPrice } from '@/lib/bitcoin';
import { getSolanaRpc } from '@/lib/rpc';

const css = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '40px 24px' } as React.CSSProperties,
  hero: { textAlign: 'center' as const, marginBottom: '60px', paddingTop: '40px' },
  title: { fontSize: '48px', fontWeight: 700, color: '#f7931a', margin: '0 0 8px 0', letterSpacing: '-1px' },
  subtitle: { fontSize: '18px', color: '#888', margin: '0 0 24px 0', fontWeight: 400 },
  live: { display: 'inline-flex', gap: '24px', background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '12px 24px', fontSize: '14px' },
  liveLabel: { color: '#666' },
  liveValue: { color: '#f7931a', fontWeight: 600 },
  section: { marginBottom: '48px' },
  sectionTitle: { fontSize: '20px', color: '#fff', marginBottom: '16px', borderBottom: '1px solid #222', paddingBottom: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' } as React.CSSProperties,
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' },
  endpoint: { fontSize: '13px', color: '#f7931a', fontFamily: 'monospace', marginBottom: '4px' },
  desc: { fontSize: '13px', color: '#888', margin: 0 },
  price: { fontSize: '12px', color: '#4ade80', marginTop: '8px', display: 'inline-block', background: '#0a1f0a', padding: '2px 8px', borderRadius: '4px' },
  code: { background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#ccc', overflowX: 'auto' as const, whiteSpace: 'pre' as const },
  link: { color: '#f7931a', textDecoration: 'none' },
  badge: { display: 'inline-block', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' },
  footer: { textAlign: 'center' as const, color: '#444', fontSize: '13px', borderTop: '1px solid #1a1a1a', paddingTop: '24px', marginTop: '60px' },
};

export default async function Home() {
  let blockHeight = 0;
  let btcPrice = { USD: 0, EUR: 0 };
  try {
    [blockHeight, btcPrice] = await Promise.all([getBlockHeight(), getBtcPrice()]);
  } catch { /* defaults */ }

  const endpoints = [
    { path: 'GET /api/v1/fees', desc: 'Recommended fees + USD estimates', price: '$0.01' },
    { path: 'GET /api/v1/mempool', desc: 'Mempool summary + recent txs', price: '$0.01' },
    { path: 'GET /api/v1/address/{addr}', desc: 'Address balance + stats', price: '$0.01' },
    { path: 'GET /api/v1/address/{addr}/utxos', desc: 'Unspent outputs', price: '$0.01' },
    { path: 'GET /api/v1/tx/{txid}', desc: 'Transaction details', price: '$0.01' },
    { path: 'POST /api/v1/tx/broadcast', desc: 'Broadcast signed tx', price: '$0.05' },
    { path: 'GET /api/v1/block/latest', desc: 'Latest blocks', price: '$0.01' },
    { path: 'GET /api/v1/intelligence/fees', desc: 'AI fee prediction (1h/6h/24h)', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/whales', desc: 'Large tx detection + alerts', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/risk/{addr}', desc: 'Address risk scoring', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/network', desc: 'Network health analysis', price: '$0.02' },
    { path: 'GET /api/v1/security/threat/{addr}', desc: 'YARA-pattern threat analysis', price: '$0.02' },
    { path: 'GET /api/v1/solv/reserves', desc: 'SolvBTC supply + chain breakdown', price: '$0.02' },
    { path: 'GET /api/v1/solv/yield', desc: 'xSolvBTC APY + yield strategies', price: '$0.02' },
    { path: 'GET /api/v1/solv/liquidity', desc: 'Cross-chain liquidity distribution', price: '$0.02' },
    { path: 'GET /api/v1/solv/risk', desc: 'Multi-factor risk assessment', price: '$0.02' },
    { path: 'POST /api/v1/zk/balance-proof', desc: 'ZK proof: balance ≥ threshold', price: '$0.03' },
    { path: 'POST /api/v1/zk/age-proof', desc: 'ZK proof: UTXO age ≥ N blocks', price: '$0.03' },
    { path: 'POST /api/v1/zk/membership', desc: 'ZK proof: address in set', price: '$0.03' },
    { path: 'POST /api/v1/zk/verify', desc: 'Verify any ZK proof', price: '$0.01' },
    { path: 'GET /api/v1/stream', desc: 'SSE: blocks, fees, mempool', price: '$0.01' },
    { path: 'GET /api/v1/stream/whales', desc: 'SSE: whale tx alerts', price: '$0.01' },
    { path: 'GET /api/v1/staking/status', desc: 'Staking tier check', price: 'free' },
    { path: 'GET /api/health', desc: 'System health + RPC status', price: 'free' },
  ];

  return (
    <div style={css.container}>
      {/* Hero */}
      <div style={css.hero}>
        <h1 style={css.title}>₿ BTCFi API</h1>
        <p style={css.subtitle}>Bitcoin + BTCFi data for AI agents via x402 micropayments</p>
        <div style={css.live}>
          <span><span style={css.liveLabel}>Block </span><span style={css.liveValue}>#{blockHeight.toLocaleString()}</span></span>
          <span><span style={css.liveLabel}>BTC </span><span style={css.liveValue}>${btcPrice.USD.toLocaleString()}</span></span>
          <span><span style={css.liveLabel}>RPC </span><span style={css.liveValue}>{getSolanaRpc().includes('whistle') ? '🟢 Whistle' : '🟡 Fallback'}</span></span>
        </div>
      </div>

      {/* How it works */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>How it works</h2>
        <div style={css.code}>{`# 1. Query any endpoint
curl https://btcfi.aiindigo.com/api/v1/fees

# 2. Get 402 response with payment instructions
# 3. Pay with USDC on Base or Solana
# 4. Include payment proof, get data

curl -H "X-Payment: <proof>" \\
     -H "X-Payment-Network: base" \\
     https://btcfi.aiindigo.com/api/v1/fees`}</div>
      </div>

      {/* Endpoints */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>{endpoints.length} Endpoints</h2>
        <div style={css.grid}>
          {endpoints.map((ep) => (
            <div key={ep.path} style={css.card}>
              <div style={css.endpoint}>{ep.path}</div>
              <p style={css.desc}>{ep.desc}</p>
              <span style={{
                ...css.price,
                ...(ep.price === 'free' ? { color: '#60a5fa', background: '#0a0f1f' } : {}),
              }}>{ep.price}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Payment networks */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>Payment Networks</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={css.card}>
            <div style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>🔵 Base (Coinbase)</div>
            <p style={css.desc}>ERC-3009 USDC settlement. Fee-free via Coinbase facilitator.</p>
            <p style={{ ...css.desc, marginTop: '8px' }}>Header: <code style={{ color: '#f7931a' }}>X-Payment-Network: base</code></p>
          </div>
          <div style={css.card}>
            <div style={{ fontSize: '16px', color: '#fff', marginBottom: '8px' }}>🟣 Solana (NLx402)</div>
            <p style={css.desc}>Nonce-locked, hash-bound. Zero fees via PCEF nonprofit facilitator.</p>
            <p style={{ ...css.desc, marginTop: '8px' }}>Header: <code style={{ color: '#f7931a' }}>X-Payment-Network: solana</code></p>
          </div>
        </div>
      </div>

      {/* Security */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>Security</h2>
        <div style={css.code}>{`YARA-pattern threat analysis (PCEF-inspired)
Wallet signature auth (Ed25519 + secp256k1)
Encrypted responses (Curve25519 + XSalsa20-Poly1305)
Nonce-based replay protection
Tiered rate limiting with progressive backoff
Decentralized RPC via Whistle Network`}</div>
      </div>

      {/* MCP */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>MCP Integration <span style={{ ...css.badge, background: '#001a0a', color: '#4ade80' }}>27 tools</span></h2>
        <div style={css.code}>{`# Claude Desktop — add to claude_desktop_config.json
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": {
        "SVM_PRIVATE_KEY": "your-solana-key"
      }
    }
  }
}

# npm: @aiindigo/btcfi-mcp
# 27 tools: fees, mempool, address, tx, blocks,
# intelligence, security, staking, solv protocol,
# zk proofs, real-time streams`}</div>
      </div>

      {/* Footer */}
      <div style={css.footer}>
        <p>Built by <a href="https://aiindigo.com" style={css.link}>AI Indigo</a> · No tokens · No subscriptions · Payment IS authentication</p>
        <p style={{ marginTop: '8px' }}>Powered by mempool.space · Solv Protocol · Whistle Network · PCEF/NLx402</p>
      </div>
    </div>
  );
}
