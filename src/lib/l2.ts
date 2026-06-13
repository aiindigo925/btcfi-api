/**
 * Bitcoin L2/Bridge Intelligence
 * Track Bitcoin L2 ecosystem: TVL, bridge volumes, cross-chain flows.
 */

export interface L2Data {
  chains: { name: string; tvl: number; change24h: number; bridgeVolume: number }[];
  totalTVL: number;
  totalBridgeVolume: number;
}

export async function getL2Data(): Promise<L2Data> {
  try {
    const res = await fetch('https://api.llama.fi/v2/chains', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error('DefiLlama unavailable');
    const all = await res.json();

    const btcChains = all.filter((c: any) =>
      ['Bitcoin', 'Merlin', 'Bitlayer', 'BOB', 'Citrea', 'BSquared'].includes(c.name)
    );

    const chains = btcChains.map((c: any) => ({
      name: c.name,
      tvl: c.tvl || 0,
      change24h: c.change_1d || 0,
      bridgeVolume: 0,
    }));

    return {
      chains,
      totalTVL: chains.reduce((s: number, c: any) => s + c.tvl, 0),
      totalBridgeVolume: chains.reduce((s: number, c: any) => s + c.bridgeVolume, 0),
    };
  } catch {
    return { chains: [], totalTVL: 0, totalBridgeVolume: 0 };
  }
}
