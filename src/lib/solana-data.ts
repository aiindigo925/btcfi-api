/**
 * Solana Data Provider — MP5 Phase 8
 * Uses fetch-based JSON-RPC (no @solana/web3.js dependency).
 */

const RPC_URL = process.env.SOL_RPC_URL || 'https://api.mainnet-beta.solana.com';
const FALLBACK_RPC = 'https://rpc.ankr.com/solana';

async function rpcCall(method: string, params: unknown[] = [], rpcUrl = RPC_URL): Promise<any> {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.result;
}

async function withFallback<T>(fn: (rpcUrl: string) => Promise<T>): Promise<T> {
  try {
    return await fn(RPC_URL);
  } catch {
    return await fn(FALLBACK_RPC);
  }
}

export async function getSolFees() {
  return withFallback(async (rpcUrl) => {
    const [fees, perfSamples, slot] = await Promise.all([
      rpcCall('getRecentPrioritizationFees', [], rpcUrl),
      rpcCall('getRecentPerformanceSamples', [1], rpcUrl),
      rpcCall('getSlot', [], rpcUrl),
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
  });
}

export async function getSolAddress(addr: string) {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(addr)) throw new Error('Invalid Solana address');
  return withFallback(async (rpcUrl) => {
    const [balance, accountInfo] = await Promise.all([
      rpcCall('getBalance', [addr], rpcUrl),
      rpcCall('getAccountInfo', [addr, { encoding: 'jsonParsed' }], rpcUrl),
    ]);

    const lamports = balance?.value || 0;
    const sol = (lamports / 1e9).toFixed(9);

    // Get token accounts
    let tokenAccounts: any[] = [];
    try {
      const tokens = await rpcCall('getTokenAccountsByOwner', [
        addr,
        { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
        { encoding: 'jsonParsed' },
      ], rpcUrl);
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
  });
}
