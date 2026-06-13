/**
 * Wallet Portfolio Analytics — UTXO analysis, balance, age distribution,
 * cost basis, unrealized PnL, dust detection.
 */
import { getAddressUtxos, getBtcPrice, type UTXO } from './bitcoin';

const DUST_THRESHOLD = 546; // satoshis

export interface AgeBucket {
  label: string;
  count: number;
  totalBtc: number;
  percentOfValue: number;
}

export interface PortfolioAnalytics {
  address: string;
  totalBalance: {
    btc: number;
    usd: number;
    eur: number;
  };
  utxoCount: number;
  ageDistribution: AgeBucket[];
  costBasis: {
    totalSats: number;
    avgEntryPriceUsd: number;
  };
  unrealizedPnl: {
    btc: number;
    usd: number;
    percent: number;
  };
  largestUtxo: {
    txid: string;
    vout: number;
    value: number;
    valueUsd: number;
    confirmed: boolean;
  } | null;
  dustUtxos: number;
  dustValueSats: number;
  timestamp: string;
}

const AGE_RANGES: { label: string; maxDays: number }[] = [
  { label: '<1d', maxDays: 1 },
  { label: '1-7d', maxDays: 7 },
  { label: '7-30d', maxDays: 30 },
  { label: '1-3m', maxDays: 90 },
  { label: '3-6m', maxDays: 180 },
  { label: '6-12m', maxDays: 365 },
  { label: '1-2yr', maxDays: 730 },
  { label: '2-5yr', maxDays: 1825 },
  { label: '5yr+', maxDays: Infinity },
];

/** Approximate creation-price ratio based on coin age (power-law approximation) */
function estimateCreationPriceRatio(ageDays: number): number {
  if (ageDays <= 1) return 0.995;
  if (ageDays <= 7) return 0.97;
  if (ageDays <= 30) return 0.90;
  if (ageDays <= 90) return 0.82;
  if (ageDays <= 180) return 0.73;
  if (ageDays <= 365) return 0.62;
  if (ageDays <= 730) return 0.45;
  if (ageDays <= 1095) return 0.33;
  if (ageDays <= 1825) return 0.18;
  return 0.10;
}

export async function getPortfolioAnalytics(address: string): Promise<PortfolioAnalytics> {
  const [utxos, price] = await Promise.all([
    getAddressUtxos(address),
    getBtcPrice(),
  ]);

  const now = Date.now() / 1000;
  const BLOCKS_PER_DAY = 144;
  const currentBlockHeight = 0; // We don't know without an API call; use timestamp instead

  let totalSats = 0;
  let costBasisSats = 0;
  let dustCount = 0;
  let dustValue = 0;
  let largestUtxo: PortfolioAnalytics['largestUtxo'] = null;

  const ageCounts = AGE_RANGES.map(() => ({ count: 0, sats: 0 }));

  for (const utxo of utxos) {
    totalSats += utxo.value;

    // Age estimation from block_time
    const blockTime = utxo.status.block_time || now;
    const ageSeconds = Math.max(0, now - blockTime);
    const ageDays = ageSeconds / 86400;
    const ratio = estimateCreationPriceRatio(ageDays);
    costBasisSats += Math.round(utxo.value * ratio);

    // Age bucket
    for (let i = 0; i < AGE_RANGES.length; i++) {
      if (ageDays < AGE_RANGES[i].maxDays) {
        ageCounts[i].count += 1;
        ageCounts[i].sats += utxo.value;
        break;
      }
    }

    // Dust
    if (utxo.value <= DUST_THRESHOLD) {
      dustCount += 1;
      dustValue += utxo.value;
    }

    // Largest
    if (!largestUtxo || utxo.value > largestUtxo.value) {
      largestUtxo = {
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        valueUsd: utxo.value / 1e8 * price.USD,
        confirmed: utxo.status.confirmed,
      };
    }
  }

  const btcPerUnit = 1e8;
  const totalBtc = totalSats / btcPerUnit;
  const costBasisBtc = costBasisSats / btcPerUnit;
  const costBasisUsd = costBasisBtc * price.USD;
  const avgEntryUsd = costBasisBtc > 0 ? costBasisUsd / totalBtc : price.USD;
  const currentValueUsd = totalBtc * price.USD;
  const unrealizedUsd = currentValueUsd - costBasisUsd;
  const unrealizedPct = costBasisUsd > 0 ? (unrealizedUsd / costBasisUsd) * 100 : 0;

  const ageDistribution: AgeBucket[] = AGE_RANGES.map((range, i) => ({
    label: range.label,
    count: ageCounts[i].count,
    totalBtc: Math.round(ageCounts[i].sats / btcPerUnit * 10000) / 10000,
    percentOfValue: totalSats > 0
      ? Math.round(ageCounts[i].sats / totalSats * 10000) / 100
      : 0,
  }));

  return {
    address,
    totalBalance: {
      btc: Math.round(totalBtc * 10000) / 10000,
      usd: Math.round(currentValueUsd * 100) / 100,
      eur: Math.round(currentValueUsd / price.USD * price.EUR * 100) / 100,
    },
    utxoCount: utxos.length,
    ageDistribution,
    costBasis: {
      totalSats: costBasisSats,
      avgEntryPriceUsd: Math.round(avgEntryUsd * 100) / 100,
    },
    unrealizedPnl: {
      btc: Math.round((totalBtc - costBasisBtc) * 10000) / 10000,
      usd: Math.round(unrealizedUsd * 100) / 100,
      percent: Math.round(unrealizedPct * 100) / 100,
    },
    largestUtxo,
    dustUtxos: dustCount,
    dustValueSats: dustValue,
    timestamp: new Date().toISOString(),
  };
}
