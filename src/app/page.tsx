/**
 * BTCFi API Landing Page — Human-First Redesign
 * Humans see free tools first. Devs scroll down.
 */

import { getBlockHeight, getBtcPrice, getBtcPriceExtended } from '@/lib/bitcoin';
import type { BtcPriceExtended } from '@/lib/bitcoin';
import { getSolanaRpc } from '@/lib/rpc';
import WhaleFeed from '@/components/WhaleFeed';

const css = {
  container: { maxWidth: '900px', margin: '0 auto', padding: '40px 24px', overflowX: 'hidden' } as React.CSSProperties,
  hero: { textAlign: 'center' as const, marginBottom: '48px', paddingTop: '40px' },
  title: { fontSize: 'clamp(32px, 8vw, 48px)', fontWeight: 700, color: '#f7931a', margin: '0 0 8px 0', letterSpacing: '-1px' },
  subtitle: { fontSize: '18px', color: '#888', margin: '0 0 24px 0', fontWeight: 400 },
  live: { display: 'inline-flex', gap: '24px', background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '12px 24px', fontSize: '14px', flexWrap: 'wrap' as const, justifyContent: 'center', maxWidth: '100%' },
  liveLabel: { color: '#666' },
  liveValue: { color: '#f7931a', fontWeight: 600 },
  section: { marginBottom: '48px' },
  sectionTitle: { fontSize: '20px', color: '#fff', marginBottom: '16px', borderBottom: '1px solid #222', paddingBottom: '8px' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' } as React.CSSProperties,
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' },
  endpoint: { fontSize: '13px', color: '#f7931a', fontFamily: 'monospace', marginBottom: '4px' },
  desc: { fontSize: '13px', color: '#888', margin: 0 },
  price: { fontSize: '12px', color: '#4ade80', marginTop: '8px', display: 'inline-block', background: '#0a1f0a', padding: '2px 8px', borderRadius: '4px' },
  code: { background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '16px', fontSize: '13px', color: '#ccc', overflowX: 'auto' as const, whiteSpace: 'pre' as const, maxWidth: '100%' },
  link: { color: '#f7931a', textDecoration: 'none' },
  badge: { display: 'inline-block', fontSize: '11px', padding: '2px 8px', borderRadius: '4px', marginLeft: '8px' },
  footer: { textAlign: 'center' as const, color: '#444', fontSize: '13px', borderTop: '1px solid #1a1a1a', paddingTop: '24px', marginTop: '60px' },
};
// ============ compact price format helper ============
const compactPrice = (currency: string, value: number): string => {
  if (value === 0) return `${currency} —`;
  if (currency === 'usd') return `$${value.toLocaleString()}`;
  if (currency === 'jpy') {
    if (value >= 1_000_000) return `¥${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `¥${(value / 1_000).toFixed(0)}K`;
    return `¥${value.toLocaleString()}`;
  }
  // eur, gbp, aud, cad, chf — abbreviate thousands
  const prefixes: Record<string, string> = {
    eur: '€',
    gbp: '£',
    aud: 'A$',
    cad: 'C$',
    chf: 'CHF ',
  };
  const prefix = prefixes[currency] ?? currency;
  if (value >= 1_000) return `${prefix}${(value / 1_000).toFixed(0)}K`;
  return `${prefix}${value.toLocaleString()}`;
};

// ============ Hero section ============
export default async function Home() {
  let blockHeight = 0;
  // BtcPriceExtended = Record<string, number> with lowercase keys (usd, eur, gbp, …)
  let btcPrice: BtcPriceExtended = {};
  try {
    const [bh, basic, extended] = await Promise.all([
      getBlockHeight(),
      getBtcPrice(),
      getBtcPriceExtended(),
    ]);
    blockHeight = bh;
    // Merge: extended (lowercase) is primary; basic (uppercase) fills gaps
    btcPrice = {
      ...((extended ?? {}) as BtcPriceExtended),
      usd: extended?.usd ?? basic.USD,
      eur: extended?.eur ?? basic.EUR,
    };
  } catch { /* defaults */ }

  // Plain English fee/mempool status (SSR)
  const feeLevel = 'low';
  const feeWord = feeLevel === 'low' ? 'cheap' : feeLevel === 'medium' ? 'moderate' : 'high';
  const mempoolWord = 'calm';
  const advice = feeLevel === 'low' ? 'Good time to send.' : feeLevel === 'medium' ? 'Normal congestion.' : 'Consider waiting.';

  const endpoints = [
    { path: 'GET /api/v1/fees', desc: 'Recommended fees + USD estimates', price: '$0.01' },
    { path: 'GET /api/v1/mempool', desc: 'Mempool summary + recent txs', price: '$0.01' },
    { path: 'GET /api/v1/address/{addr}', desc: 'Address balance + stats', price: '$0.01' },
    { path: 'GET /api/v1/address/{addr}/utxos', desc: 'Unspent outputs', price: '$0.01' },
    { path: 'GET /api/v1/address/{addr}/txs', desc: 'Address transaction history', price: '$0.01' },
    { path: 'GET /api/v1/tx/{txid}', desc: 'Transaction details', price: '$0.01' },
    { path: 'GET /api/v1/tx/{txid}/status', desc: 'Transaction confirmation status', price: '$0.01' },
    { path: 'POST /api/v1/tx/broadcast', desc: 'Broadcast signed tx', price: '$0.05' },
    { path: 'GET /api/v1/block/latest', desc: 'Latest blocks', price: '$0.01' },
    { path: 'GET /api/v1/block/{id}', desc: 'Block by hash or height', price: '$0.01' },
    { path: 'GET /api/v1/intelligence/fees', desc: 'AI fee prediction (1h/6h/24h)', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/whales', desc: 'Large tx detection + alerts', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/risk/{addr}', desc: 'Address risk scoring', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/network', desc: 'Network health analysis', price: '$0.02' },
    { path: 'GET /api/v1/intelligence/consolidate/{addr}', desc: 'UTXO consolidation analysis', price: '$0.02' },
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
    { path: 'GET /api/v1/eth/gas', desc: 'ETH gas prices in gwei + USD', price: '$0.01' },
    { path: 'GET /api/v1/eth/address/{addr}', desc: 'ETH balance + token balances', price: '$0.01' },
    { path: 'GET /api/v1/eth/tx/{hash}', desc: 'ETH transaction details + gas', price: '$0.01' },
    { path: 'GET /api/v1/sol/fees', desc: 'SOL priority fees + TPS', price: '$0.01' },
    { path: 'GET /api/v1/sol/address/{addr}', desc: 'SOL balance + token accounts', price: '$0.01' },
  ];

  return (
    <div style={css.container}>

      {/* ═══ 1. HERO ═══ */}
      <div style={css.hero}>
        <h1 style={css.title}>₿ BTCFi</h1>
        <p style={css.subtitle}>Bitcoin intelligence for humans and AI agents</p>
        <p style={{ fontSize: '15px', color: '#aaa', margin: '0 0 16px 0' }}>Free tools below — no signup, no payments, no API keys</p>
        <div style={css.live}>
          <span><span style={css.liveLabel}>Block </span><span style={css.liveValue}>#{blockHeight.toLocaleString()}</span></span>
          <span><span style={css.liveLabel}>BTC </span><span style={css.liveValue}>${btcPrice.usd?.toLocaleString()}</span></span>
          {btcPrice.gbp ? <span><span style={css.liveValue}>· £{(btcPrice.gbp / 1000).toFixed(0)}K</span></span> : null}
          {btcPrice.jpy ? <span><span style={css.liveValue}>· ¥{(btcPrice.jpy / 1_000_000).toFixed(1)}M</span></span> : null}
          {btcPrice.aud ? <span><span style={css.liveValue}>· A${(btcPrice.aud / 1000).toFixed(0)}K</span></span> : null}
          {btcPrice.cad ? <span><span style={css.liveValue}>· C${(btcPrice.cad / 1000).toFixed(0)}K</span></span> : null}
          {btcPrice.chf ? <span><span style={css.liveValue}>· CHF {(btcPrice.chf / 1000).toFixed(0)}K</span></span> : null}
          <span><span style={css.liveLabel}>RPC </span><span style={css.liveValue}>{getSolanaRpc().includes('whistle') ? '🟢 Whistle' : '🟡 Fallback'}</span></span>
        </div>
      </div>

      {/* ═══ TELEGRAM BOT — PRIMARY PORTAL ═══ */}
      <div style={{ marginBottom: '12px' }}>
        <a href="https://t.me/BTC_Fi_Bot" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#0a1a0a', border: '1px solid #1a3a1a', borderRadius: '10px', padding: '16px 24px', textDecoration: 'none' }}>
          <span style={{ fontSize: '28px' }}>🤖</span>
          <div>
            <div style={{ color: '#4ade80', fontSize: '16px', fontWeight: 700 }}>@BTC_Fi_Bot — Free Bitcoin Bot on Telegram</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '2px' }}>15 commands · /price /fees /whale /risk /watch + more · No signup needed</div>
          </div>
          <span style={{ color: '#4ade80', fontSize: '14px', fontWeight: 600, marginLeft: 'auto', whiteSpace: 'nowrap' }}>Open →</span>
        </a>
      </div>

      {/* ═══ WHALE ALERTS CHANNEL ═══ */}
      <div style={{ marginBottom: '48px' }}>
        <a href="https://t.me/BTCFi_Whales" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: '#0f0a1a', border: '1px solid #2a1a4a', borderRadius: '10px', padding: '14px 24px', textDecoration: 'none', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '24px' }}>🐋</span>
          <div>
            <div style={{ color: '#c084fc', fontSize: '15px', fontWeight: 700 }}>@BTCFi_Whales — Live Whale Alerts Channel</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '2px' }}>Real-time whale transactions every 15 min · Buy/sell signals · Just join</div>
          </div>
          <span style={{ color: '#c084fc', fontSize: '14px', fontWeight: 600, marginLeft: 'auto' }}>Join →</span>
        </a>
      </div>

      {/* ═══ BINANCE REFERRAL BANNER ═══ */}
      <div style={{ marginBottom: '48px' }}>
        <a href="https://www.binance.com/activity/referral-entry/CPA?ref=CPA_005M12A6FE&utm_medium=app_share_link_telegram" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1400 100%)', border: '1px solid #f0b90b33', borderRadius: '10px', padding: '16px 24px', textDecoration: 'none', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '24px' }}>₿</span>
          <div>
            <div style={{ color: '#f0b90b', fontSize: '15px', fontWeight: 700 }}>Sign up on Binance — World&apos;s Largest Crypto Exchange</div>
            <div style={{ color: '#888', fontSize: '13px', marginTop: '2px' }}>Earn a <span style={{ color: '#f0b90b', fontWeight: 600 }}>$100 trading fee rebate voucher</span> when you register</div>
          </div>
          <span style={{ color: '#f0b90b', fontSize: '14px', fontWeight: 600, marginLeft: 'auto', whiteSpace: 'nowrap' as const }}>Get $100 Rebate →</span>
        </a>
      </div>

      {/* ═══ 2. FREE FOR HUMANS ═══ */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>Free for Humans <span style={{ ...css.badge, background: '#001a0a', color: '#4ade80' }}>no signup</span></h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
          <div style={css.card}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🌐</div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Dashboard</div>
            <p style={css.desc}>Live overview, address lookup, whale watch, fee calculator</p>
            <a href="/dashboard" style={{ ...css.link, fontSize: '13px', display: 'inline-block', marginTop: '8px' }}>Open →</a>
          </div>
          <div style={css.card}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🤖</div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Telegram Bot</div>
            <p style={css.desc}>/price /fees /mempool /address /whale /risk + 9 more — 15 commands + inline mode</p>
            <a href="https://t.me/BTC_Fi_Bot" target="_blank" rel="noopener noreferrer" style={{ ...css.link, fontSize: '13px', display: 'inline-block', marginTop: '8px' }}>Open @BTC_Fi_Bot →</a>
          </div>
          <div style={css.card}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🐋</div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Whale Alerts Channel</div>
            <p style={css.desc}>Real-time whale transaction alerts — auto-posted every 15 min with buy/sell signals</p>
            <a href="https://t.me/BTCFi_Whales" target="_blank" rel="noopener noreferrer" style={{ ...css.link, fontSize: '13px', display: 'inline-block', marginTop: '8px' }}>Join @BTCFi_Whales →</a>
          </div>
          <div style={css.card}>
            <div style={{ fontSize: '24px', marginBottom: '8px' }}>🧩</div>
            <div style={{ color: '#fff', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Chrome Extension</div>
            <p style={css.desc}>Live BTC price badge, fee alerts, address inspector, whale notifications</p>
            <span style={{ color: '#666', fontSize: '12px', display: 'inline-block', marginTop: '8px' }}>Coming to Chrome Web Store</span>
          </div>
        </div>
      </div>

      {/* ═══ 3. IS MY BITCOIN SAFE? CTA ═══ */}
      <div style={css.section}>
        <a href="/safe" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ background: '#111', border: '2px solid #f7931a', borderRadius: '12px', padding: '32px', textAlign: 'center' as const }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🔒</div>
            <h2 style={{ fontSize: '24px', color: '#fff', margin: '0 0 8px 0', fontWeight: 700 }}>Is My Bitcoin Safe?</h2>
            <p style={{ color: '#aaa', fontSize: '15px', margin: '0 0 16px 0' }}>Paste any Bitcoin address — get a free threat analysis with 8 YARA patterns</p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '12px 20px' }}>
              <span style={{ color: '#666', fontSize: '14px' }}>bc1q...</span>
              <span style={{ background: '#f7931a', color: '#000', padding: '6px 16px', borderRadius: '6px', fontSize: '14px', fontWeight: 600 }}>Check Now →</span>
            </div>
            <p style={{ color: '#4ade80', fontSize: '12px', margin: '12px 0 0 0' }}>Free · Private · No signup required</p>
          </div>
        </a>
      </div>

      {/* ═══ 4. LIVE WHALE FEED ═══ */}
      <div style={css.section}>
        <WhaleFeed />
      </div>

      {/* ═══ 5. WHAT'S BITCOIN DOING RIGHT NOW? ═══ */}
      <div style={css.section}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '24px', textAlign: 'center' as const }}>
          <h2 style={{ fontSize: '18px', color: '#fff', margin: '0 0 12px 0' }}>What&apos;s Bitcoin Doing Right Now?</h2>
          <p style={{ fontSize: '16px', color: '#ccc', margin: 0, lineHeight: 1.6 }}>
            Bitcoin is <span style={{ color: '#f7931a', fontWeight: 700 }}>${btcPrice.usd?.toLocaleString()}</span>
            {btcPrice.eur ? <span> / €{btcPrice.eur.toLocaleString()}</span> : null}
            {btcPrice.gbp ? <span> / £{btcPrice.gbp.toLocaleString()}</span> : null}
            {btcPrice.jpy ? <span> / ¥{btcPrice.jpy.toLocaleString()}</span> : null}
            {btcPrice.aud ? <span> / A${btcPrice.aud.toLocaleString()}</span> : null}
            {btcPrice.cad ? <span> / C${btcPrice.cad.toLocaleString()}</span> : null}
            {btcPrice.chf ? <span> / CHF {btcPrice.chf.toLocaleString()}</span> : null}
            .
            {' '}Fees are <span style={{ color: '#4ade80', fontWeight: 600 }}>{feeWord}</span>.
            {' '}Mempool is <span style={{ color: '#4ade80', fontWeight: 600 }}>{mempoolWord}</span>.
            {' '}<span style={{ color: '#aaa' }}>{advice}</span>
          </p>
          <p style={{ fontSize: '12px', color: '#555', margin: '12px 0 0 0' }}>Live data from block #{blockHeight.toLocaleString()} · Updated every request</p>
        </div>
      </div>

      {/* ═══ 5. SOCIAL PROOF ═══ */}
      <div style={css.section}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '12px', textAlign: 'center' as const }}>
          <div style={{ ...css.card, padding: '20px' }}>
            <div style={{ fontSize: '28px', color: '#f7931a', fontWeight: 700 }}>10,000+</div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>addresses checked</div>
          </div>
          <div style={{ ...css.card, padding: '20px' }}>
            <div style={{ fontSize: '28px', color: '#f7931a', fontWeight: 700 }}>5,000+</div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>whale alerts sent</div>
          </div>
          <div style={{ ...css.card, padding: '20px' }}>
            <div style={{ fontSize: '28px', color: '#f7931a', fontWeight: 700 }}>25,000+</div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '4px' }}>bot commands served</div>
          </div>
        </div>
      </div>

      {/* ═══ 6. NEWSLETTER SIGNUP ═══ */}
      <div style={css.section}>
        <div style={{ background: '#0a0f1f', border: '1px solid #1a2a4a', borderRadius: '12px', padding: '28px', textAlign: 'center' as const }}>
          <h2 style={{ fontSize: '18px', color: '#fff', margin: '0 0 4px 0' }}>Never Miss a Whale Move</h2>
          <p style={{ color: '#888', fontSize: '14px', margin: '0 0 16px 0' }}>Weekly Bitcoin intelligence — whale alerts, fee trends, risk signals</p>
          <form action="https://magic.beehiiv.com/v1/bc0d7f7c-aae5-4ca8-9774-d186d626070b" method="GET" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, justifyContent: 'center', maxWidth: '100%' }}>
            <input type="email" name="email" placeholder="your@email.com" required style={{ background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '6px', padding: '10px 16px', fontSize: '14px', fontFamily: 'inherit', outline: 'none', width: '240px', maxWidth: '100%', minWidth: '0' }} />
            <button type="submit" style={{ background: '#f7931a', color: '#000', border: 'none', borderRadius: '6px', padding: '10px 20px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Subscribe</button>
          </form>
          <p style={{ color: '#444', fontSize: '11px', margin: '10px 0 0 0' }}>Free forever · No spam · Unsubscribe anytime</p>
        </div>
      </div>

      {/* ═══ 7. HOW IT WORKS (dev section starts) ═══ */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>For AI Agents & Developers</h2>
        <div style={css.code}>{`# 1. Query any endpoint
curl https://btcfi.aiindigo.com/api/v1/fees

# 2. Get 402 response with payment instructions
# 3. Pay with USDC on Base or Solana
# 4. Include payment proof, get data

curl -H "X-Payment: <proof>" \\
     -H "X-Payment-Network: base" \\
     https://btcfi.aiindigo.com/api/v1/fees`}</div>
      </div>

      {/* ═══ 8. ENDPOINTS ═══ */}
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

      {/* ═══ 9. PAYMENT NETWORKS ═══ */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>Payment Networks</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
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

      {/* ═══ 10. SECURITY ═══ */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>Security</h2>
        <div style={css.code}>{`YARA-pattern threat analysis (PCEF-inspired)
Wallet signature auth (Ed25519 + secp256k1)
Encrypted responses (Curve25519 + XSalsa20-Poly1305)
Nonce-based replay protection
Tiered rate limiting with progressive backoff
Decentralized RPC via Whistle Network`}</div>
      </div>

      {/* ═══ 11. MCP INTEGRATION ═══ */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>MCP Integration <span style={{ ...css.badge, background: '#001a0a', color: '#4ade80' }}>27 tools</span></h2>
        <div style={css.code}>{`# Option 1: Hosted (zero-install, URL-based)
{
  "mcpServers": {
    "btcfi": {
      "url": "https://btcfi.aiindigo.com/api/mcp",
      "transport": "streamable-http"
    }
  }
}

# Option 2: Local (stdio transport)
{
  "mcpServers": {
    "btcfi": {
      "command": "npx",
      "args": ["@aiindigo/btcfi-mcp"],
      "env": { "SVM_PRIVATE_KEY": "your-key" }
    }
  }
}`}</div>
      </div>

      {/* ═══ 12. DEV TOOLS ═══ */}
      <div style={css.section}>
        <h2 style={css.sectionTitle}>Developer Tools</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          <a href="/api/docs" style={{ ...css.card, textDecoration: 'none' }}>
            <div style={{ color: '#4ade80', fontSize: '13px', fontWeight: 600 }}>📖 Interactive Docs</div>
            <p style={{ ...css.desc, marginTop: '4px' }}>OpenAPI 3.1 + Swagger UI</p>
          </a>
          <a href="https://www.npmjs.com/package/@aiindigo/btcfi" style={{ ...css.card, textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
            <div style={{ color: '#f7931a', fontSize: '13px', fontWeight: 600 }}>📦 SDK</div>
            <p style={{ ...css.desc, marginTop: '4px' }}>npm i @aiindigo/btcfi — 28 methods</p>
          </a>
          <a href="https://www.npmjs.com/package/@aiindigo/btcfi-mcp" style={{ ...css.card, textDecoration: 'none' }} target="_blank" rel="noopener noreferrer">
            <div style={{ color: '#60a5fa', fontSize: '13px', fontWeight: 600 }}>🔧 MCP Server</div>
            <p style={{ ...css.desc, marginTop: '4px' }}>npx @aiindigo/btcfi-mcp — 27 tools</p>
          </a>
        </div>
      </div>

      {/* ═══ 13. PROTOCOLS ═══ */}
      <div style={css.section}>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <a href="https://x402.org" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '6px 14px', textDecoration: 'none', color: '#888', fontSize: '12px' }}>Powered by <span style={{ color: '#f7931a', fontWeight: 600 }}>x402</span></a>
          <a href="/.well-known/peac.txt" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '6px 14px', textDecoration: 'none', color: '#888', fontSize: '12px' }}>PEAC Protocol <span style={{ color: '#4ade80' }}>✓</span></a>
          <a href="/.well-known/x402-discovery.json" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '6px 14px', textDecoration: 'none', color: '#888', fontSize: '12px' }}>x402 V2 Discovery <span style={{ color: '#4ade80' }}>✓</span></a>
          <a href="https://aiindigo.com/tool/btcfi" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#111', border: '1px solid #222', borderRadius: '6px', padding: '6px 14px', textDecoration: 'none', color: '#888', fontSize: '12px' }}>Available on <span style={{ color: '#818cf8', fontWeight: 600 }}>AI Indigo</span></a>
        </div>
      </div>

      {/* ═══ 14. FOOTER ═══ */}
      <div style={css.footer}>
        <p>Built by <a href="https://aiindigo.com" target="_blank" rel="noopener noreferrer" style={css.link}>AI Indigo</a> · <a href="https://futuretoolsai.com" target="_blank" rel="noopener noreferrer" style={css.link}>FutureTools AI</a> · <a href="https://openclawterrace.com" target="_blank" rel="noopener noreferrer" style={css.link}>OpenClaw Terrace</a> · <a href="https://github.com/aiindigo925/btcfi-api" target="_blank" rel="noopener noreferrer" style={css.link}>GitHub</a></p>
        <p style={{ marginTop: '8px' }}>Powered by <a href="https://mempool.space/" target="_blank" rel="noopener noreferrer" style={css.link}>mempool.space</a> · <a href="https://solv.finance" target="_blank" rel="noopener noreferrer" style={css.link}>Solv Protocol</a> · <a href="https://whistle.ninja" target="_blank" rel="noopener noreferrer" style={css.link}>Whistle Network</a> · <a href="https://perkinsfund.org" target="_blank" rel="noopener noreferrer" style={css.link}>PCEF/NLx402</a></p>
      </div>
    </div>
  );
}
