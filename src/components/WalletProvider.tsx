'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

interface WalletState {
  connected: boolean;
  address: string;
  chain: 'evm' | 'solana' | null;
  connecting: boolean;
  btcAddresses: string[];
  connectEvm: () => Promise<void>;
  connectSolana: () => Promise<void>;
  disconnect: () => void;
  addBtcAddress: (addr: string) => void;
  removeBtcAddress: (addr: string) => void;
}

const WalletContext = createContext<WalletState>({
  connected: false,
  address: '',
  chain: null,
  connecting: false,
  btcAddresses: [],
  connectEvm: async () => {},
  connectSolana: async () => {},
  disconnect: () => {},
  addBtcAddress: () => {},
  removeBtcAddress: () => {},
});

export function useWallet() {
  return useContext(WalletContext);
}

const STORAGE_KEY = 'btcfi-wallet';
const BTC_STORAGE_KEY = 'btcfi-btc-addresses';

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState('');
  const [chain, setChain] = useState<'evm' | 'solana' | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [btcAddresses, setBtcAddresses] = useState<string[]>([]);

  // Restore state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const { address: a, chain: c } = JSON.parse(saved);
        if (a && c) { setAddress(a); setChain(c); }
      }
      const btc = localStorage.getItem(BTC_STORAGE_KEY);
      if (btc) setBtcAddresses(JSON.parse(btc));
    } catch {}
  }, []);

  const connectEvm = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      alert('Please install MetaMask or Coinbase Wallet');
      return;
    }
    setConnecting(true);
    try {
      const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts?.[0]) {
        setAddress(accounts[0]);
        setChain('evm');
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: accounts[0], chain: 'evm' }));
      }
    } catch (err) {
      console.error('EVM connect failed:', err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectSolana = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).solana?.isPhantom) {
      alert('Please install Phantom wallet');
      return;
    }
    setConnecting(true);
    try {
      const resp = await (window as any).solana.connect();
      const addr = resp.publicKey.toString();
      setAddress(addr);
      setChain('solana');
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ address: addr, chain: 'solana' }));
    } catch (err) {
      console.error('Solana connect failed:', err);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress('');
    setChain(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const addBtcAddress = useCallback((addr: string) => {
    setBtcAddresses(prev => {
      if (prev.includes(addr) || prev.length >= 5) return prev;
      const next = [...prev, addr];
      localStorage.setItem(BTC_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const removeBtcAddress = useCallback((addr: string) => {
    setBtcAddresses(prev => {
      const next = prev.filter(a => a !== addr);
      localStorage.setItem(BTC_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <WalletContext.Provider value={{
      connected: !!address,
      address,
      chain,
      connecting,
      btcAddresses,
      connectEvm,
      connectSolana,
      disconnect,
      addBtcAddress,
      removeBtcAddress,
    }}>
      {children}
    </WalletContext.Provider>
  );
}
