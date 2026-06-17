/**
 * Multi-Address Portfolio Analytics — V2
 * Track and analyze portfolios across multiple Bitcoin addresses.
 * Saves portfolios to Redis, aggregates analytics across all addresses.
 */

import { getRedis, safeGet, safeSet } from './redis';
import { getAddressUtxos, getAddressInfo, getBtcPrice, type UTXO } from './bitcoin';
import { getEntityLabel } from './entities';
import { getAddressRisk } from './intelligence';

const PORTFOLIO_CACHE_TTL = 300; // 5 minutes
const ANALYTICS_CACHE_TTL = 120; // 2 minutes (lighter cache since heavier compute)
const PORTFOLIO_KEY_PREFIX = 'portfolio:v2:';

// ============ TYPES ============

export interface PortfolioAddress {
  address: string;
  label?: string;
  addedAt: string;
}

export interface Portfolio {
  userId: string;
  addresses: PortfolioAddress[];
  createdAt: string;
  updatedAt: string;
}

export interface AddressAnalytics {
  address: string;
  label?: string;
  balance: {
    sats: number;
    btc: number;
    usd: number;
  };
  riskScore: number;
  riskGrade: string;
  entity: {
    name: string;
    type: string;
    isExchange: boolean;
  };
  utxoCount: number;
  ageDistribution: {
    label: string;
    count: number;
    sats: number;
    percent: number;
  }[];
  allocation: number; // percentage of total portfolio
}

export interface PortfolioAnalytics {
  userId: string;
  totalAddresses: number;
  totalBalance: {
    sats: number;
    btc: number;
    usd: number;
  };
  aggregateRisk: {
    score: number;
    grade: string;
    pattern: string;
  };
  ageDistribution: {
    label: string;
    count: number;
    sats: number;
    percent: number;
  }[];
  entityBreakdown: {
    name: string;
    type: string;
    balanceSats: number;
    balanceBtc: number;
    balanceUsd: number;
    allocationPercent: number;
    addresses: string[];
  }[];
  addresses: AddressAnalytics[];
  timestamp: string;
}

// ============ AGE BUCKETS ============

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

// ============ PORTFOLIO CRUD ============

/**
 * Create or update a portfolio for a user.
 */
export async function createPortfolio(
  userId: string,
  addresses: string[],
): Promise<Portfolio> {
  const redis = getRedis();
  const key = PORTFOLIO_KEY_PREFIX + userId;

  const existing = await safeGet(key);
  let existingAddresses: PortfolioAddress[] = [];

  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      existingAddresses = parsed.addresses || [];
    } catch { /* ignore */ }
  }

  const now = new Date().toISOString();

  // Merge: keep existing labels, add new addresses
  const addressSet = new Set(existingAddresses.map(a => a.address));
  const mergedAddresses: PortfolioAddress[] = [...existingAddresses];

  for (const addr of addresses) {
    if (!addressSet.has(addr)) {
      mergedAddresses.push({
        address: addr,
        addedAt: now,
      });
    }
  }

  const portfolio: Portfolio = {
    userId,
    addresses: mergedAddresses,
    createdAt: existing ? (existing ? JSON.parse(existing).createdAt : now) : now,
    updatedAt: now,
  };

  await safeSet(key, JSON.stringify(portfolio), undefined);
  return portfolio;
}

/**
 * Get a saved portfolio by userId.
 */
export async function getPortfolio(userId: string): Promise<Portfolio | null> {
  const key = PORTFOLIO_KEY_PREFIX + userId;
  const cached = await safeGet(key);
  if (!cached) return null;

  try {
    return JSON.parse(cached) as Portfolio;
  } catch {
    return null;
  }
}

// ============ ANALYTICS ============

/**
 * Analyze a single address for portfolio context.
 */
async function analyzeSingleAddress(
  address: string,
  totalPortfolioSats: number,
): Promise<AddressAnalytics> {
  const now = Date.now() / 1000;

  const [utxos, info, price, risk] = await Promise.all([
    getAddressUtxos(address),
    getAddressInfo(address),
    getBtcPrice(),
    getAddressRisk(address).catch(() => null),
  ]);

  const balanceSats = info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
  const balanceBtc = balanceSats / 1e8;
  const balanceUsd = balanceBtc * price.USD;

  // Entity lookup
  const entity = getEntityLabel(address);
  const isExchange = entity?.type === 'exchange';

  // Age distribution
  const ageCounts = AGE_RANGES.map(() => ({ count: 0, sats: 0 }));
  for (const utxo of utxos) {
    const blockTime = utxo.status.block_time || now;
    const ageDays = Math.max(0, (now - blockTime) / 86400);
    for (let i = 0; i < AGE_RANGES.length; i++) {
      if (ageDays < AGE_RANGES[i].maxDays) {
        ageCounts[i].count += 1;
        ageCounts[i].sats += utxo.value;
        break;
      }
    }
  }

  const ageDistribution = AGE_RANGES.map((range, i) => ({
    label: range.label,
    count: ageCounts[i].count,
    sats: ageCounts[i].sats,
    percent: balanceSats > 0
      ? Math.round(ageCounts[i].sats / balanceSats * 10000) / 100
      : 0,
  }));

  return {
    address,
    label: entity?.entity,
    balance: { sats: balanceSats, btc: Math.round(balanceBtc * 10000) / 10000, usd: Math.round(balanceUsd * 100) / 100 },
    riskScore: risk?.riskScore ?? 0,
    riskGrade: risk?.riskGrade ?? 'N/A',
    entity: {
      name: entity?.entity ?? 'Unknown',
      type: entity?.type ?? 'unknown',
      isExchange,
    },
    utxoCount: utxos.length,
    ageDistribution,
    allocation: totalPortfolioSats > 0
      ? Math.round(balanceSats / totalPortfolioSats * 10000) / 100
      : 0,
  };
}

/**
 * Full portfolio analytics across all addresses.
 */
export async function analyzePortfolio(userId: string): Promise<PortfolioAnalytics | null> {
  const portfolio = await getPortfolio(userId);
  if (!portfolio || portfolio.addresses.length === 0) return null;

  // Check analytics cache
  const analyticsKey = `portfolio:analytics:${userId}`;
  const cached = await safeGet(analyticsKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  const price = await getBtcPrice();

  // First pass: get balances for all addresses to compute allocation %
  const addressResults: AddressAnalytics[] = [];
  let totalSats = 0;

  // Quick balance pass
  const balances = await Promise.allSettled(
    portfolio.addresses.map(async (a) => {
      const info = await getAddressInfo(a.address);
      return info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
    }),
  );

  for (const result of balances) {
    if (result.status === 'fulfilled') {
      totalSats += result.value;
    }
  }

  // Full analysis pass
  const analysisResults = await Promise.allSettled(
    portfolio.addresses.map(async (a) => {
      return analyzeSingleAddress(a.address, totalSats);
    }),
  );

  for (const result of analysisResults) {
    if (result.status === 'fulfilled') {
      addressResults.push(result.value);
    }
  }

  // Sort by balance descending
  addressResults.sort((a, b) => b.balance.sats - a.balance.sats);

  // Aggregate age distribution
  const aggregatedAge = AGE_RANGES.map((range, i) => {
    let count = 0;
    let sats = 0;
    for (const addr of addressResults) {
      count += addr.ageDistribution[i].count;
      sats += addr.ageDistribution[i].sats;
    }
    return {
      label: range.label,
      count,
      sats,
      percent: totalSats > 0 ? Math.round(sats / totalSats * 10000) / 100 : 0,
    };
  });

  // Aggregate risk (weighted average by balance)
  let weightedRiskSum = 0;
  let weightedCount = 0;
  for (const addr of addressResults) {
    if (addr.balance.sats > 0) {
      weightedRiskSum += addr.riskScore * addr.balance.sats;
      weightedCount += addr.balance.sats;
    }
  }
  const aggregateScore = weightedCount > 0 ? Math.round(weightedRiskSum / weightedCount) : 0;
  const aggregateGrade = aggregateScore <= 15 ? 'A' : aggregateScore <= 30 ? 'B' : aggregateScore <= 50 ? 'C' : aggregateScore <= 70 ? 'D' : 'F';
  const aggregatePattern = aggregateScore <= 30 ? 'low_risk_portfolio' : aggregateScore <= 50 ? 'moderate_risk_portfolio' : 'elevated_risk_portfolio';

  // Entity breakdown
  const entityMap = new Map<string, {
    name: string;
    type: string;
    balanceSats: number;
    addresses: string[];
  }>();

  for (const addr of addressResults) {
    const entityKey = addr.entity.name;
    const existing = entityMap.get(entityKey);
    if (existing) {
      existing.balanceSats += addr.balance.sats;
      existing.addresses.push(addr.address);
    } else {
      entityMap.set(entityKey, {
        name: addr.entity.name,
        type: addr.entity.type,
        balanceSats: addr.balance.sats,
        addresses: [addr.address],
      });
    }
  }

  const entityBreakdown = Array.from(entityMap.values())
    .map(e => ({
      ...e,
      balanceBtc: Math.round(e.balanceSats / 1e8 * 10000) / 10000,
      balanceUsd: Math.round(e.balanceSats / 1e8 * price.USD * 100) / 100,
      allocationPercent: totalSats > 0 ? Math.round(e.balanceSats / totalSats * 10000) / 100 : 0,
    }))
    .sort((a, b) => b.balanceSats - a.balanceSats);

  const analytics: PortfolioAnalytics = {
    userId,
    totalAddresses: addressResults.length,
    totalBalance: {
      sats: totalSats,
      btc: Math.round(totalSats / 1e8 * 10000) / 10000,
      usd: Math.round(totalSats / 1e8 * price.USD * 100) / 100,
    },
    aggregateRisk: {
      score: aggregateScore,
      grade: aggregateGrade,
      pattern: aggregatePattern,
    },
    ageDistribution: aggregatedAge,
    entityBreakdown,
    addresses: addressResults,
    timestamp: new Date().toISOString(),
  };

  await safeSet(analyticsKey, JSON.stringify(analytics), ANALYTICS_CACHE_TTL);
  return analytics;
}
