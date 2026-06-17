/**
 * Solana Data Provider — MP5 Phase 8
 * Uses centralized Solana RPC from lib/rpc (with Whistle + fallback).
 */

import { solanaRpcCall } from '@/lib/rpc';
import { isValidSolanaAddress } from '@/lib/validation';

// All RPC calls go through centralized solanaRpcCall with Whistle primary + auto-fallback.

export async function getSolFees() {
  const [fees, perfSamples, slot] = await Promise.all([
    solanaRpcCall('getRecentPrioritizationFees') as Promise<any>,
    solanaRpcCall('getRecentPerformanceSamples', [1]) as Promise<any>,
    solanaRpcCall('getSlot') as Promise<any>,
  ]);

  // Calculate priority fee percentiles
  const feeValues = (fees as any[]).map(f => f.prioritizationFee).filter((f: number) => f > 0).sort((a: number, b: number) => a - b);
  const median = feeValues.length > 0 ? feeValues[Math.floor(feeValues.length / 2)] : 0;
  const p75 = feeValues.length > 0 ? feeValues[Math.floor(feeValues.length * 0.75)] : 0;

  const sample = (perfSamples as any[])?.[0];
  const tps = sample ? Math.round(sample.numTransactions / sample.samplePeriodSecs) : 0;

  return {
    priorityFees: {
      median: median + ' microlamports',
      p75: p75 + ' microlamports',
      samples: feeValues.length,
    },
    slot,
    tps,
    baseFee: '5000 lamports (0.000005 SOL)',
  };
}

export async function getSolAddress(addr: string) {
  if (!isValidSolanaAddress(addr)) throw new Error('Invalid Solana address');
  const [balance, accountInfo] = await Promise.all([
    solanaRpcCall('getBalance', [addr]) as Promise<any>,
    solanaRpcCall('getAccountInfo', [addr, { encoding: 'jsonParsed' }]) as Promise<any>,
  ]);

  const lamports = balance?.value || 0;
  const sol = (lamports / 1e9).toFixed(9);

  // Get token accounts
  let tokenAccounts: any[] = [];
  try {
    const tokens = await solanaRpcCall('getTokenAccountsByOwner', [
      addr,
      { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
      { encoding: 'jsonParsed' },
    ]) as any;
    tokenAccounts = (tokens?.value || []).map((t: any) => {
      const info = t.account?.data?.parsed?.info;
      return {
        mint: info?.mint,
        amount: info?.tokenAmount?.uiAmountString,
        decimals: info?.tokenAmount?.decimals,
      };
    }).filter((t: any) => parseFloat(t.amount) > 0);
  } catch { /* token fetch optional */ }

  return {
    address: addr,
    balance: { lamports, sol },
    executable: accountInfo?.value?.executable || false,
    owner: accountInfo?.value?.owner || null,
    tokenAccounts: tokenAccounts.slice(0, 10),
  };
}
