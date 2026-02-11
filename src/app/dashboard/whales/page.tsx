'use client';

import { useState, useEffect, useRef } from 'react';

const API = 'https://btcfi.aiindigo.com';

interface WhaleEvent {
  id: string;
  amount: string;
  txid: string;
  time: string;
  type: string;
}

export default function WhalesPage() {
  const [whales, setWhales] = useState<WhaleEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [initial, setInitial] = useState<any[]>([]);

  useEffect(() => {
    fetch(`${API}/api/v1/intelligence/whales`)
      .then(r => r.json())
      .then(d => setInitial(d.data?.transactions || d.data?.whaleTransactions || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const es = new EventSource(`${API}/api/v1/stream/whales?min=50`);

    // SSE named events require addEventListener (onmessage only catches unnamed events)
    es.addEventListener('connected', () => setConnected(true));
    es.addEventListener('whale_tx', ((event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        const d = parsed.data || parsed;
        setWhales(prev => [{
          id: `${Date.now()}-${Math.random()}`,
          amount: d.valueBtc || d.totalValueBtc || d.amount || '?',
          txid: d.txid || '',
          time: new Date().toLocaleTimeString(),
          type: 'live',
        }, ...prev].slice(0, 50));
      } catch { /* ignore */ }
    }) as EventListener);
    es.onopen = () => setConnected(true);
    es.onerror = () => setConnected(false);
    return () => { es.close(); };
  }, []);

  const card = { background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '16px' };
  const allWhales = [...whales, ...initial.map((w, i) => ({
    id: `init-${i}`,
    amount: w.totalValueBtc || w.valueBtc || w.amount || '?',
    txid: w.txid || '',
    time: w.time || '',
    type: 'historical',
  }))].slice(0, 50);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ color: '#f7931a', fontSize: '24px' }}>🐋 Whale Watch</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#4ade80' : '#ef4444' }} />
          <span style={{ color: '#666', fontSize: '12px' }}>{connected ? 'Live' : 'Connecting...'}</span>
        </div>
      </div>

      <div style={card}>
        {allWhales.length === 0 ? (
          <div style={{ color: '#666', textAlign: 'center' as const, padding: '20px' }}>
            Waiting for whale activity...
          </div>
        ) : (
          allWhales.map(w => (
            <div key={w.id} style={{ padding: '10px 0', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: '#f7931a', fontWeight: 600, fontSize: '16px' }}>🐋 {w.amount} BTC</span>
                <div style={{ color: '#666', fontSize: '11px', marginTop: '2px', fontFamily: 'monospace' }}>
                  {w.txid ? `${w.txid.slice(0, 24)}...` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right' as const }}>
                <div style={{ color: '#888', fontSize: '11px' }}>{w.time}</div>
                <div style={{ color: '#666', fontSize: '10px' }}>{w.type}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
