'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const API = 'https://btcfi.aiindigo.com';
const MAX_BACKOFF = 30000; // 30 seconds

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
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000); // start at 1s
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    fetch(`${API}/api/v1/intelligence/whales`)
      .then(r => r.json())
      .then(d => setInitial(d.data?.transactions || d.data?.whaleTransactions || []))
      .catch(() => {});
  }, []);

  const connect = useCallback(() => {
    const es = new EventSource(`${API}/api/v1/stream/whales?min=50`);
    esRef.current = es;

    const onConnected = () => {
      setConnected(true);
      backoffRef.current = 1000; // reset backoff on successful connect
    };

    const onWhaleTx = ((event: MessageEvent) => {
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
        setLastUpdate(new Date().toLocaleTimeString());
      } catch { /* ignore */ }
    }) as EventListener;

    es.addEventListener('connected', onConnected);
    es.addEventListener('whale_tx', onWhaleTx);
    es.onopen = onConnected;

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Exponential backoff reconnect
      const delay = Math.min(backoffRef.current, MAX_BACKOFF);
      reconnectTimeoutRef.current = setTimeout(() => {
        backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
        connect();
      }, delay);
    };

    return es;
  }, []);

  useEffect(() => {
    const es = connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      es.close();
    };
  }, [connect]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: connected ? '#4ade80' : '#ef4444' }} />
            <span style={{ color: '#666', fontSize: '12px' }}>{connected ? 'Live' : 'Reconnecting...'}</span>
          </div>
          {lastUpdate && (
            <span style={{ color: '#555', fontSize: '11px' }}>Last update: {lastUpdate}</span>
          )}
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
