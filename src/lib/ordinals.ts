/**
 * Ordinals/Runes/BRC-20 Intelligence
 * Bitcoin-native NFT and token protocol data.
 */

import { NextResponse } from 'next/server';

const HIRO_API = 'https://api.hiro.so';

export interface OrdinalsStats {
  totalInscriptions: number;
  dailyVolume: number;
  topCollections: { name: string; count: number; floor: number }[];
  runesActive: boolean;
}

export async function getOrdinalsStats(): Promise<OrdinalsStats> {
  try {
    const res = await fetch(`${HIRO_API}/ordinals/v1/inscriptions/count`, {
      signal: AbortSignal.timeout(10000),
    });
    const { total } = res.ok ? await res.json() : { total: 0 };

    return {
      totalInscriptions: total,
      dailyVolume: 0,
      topCollections: [],
      runesActive: true,
    };
  } catch {
    return { totalInscriptions: 0, dailyVolume: 0, topCollections: [], runesActive: false };
  }
}

export async function getBRC20Token(ticker: string) {
  try {
    const res = await fetch(`${HIRO_API}/ordinals/v1/brc-20/tokens/${ticker}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      ticker: data.id?.split('-')[0] || ticker,
      totalSupply: data.total_supply || '0',
      minted: data.minted_supply || '0',
      holders: data.holders || 0,
      deployHeight: data.deploy_height || 0,
    };
  } catch {
    return null;
  }
}

export async function getRunesStats() {
  try {
    const res = await fetch(`${HIRO_API}/runes/v1/stats`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { totalRunes: 0, activeRunes: 0, totalEtchings: 0 };
    const data = await res.json();
    return {
      totalRunes: data.total_runes || 0,
      activeRunes: data.active_runes || 0,
      totalEtchings: data.total_etchings || 0,
    };
  } catch {
    return { totalRunes: 0, activeRunes: 0, totalEtchings: 0 };
  }
}
