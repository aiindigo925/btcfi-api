/**
 * BTCFi Threat Detection Library
 * Inspired by PCEF's Traceix + YARA rule patterns.
 * Tasks 8.1, 8.2 — Pattern-based transaction/address risk analysis.
 *
 * References:
 *   - Traceix: https://traceix.com (SHA-256 threat classification)
 *   - PCEF YARA: https://docs.perkinsfund.org/readme/yara
 *   - PCEF AURA: https://docs.perkinsfund.org/readme/aura (anomaly detection)
 */

import {
  getAddressInfo,
  getAddressUtxos,
  getAddressTxs,
  type Transaction,
  type UTXO,
} from './bitcoin';

// ============ YARA-STYLE PATTERN ENGINE ============

export interface ThreatPattern {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number; // 0-100
}

interface PatternMatchResult {
  pattern: ThreatPattern;
  matched: boolean;
  detail: string;
}

const PATTERNS: ThreatPattern[] = [
  {
    id: 'RAPID_SMALL_INPUTS',
    name: 'Rapid Small Inputs (Tumbling)',
    severity: 'high',
    description: 'Many small inputs in recent txs — possible coin tumbling or mixing service',
    score: 75,
  },
  {
    id: 'SINGLE_LARGE_OUTPUT_FRESH',
    name: 'Large Output to Fresh Address',
    severity: 'high',
    description: 'Single large output to an address with no history — possible theft extraction',
    score: 70,
  },
  {
    id: 'CONSOLIDATION_TO_EXCHANGE',
    name: 'Mass Consolidation',
    severity: 'medium',
    description: 'Many inputs consolidating to single output — possible exchange deposit / cashout',
    score: 45,
  },
  {
    id: 'CIRCULAR_TRANSACTIONS',
    name: 'Circular Transactions',
    severity: 'high',
    description: 'Funds returning to originating address — possible wash trading',
    score: 80,
  },
  {
    id: 'DUST_ATTACK',
    name: 'Dust Attack Signature',
    severity: 'medium',
    description: 'Many tiny UTXOs (≤546 sats) received — address is targeted by dust attack',
    score: 60,
  },
  {
    id: 'RAPID_SUCCESSION',
    name: 'Rapid Succession Transactions',
    severity: 'medium',
    description: 'Multiple transactions within same block — automated/scripted activity',
    score: 50,
  },
  {
    id: 'EQUAL_OUTPUTS',
    name: 'Equal-Value Outputs (CoinJoin)',
    severity: 'medium',
    description: 'Transaction with multiple equal-value outputs — CoinJoin pattern',
    score: 55,
  },
  {
    id: 'PEEL_CHAIN',
    name: 'Peel Chain Pattern',
    severity: 'high',
    description: 'Sequential txs each peeling off small amount — layering technique',
    score: 70,
  },
];

function checkRapidSmallInputs(txs: Transaction[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'RAPID_SMALL_INPUTS')!;
  const recentTxs = txs.slice(0, 10);
  const smallInputTxs = recentTxs.filter(tx => {
    const avgInputValue = tx.vin.reduce((s: number, v: any) => {
      return s + (v.prevout?.value || 0);
    }, 0) / Math.max(tx.vin.length, 1);
    return avgInputValue < 100_000 && tx.vin.length > 3; // < 0.001 BTC avg with many inputs
  });
  const matched = smallInputTxs.length >= 3;
  return { pattern, matched, detail: `${smallInputTxs.length}/10 recent txs have many small inputs` };
}

function checkSingleLargeOutput(txs: Transaction[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'SINGLE_LARGE_OUTPUT_FRESH')!;
  // Look for txs with a single large output (>1 BTC) going to a fresh address
  const outputAddresses = new Map<string, number>();
  for (const tx of txs.slice(0, 20)) {
    for (const v of tx.vout) {
      const addr = (v as any).scriptpubkey_address;
      if (addr) outputAddresses.set(addr, (outputAddresses.get(addr) || 0) + 1);
    }
  }
  let largeToFreshCount = 0;
  for (const tx of txs.slice(0, 10)) {
    if (tx.vout.length > 2) continue;
    for (const v of tx.vout) {
      const addr = (v as any).scriptpubkey_address;
      const value = (v as any).value || 0;
      if (value > 100_000_000 && addr && (outputAddresses.get(addr) || 0) <= 1) {
        largeToFreshCount++;
      }
    }
  }
  const matched = largeToFreshCount >= 2;
  return { pattern, matched, detail: `${largeToFreshCount} large outputs (>1 BTC) to addresses seen only once` };
}

function checkDustAttack(utxos: UTXO[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'DUST_ATTACK')!;
  const dustUtxos = utxos.filter(u => u.value <= 546);
  const matched = dustUtxos.length > 10;
  return { pattern, matched, detail: `${dustUtxos.length} dust UTXOs (≤546 sats)` };
}

function checkCircularTxs(txs: Transaction[], address: string): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'CIRCULAR_TRANSACTIONS')!;
  // Check if any tx sends funds back to the same address
  let circularCount = 0;
  for (const tx of txs.slice(0, 20)) {
    const sendsToSelf = tx.vout.some((v: any) => v.scriptpubkey_address === address);
    const receivesFromSelf = tx.vin.some((v: any) => v.prevout?.scriptpubkey_address === address);
    if (sendsToSelf && receivesFromSelf) circularCount++;
  }
  const matched = circularCount >= 3;
  return { pattern, matched, detail: `${circularCount} circular transactions detected` };
}

function checkEqualOutputs(txs: Transaction[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'EQUAL_OUTPUTS')!;
  let coinjoinCount = 0;
  for (const tx of txs.slice(0, 10)) {
    if (tx.vout.length < 3) continue;
    const values = tx.vout.map((v: any) => v.value);
    const valueCounts: Record<number, number> = {};
    for (const v of values) {
      valueCounts[v] = (valueCounts[v] || 0) + 1;
    }
    const hasEqualOutputs = Object.values(valueCounts).some(c => c >= 3);
    if (hasEqualOutputs) coinjoinCount++;
  }
  const matched = coinjoinCount >= 1;
  return { pattern, matched, detail: `${coinjoinCount} transactions with 3+ equal-value outputs` };
}

function checkRapidSuccession(txs: Transaction[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'RAPID_SUCCESSION')!;
  const confirmedTxs = txs.filter(t => t.status.confirmed && t.status.block_height);
  const blockCounts: Record<number, number> = {};
  for (const tx of confirmedTxs.slice(0, 50)) {
    const h = tx.status.block_height!;
    blockCounts[h] = (blockCounts[h] || 0) + 1;
  }
  const multiTxBlocks = Object.values(blockCounts).filter(c => c >= 3).length;
  const matched = multiTxBlocks >= 2;
  return { pattern, matched, detail: `${multiTxBlocks} blocks with 3+ txs from this address` };
}

function checkPeelChain(txs: Transaction[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'PEEL_CHAIN')!;
  // Peel chain: sequential txs where one output is small, one is close to input
  let peelCount = 0;
  for (const tx of txs.slice(0, 20)) {
    if (tx.vout.length !== 2) continue;
    const [a, b] = tx.vout.map((v: any) => v.value).sort((x: number, y: number) => x - y);
    const totalIn = tx.vin.reduce((s: number, v: any) => s + (v.prevout?.value || 0), 0);
    // Small output is <5% of total input
    if (a < totalIn * 0.05 && b > totalIn * 0.9) peelCount++;
  }
  const matched = peelCount >= 3;
  return { pattern, matched, detail: `${peelCount} peel-chain style transactions` };
}

function checkConsolidation(txs: Transaction[]): PatternMatchResult {
  const pattern = PATTERNS.find(p => p.id === 'CONSOLIDATION_TO_EXCHANGE')!;
  const consolidationTxs = txs.slice(0, 10).filter(tx => tx.vin.length > 5 && tx.vout.length <= 2);
  const matched = consolidationTxs.length >= 2;
  return { pattern, matched, detail: `${consolidationTxs.length} consolidation txs (5+ inputs, ≤2 outputs)` };
}

// ============ MAIN ANALYSIS ============

export interface ThreatReport {
  address: string;
  overallScore: number; // 0-100
  threatLevel: 'clean' | 'low' | 'medium' | 'high' | 'critical';
  matchedPatterns: PatternMatchResult[];
  unmatchedCount: number;
  summary: string;
  recommendations: string[];
}

export async function analyzeThreat(address: string): Promise<ThreatReport> {
  const [utxos, txs] = await Promise.all([
    getAddressUtxos(address),
    getAddressTxs(address),
  ]);

  const results: PatternMatchResult[] = [
    checkRapidSmallInputs(txs),
    checkSingleLargeOutput(txs),
    checkDustAttack(utxos),
    checkCircularTxs(txs, address),
    checkEqualOutputs(txs),
    checkRapidSuccession(txs),
    checkPeelChain(txs),
    checkConsolidation(txs),
  ];

  const matched = results.filter(r => r.matched);
  const overallScore = matched.length === 0
    ? 0
    : Math.min(100, Math.round(matched.reduce((s, r) => s + r.pattern.score, 0) / matched.length));

  let threatLevel: ThreatReport['threatLevel'];
  if (overallScore === 0) threatLevel = 'clean';
  else if (overallScore <= 30) threatLevel = 'low';
  else if (overallScore <= 55) threatLevel = 'medium';
  else if (overallScore <= 75) threatLevel = 'high';
  else threatLevel = 'critical';

  const recommendations: string[] = [];
  if (matched.some(m => m.pattern.id === 'DUST_ATTACK')) {
    recommendations.push('Do NOT spend dust UTXOs — they may be used to deanonymize your address.');
  }
  if (matched.some(m => m.pattern.id === 'CIRCULAR_TRANSACTIONS')) {
    recommendations.push('Circular transaction patterns detected. Verify counterparty if interacting with this address.');
  }
  if (matched.some(m => m.pattern.id === 'PEEL_CHAIN')) {
    recommendations.push('Peel chain pattern suggests layering. Exercise caution with large transfers to/from this address.');
  }
  if (matched.some(m => m.pattern.id === 'SINGLE_LARGE_OUTPUT_FRESH')) {
    recommendations.push('Large outputs to fresh addresses detected — possible extraction or theft pattern. Verify legitimacy.');
  }
  if (threatLevel === 'clean') {
    recommendations.push('No suspicious patterns detected. Address appears clean.');
  }

  const summary = `${matched.length} of ${results.length} threat patterns matched. Overall threat score: ${overallScore}/100 (${threatLevel}).`;

  return {
    address,
    overallScore,
    threatLevel,
    matchedPatterns: matched,
    unmatchedCount: results.length - matched.length,
    summary,
    recommendations,
  };
}
