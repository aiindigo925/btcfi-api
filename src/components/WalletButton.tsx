'use client';

import { useState } from 'react';
import { useWallet } from './WalletProvider';

export function WalletButton() {
  const { connected, address, chain, connecting, connectEvm, connectSolana, disconnect } = useWallet();
  const [showMenu, setShowMenu] = useState(false);

  if (connected) {
    const short = address.slice(0, 6) + '...' + address.slice(-4);
    const icon = chain === 'evm' ? '🔵' : '🟣';
    return (
      <div>
        <div style={{ fontSize: '11px', color: '#666', marginBottom: '4px' }}>Connected</div>
        <div style={{ fontSize: '12px', color: '#4ade80', marginBottom: '6px' }}>{icon} {short}</div>
        <button
          onClick={disconnect}
          style={{
            background: 'transparent',
            border: '1px solid #333',
            color: '#666',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Disconnect
        </button>
      </div>
    );
  }

  if (showMenu) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <button
          onClick={() => { connectEvm(); setShowMenu(false); }}
          disabled={connecting}
          style={{
            background: '#111',
            border: '1px solid #222',
            color: '#fff',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          🔵 MetaMask / Coinbase
        </button>
        <button
          onClick={() => { connectSolana(); setShowMenu(false); }}
          disabled={connecting}
          style={{
            background: '#111',
            border: '1px solid #222',
            color: '#fff',
            borderRadius: '4px',
            padding: '6px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            textAlign: 'left',
          }}
        >
          🟣 Phantom (Solana)
        </button>
        <button
          onClick={() => setShowMenu(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#666',
            fontSize: '11px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: '4px',
          }}
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setShowMenu(true)}
      style={{
        background: '#f7931a',
        color: '#000',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 12px',
        fontSize: '12px',
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
        width: '100%',
      }}
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
