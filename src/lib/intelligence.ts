/**
 * BTCFi Intelligence Library
 * Smart analysis on top of raw Bitcoin data.
 * Phase 2 (MP0) — what Engrave mocks up, we ship.
 */

import {
  getAddressUtxos,
  getAddressInfo,
  getAddressTxs,
  getRecommendedFees,
  getMempoolSummary,
  getMempoolRecent,
  getBlockHeight,
  getLatestBlocks,
  getBtcPrice,
  type UTXO,
  type Transaction,
  type RecommendedFees,
} from './bitcoin';

// ============ UTXO CONSOLIDATION ADVISOR ============

export interface ConsolidationAdvice {
  address: string;
  utxoCount: number;
  dustUtxos: number;
  estimatedVsize: number;
  feeWindows: {
    label: string;
    feeRate: number;
    totalFeeSats: number;
    totalFeeUsd: string;
  }[];
  recommendation: string;
  savings: {
    currentSpendCost: string;
    afterConsolidation: string;
    saved: string;
  };
}

export async function getConsolidationAdvice(address: string): Promise<ConsolidationAdvice> {
  const [utxos, fees, price] = await Promise.all([
    getAddressUtxos(address),
    getRecommendedFees(),
    getBtcPrice(),
  ]);

  const DUST_THRESHOLD = 546;
  const INPUT_VSIZE = 68;   // P2WPKH input
  const OUTPUT_VSIZE = 31;  // P2WPKH output
  const OVERHEAD = 11;

  const dustUtxos = utxos.filter(u => u.value <= DUST_THRESHOLD);
  const estimatedVsize = OVERHEAD + (utxos.length * INPUT_VSIZE) + OUTPUT_VSIZE;

  const feeWindows = [
    { label: 'Fastest (~10 min)', feeRate: fees.fastestFee },
    { label: '~30 min', feeRate: fees.halfHourFee },
    { label: '~1 hour', feeRate: fees.hourFee },
    { label: 'Economy', feeRate: fees.economyFee },
  ].map(w => ({
    ...w,
    totalFeeSats: w.feeRate * estimatedVsize,
    totalFeeUsd: (w.feeRate * estimatedVsize / 1e8 * price.USD).toFixed(4),
  }));

  const singleSpendVsize = OVERHEAD + INPUT_VSIZE + OUTPUT_VSIZE;
  const currentSpendCostSats = utxos.length * fees.hourFee * singleSpendVsize;
  const afterConsolidationSats = fees.hourFee * singleSpendVsize;
  const consolidationFeeSats = fees.economyFee * estimatedVsize;
  const netSavings = currentSpendCostSats - afterConsolidationSats - consolidationFeeSats;

  let recommendation: string;
  if (utxos.length <= 2) {
    recommendation = 'No consolidation needed — you have few UTXOs.';
  } else if (fees.economyFee <= 4) {
    recommendation = `Excellent time to consolidate! Economy fee is only ${fees.economyFee} sat/vB.`;
  } else if (fees.economyFee <= 10) {
    recommendation = `Good time. ${fees.economyFee} sat/vB economy. Consider waiting for lower if not urgent.`;
  } else {
    recommendation = `Fees elevated (${fees.economyFee} sat/vB). Wait for quieter mempool unless urgent.`;
  }

  return {
    address,
    utxoCount: utxos.length,
    dustUtxos: dustUtxos.length,
    estimatedVsize,
    feeWindows,
    recommendation,
    savings: {
      currentSpendCost: `${currentSpendCostSats} sats ($${(currentSpendCostSats / 1e8 * price.USD).toFixed(4)})`,
      afterConsolidation: `${afterConsolidationSats + consolidationFeeSats} sats ($${((afterConsolidationSats + consolidationFeeSats) / 1e8 * price.USD).toFixed(4)})`,
      saved: netSavings > 0
        ? `${netSavings} sats ($${(netSavings / 1e8 * price.USD).toFixed(4)})`
        : 'Not cost-effective at current fees',
    },
  };
}

// ============ FEE PREDICTION ENGINE ============

export interface FeePrediction {
  window: string;
  predictedFeeRate: number;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

export async function getFeePredictions(hours: number = 6): Promise<{
  currentFees: RecommendedFees;
  predictions: FeePrediction[];
  mempoolPressure: number;
  congestionLevel: string;
}> {
  const [fees, mempool, blocks] = await Promise.all([
    getRecommendedFees(),
    getMempoolSummary(),
    getLatestBlocks(6),
  ]);

  const vsizeMB = mempool.vsize / 1_000_000;
  const mempoolPressure = Math.min(10, Math.ceil(vsizeMB / 30));

  const congestionLabels: Record<number, string> = {
    1: 'very_low', 2: 'very_low', 3: 'low', 4: 'low',
    5: 'moderate', 6: 'moderate', 7: 'high', 8: 'high',
    9: 'very_high', 10: 'extreme',
  };
  const congestionLevel = congestionLabels[mempoolPressure] || 'very_low';

  const blockIntervals = blocks
    .slice(0, -1)
    .map((b, i) => blocks[i].timestamp - blocks[i + 1].timestamp)
    .filter(t => t > 0);
  const avgBlockTime = blockIntervals.length > 0
    ? blockIntervals.reduce((a, b) => a + b, 0) / blockIntervals.length
    : 600;

  const predictions: FeePrediction[] = [];
  for (const h of [1, 2, 4, 6].filter(x => x <= hours)) {
    const blocksExpected = Math.floor((h * 3600) / avgBlockTime);
    const clearedMB = blocksExpected * 2;
    const remainingMB = Math.max(0, vsizeMB - clearedMB);
    const remainingPressure = Math.min(10, Math.ceil(remainingMB / 30));

    let predictedRate: number;
    let confidence: 'high' | 'medium' | 'low';

    if (remainingPressure <= 2) {
      predictedRate = Math.max(1, fees.minimumFee);
      confidence = h <= 2 ? 'medium' : 'low';
    } else if (remainingPressure <= 5) {
      predictedRate = Math.max(fees.economyFee - 2, fees.minimumFee);
      confidence = h <= 2 ? 'high' : 'medium';
    } else {
      predictedRate = fees.hourFee;
      confidence = 'medium';
    }

    predictions.push({
      window: `${h}h`,
      predictedFeeRate: Math.round(predictedRate),
      confidence,
      reasoning: `~${blocksExpected} blocks expected, clearing ~${clearedMB}MB. Mempool ${vsizeMB.toFixed(0)}MB → ~${remainingMB.toFixed(0)}MB.`,
    });
  }

  return { currentFees: fees, predictions, mempoolPressure, congestionLevel };
}

// ============ WHALE DETECTION ============

export interface WhaleTransaction {
  txid: string;
  totalValueSats: number;
  totalValueBtc: string;
  totalValueUsd: string;
  fee: number;
  feeRate: string;
  inputs: number;
  outputs: number;
}

export async function getWhaleTransactions(minBtc: number = 10): Promise<WhaleTransaction[]> {
  const [recent, price] = await Promise.all([
    getMempoolRecent(),
    getBtcPrice(),
  ]);

  const minSats = minBtc * 1e8;

  return recent
    .filter((tx: any) => {
      // mempool/recent returns flat { txid, fee, vsize, value }
      const val = tx.value || 0;
      return val >= minSats;
    })
    .map((tx: any) => {
      const val = tx.value || 0;
      const feeRate = tx.vsize ? (tx.fee / tx.vsize) : 0;
      return {
        txid: tx.txid,
        totalValueSats: val,
        totalValueBtc: (val / 1e8).toFixed(8),
        totalValueUsd: (val / 1e8 * price.USD).toFixed(2),
        fee: tx.fee,
        feeRate: `${feeRate.toFixed(1)} sat/vB`,
        inputs: 0,
        outputs: 0,
      };
    })
    .sort((a: WhaleTransaction, b: WhaleTransaction) => b.totalValueSats - a.totalValueSats);
}

// ============ ADDRESS RISK SCORING ============

export interface RiskFactor {
  name: string;
  score: number;
  weight: number;
  detail: string;
}

export interface RiskAssessment {
  address: string;
  riskScore: number;
  riskGrade: string;
  factors: RiskFactor[];
  patterns: string[];
  summary: string;
}

export async function getAddressRisk(address: string): Promise<RiskAssessment> {
  const [info, utxos, txs] = await Promise.all([
    getAddressInfo(address),
    getAddressUtxos(address),
    getAddressTxs(address),
  ]);

  const factors: RiskFactor[] = [];
  const patterns: string[] = [];

  // Factor 1: Transaction frequency
  const txCount = info.chain_stats.tx_count;
  let freqScore = txCount > 1000 ? 80 : txCount > 500 ? 60 : txCount > 100 ? 30 : 10;
  if (txCount > 1000) patterns.push('very_high_frequency');
  else if (txCount > 500) patterns.push('high_frequency');
  factors.push({ name: 'Transaction Frequency', score: freqScore, weight: 0.2, detail: `${txCount} total txs` });

  // Factor 2: Dust UTXOs
  const dustCount = utxos.filter(u => u.value <= 546).length;
  let dustScore = dustCount > 20 ? 90 : dustCount > 5 ? 50 : 5;
  if (dustCount > 20) patterns.push('dust_attack_target');
  else if (dustCount > 5) patterns.push('some_dust_utxos');
  factors.push({ name: 'Dust UTXOs', score: dustScore, weight: 0.15, detail: `${dustCount} dust UTXOs (≤546 sats)` });

  // Factor 3: Balance pattern
  const balanceSats = info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
  const balanceBtc = balanceSats / 1e8;
  let balanceScore = 10;
  if (balanceBtc > 100) { balanceScore = 5; patterns.push('whale_address'); }
  else if (balanceBtc < 0.001 && txCount > 50) { balanceScore = 70; patterns.push('low_balance_high_activity'); }
  factors.push({ name: 'Balance Pattern', score: balanceScore, weight: 0.1, detail: `${balanceBtc.toFixed(8)} BTC` });

  // Factor 4: I/O patterns
  const recentTxs = txs.slice(0, 20);
  const avgIn = recentTxs.length > 0 ? recentTxs.reduce((s, t) => s + t.vin.length, 0) / recentTxs.length : 0;
  const avgOut = recentTxs.length > 0 ? recentTxs.reduce((s, t) => s + t.vout.length, 0) / recentTxs.length : 0;
  let ioScore = 10;
  if (avgIn > 10) { ioScore = 60; patterns.push('many_inputs_consolidation'); }
  if (avgOut > 10) { ioScore = Math.max(ioScore, 70); patterns.push('many_outputs_distribution'); }
  if (avgIn <= 2 && avgOut > 5) { ioScore = 75; patterns.push('fan_out_pattern'); }
  factors.push({ name: 'I/O Pattern', score: ioScore, weight: 0.25, detail: `avg ${avgIn.toFixed(1)} in, ${avgOut.toFixed(1)} out` });

  // Factor 5: Pending activity
  const pendingTx = info.mempool_stats.tx_count;
  let pendingScore = pendingTx > 10 ? 80 : pendingTx > 3 ? 40 : 5;
  if (pendingTx > 10) patterns.push('high_pending_activity');
  factors.push({ name: 'Pending Activity', score: pendingScore, weight: 0.15, detail: `${pendingTx} unconfirmed txs` });

  // Factor 6: UTXO age clustering
  const confirmedUtxos = utxos.filter(u => u.status.confirmed && u.status.block_height);
  let ageScore = 10;
  if (confirmedUtxos.length > 0) {
    const heights = confirmedUtxos.map(u => u.status.block_height!);
    const spread = Math.max(...heights) - Math.min(...heights);
    if (spread < 10 && confirmedUtxos.length > 5) {
      ageScore = 65;
      patterns.push('utxos_same_age_batch');
    }
  }
  factors.push({ name: 'UTXO Age Pattern', score: ageScore, weight: 0.15, detail: `${confirmedUtxos.length} confirmed UTXOs` });

  const riskScore = Math.round(factors.reduce((sum, f) => sum + f.score * f.weight, 0));
  const riskGrade = riskScore <= 15 ? 'A' : riskScore <= 30 ? 'B' : riskScore <= 50 ? 'C' : riskScore <= 70 ? 'D' : 'F';

  const summary = riskScore <= 30
    ? 'Low risk. Normal transaction patterns.'
    : riskScore <= 50
    ? 'Moderate risk. Some unusual patterns detected.'
    : riskScore <= 70
    ? 'Elevated risk. Multiple suspicious indicators.'
    : 'High risk. Significant anomalous activity detected.';

  return { address, riskScore, riskGrade, factors, patterns, summary };
}

// ============ NETWORK HEALTH DASHBOARD ============

export interface NetworkHealth {
  congestion: { level: number; label: string };
  mempool: { count: number; vsizeMB: string; totalFeeBtc: string };
  blockProduction: { avgIntervalSec: number; lastBlockAgeSec: number; blocksPerHour: string };
  feeMarket: RecommendedFees;
  hashrateTrend: string;
  difficultyAdjustment: { blocksUntil: number; estimatedChange: string };
  price: { usd: number; eur: number };
}

export async function getNetworkHealth(): Promise<NetworkHealth> {
  const [mempool, fees, blocks, height, price] = await Promise.all([
    getMempoolSummary(),
    getRecommendedFees(),
    getLatestBlocks(10),
    getBlockHeight(),
    getBtcPrice(),
  ]);

  const vsizeMB = mempool.vsize / 1_000_000;
  const congestionLevel = Math.min(10, Math.ceil(vsizeMB / 30));
  const labels: Record<number, string> = {
    0: 'empty', 1: 'very_low', 2: 'very_low', 3: 'low', 4: 'low',
    5: 'moderate', 6: 'moderate', 7: 'high', 8: 'high', 9: 'very_high', 10: 'extreme',
  };

  const blockIntervals = blocks.slice(0, -1).map((b, i) => blocks[i].timestamp - blocks[i + 1].timestamp).filter(t => t > 0);
  const avgInterval = blockIntervals.length > 0 ? Math.round(blockIntervals.reduce((a, b) => a + b, 0) / blockIntervals.length) : 600;
  const lastBlockAge = Math.round(Date.now() / 1000 - blocks[0].timestamp);

  const hashrateTrend = avgInterval < 540 ? 'increasing' : avgInterval > 660 ? 'decreasing' : 'stable';

  const blocksInEpoch = height % 2016;
  const blocksUntil = 2016 - blocksInEpoch;
  const adjustmentRatio = 600 / avgInterval;
  const estimatedChange = ((adjustmentRatio - 1) * 100).toFixed(1);

  return {
    congestion: { level: congestionLevel, label: labels[congestionLevel] || 'unknown' },
    mempool: { count: mempool.count, vsizeMB: vsizeMB.toFixed(2), totalFeeBtc: (mempool.total_fee / 1e8).toFixed(4) },
    blockProduction: { avgIntervalSec: avgInterval, lastBlockAgeSec: lastBlockAge, blocksPerHour: (3600 / avgInterval).toFixed(1) },
    feeMarket: fees,
    hashrateTrend,
    difficultyAdjustment: { blocksUntil, estimatedChange: `${parseFloat(estimatedChange) > 0 ? '+' : ''}${estimatedChange}%` },
    price: { usd: price.USD, eur: price.EUR },
  };
}
