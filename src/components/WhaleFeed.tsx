'use client';

import { useState, useEffect } from 'react';

interface WhaleTx {
  txid: string;
  valueBtc: number;
  valueUsd: number;
  timeAgo: string;
  signal: 'buy' | 'sell' | 'neutral';
}

function formatTime(ms: number): string {
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hrs = Math.floor(min / 60);
  return `${hrs}h ago`;
}

export default function WhaleFeed() {
  const [whales, setWhales] = useState<WhaleTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchWhales() {
      try {
        const res = await fetch('/api/v1/intelligence/whales', {
          headers: { 'X-Internal-Key': 'landing-page' },
        });
        if (!res.ok) throw new Error('fetch failed');
        const json = await res.json();
        const txs = (json.data?.transactions || json.transactions || []).slice(0, 3);
        if (mounted) {
          setWhales(txs.map((tx: any) => ({
            txid: tx.txid || tx.hash || '???',
            valueBtc: parseFloat(tx.totalValueBtc) || tx.valueBtc || tx.value || 0,
            valueUsd: parseFloat(tx.totalValueUsd) || tx.valueUsd || tx.usd || 0,
            timeAgo: formatTime(Date.now() - (tx.timestamp ? tx.timestamp * 1000 : Date.now())),
            signal: tx.signal || 'neutral',
          })));
        }
      } catch {
        if (mounted) setWhales([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    fetchWhales();
    const interval = setInterval(fetchWhales, 60000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const signalIcon = (s: string) => s === 'buy' ? '🟢' : s === 'sell' ? '🔴' : '⚪';

  if (loading) {
    return (
      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>Loading whale feed...</p>
      </div>
    );
  }

  if (whales.length === 0) {
    return (
      <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: '24px', marginBottom: '8px' }}>🐋</div>
        <p style={{ color: '#888', fontSize: '14px', margin: '0 0 4px 0' }}>Whale feed loading...</p>
        <p style={{ color: '#555', fontSize: '12px', margin: 0 }}>Real-time alerts on <a href="https://t.me/BTCFi_Whales" target="_blank" rel="noopener noreferrer" style={{ color: '#f7931a', textDecoration: 'none' }}>@BTCFi_Whales</a></p>
      </div>
    );
  }

  return (
    <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <span style={{ color: '#fff', fontSize: '15px', fontWeight: 600 }}>🐋 Live Whale Feed</span>
        <span style={{ color: '#555', fontSize: '11px' }}>updates every 60s</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {whales.map((w, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a0a0a', borderRadius: '8px', padding: '12px 14px' }}>
            <div>
              <span style={{ fontSize: '13px' }}>{signalIcon(w.signal)} </span>
              <span style={{ color: '#f7931a', fontSize: '15px', fontWeight: 700 }}>{w.valueBtc.toFixed(1)} BTC</span>
              <span style={{ color: '#666', fontSize: '13px', marginLeft: '8px' }}>${w.valueUsd.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <span style={{ color: '#555', fontSize: '12px' }}>{w.timeAgo}</span>
          </div>
        ))}
      </div>
      <div style={{ textAlign: 'center', marginTop: '12px' }}>
        <a href="https://t.me/BTCFi_Whales" target="_blank" rel="noopener noreferrer" style={{ color: '#f7931a', textDecoration: 'none', fontSize: '13px' }}>Join @BTCFi_Whales for all alerts →</a>
      </div>
    </div>
  );
}
