/**
 * Address Cluster / Graph Analysis
 * Heuristic-based Bitcoin address clustering using on-chain data.
 *
 * Heuristics:
 *   1. Common Input Ownership — addresses sharing tx inputs belong to same entity
 *   2. Optimal Change Detection — identify change outputs by value analysis
 *   3. Entity Label Heuristic — addresses with same entity label are linked
 *   4. Temporal Proximity — addresses used close in time from same source
 */

import { getAddressTxs, getTransaction, getAddressInfo, type Transaction } from './bitcoin';
import { getEntityLabel, getAddressesByEntity } from './entities';
import { safeGet, safeSet } from './redis';

// ============ TYPES ============

export interface ClusteredAddress {
  address: string;
  confidence: number;
  method: 'common_input' | 'change_detection' | 'entity_label' | 'temporal_proximity';
  entity: string | null;
}

export interface ClusterAnalysis {
  address: string;
  cluster_size: number;
  linked_addresses: ClusteredAddress[];
  entity: string | null;
  risk_score: number;
  total_balance_btc: string;
}

export interface GraphNode {
  address: string;
  entity: string | null;
  depth: number;
  tx_count: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  method: string;
  confidence: number;
  txid: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  root: string;
  max_depth: number;
  total_addresses: number;
  total_connections: number;
}

// ============ CONSTANTS ============

const CACHE_PREFIX = 'cluster:';
const CACHE_TTL = 600; // 10 minutes

/** Threshold: if a single output is this fraction of total, it's likely payment (rest is change) */
const CHANGE_RATIO_THRESHOLD = 0.15;

/** Max transactions to analyze per address (API rate limit protection) */
const MAX_TXS = 50;

/** Max depth for graph traversal */
const MAX_DEPTH = 5;

// ============ CORE FUNCTIONS ============

/**
 * Analyze an address and return its full cluster analysis.
 */
export async function analyzeAddress(addr: string): Promise<ClusterAnalysis> {
  // Check cache
  const cacheKey = `${CACHE_PREFIX}analysis:${addr}`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  // Fetch address data
  const [txs, info] = await Promise.all([
    getAddressTxs(addr),
    getAddressInfo(addr),
  ]);

  const balanceSats = info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
  const totalBalanceBtc = (balanceSats / 1e8).toFixed(8);

  // Run all heuristics
  const linkedAddresses = new Map<string, ClusteredAddress>();

  // 1. Common Input Ownership
  const commonInputLinks = await findCommonInputLinks(addr, txs.slice(0, MAX_TXS));
  for (const link of commonInputLinks) {
    const existing = linkedAddresses.get(link.address);
    if (!existing || link.confidence > existing.confidence) {
      linkedAddresses.set(link.address, link);
    }
  }

  // 2. Change Address Detection
  const changeLinks = await findChangeAddresses(addr, txs.slice(0, MAX_TXS));
  for (const link of changeLinks) {
    const existing = linkedAddresses.get(link.address);
    if (!existing || link.confidence > existing.confidence) {
      linkedAddresses.set(link.address, link);
    }
  }

  // 3. Entity Label Heuristic
  const entityLinks = findEntityLinks(addr);
  for (const link of entityLinks) {
    const existing = linkedAddresses.get(link.address);
    if (!existing || link.confidence > existing.confidence) {
      linkedAddresses.set(link.address, link);
    }
  }

  // 4. Temporal Proximity
  const temporalLinks = findTemporalLinks(addr, txs.slice(0, MAX_TXS));
  for (const link of temporalLinks) {
    const existing = linkedAddresses.get(link.address);
    if (!existing || link.confidence > existing.confidence) {
      linkedAddresses.set(link.address, link);
    }
  }

  const linked = Array.from(linkedAddresses.values())
    .filter(l => l.address !== addr)
    .sort((a, b) => b.confidence - a.confidence);

  const entityInfo = getEntityLabel(addr);
  const riskScore = computeClusterRiskScore(linked, entityInfo?.type || null);

  const result: ClusterAnalysis = {
    address: addr,
    cluster_size: linked.length + 1, // +1 for the address itself
    linked_addresses: linked,
    entity: entityInfo?.entity || null,
    risk_score: riskScore,
    total_balance_btc: totalBalanceBtc,
  };

  // Cache result
  await safeSet(cacheKey, JSON.stringify(result), CACHE_TTL);

  return result;
}

/**
 * Find the full cluster for an address using all heuristics.
 */
export async function findCluster(addr: string): Promise<ClusteredAddress[]> {
  const analysis = await analyzeAddress(addr);
  return analysis.linked_addresses;
}

/**
 * Build a connection graph up to N hops from an address.
 */
export async function getGraph(addr: string, depth: number = 2): Promise<GraphData> {
  const maxDepth = Math.min(depth, MAX_DEPTH);

  // Check cache
  const cacheKey = `${CACHE_PREFIX}graph:${addr}:${maxDepth}`;
  const cached = await safeGet(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  const nodes = new Map<string, GraphNode>();
  const edges: GraphEdge[] = [];
  const visited = new Set<string>();

  // BFS traversal
  const queue: { address: string; currentDepth: number }[] = [{ address: addr, currentDepth: 0 }];
  visited.add(addr);

  while (queue.length > 0) {
    const { address, currentDepth } = queue.shift()!;

    if (currentDepth >= maxDepth) continue;

    // Get cluster for this address
    const txs = await getAddressTxs(address);
    const entityInfo = getEntityLabel(address);

    // Add node
    if (!nodes.has(address)) {
      nodes.set(address, {
        address,
        entity: entityInfo?.entity || null,
        depth: currentDepth,
        tx_count: txs.length,
      });
    }

    // Find linked addresses at this depth
    const linked = await findClusterForGraph(address, txs.slice(0, 20));

    for (const link of linked) {
      // Add edge
      edges.push({
        from: address,
        to: link.address,
        method: link.method,
        confidence: link.confidence,
        txid: '', // Would need tx context in full implementation
      });

      // Add node for linked address
      if (!nodes.has(link.address)) {
        const linkedEntity = getEntityLabel(link.address);
        nodes.set(link.address, {
          address: link.address,
          entity: linkedEntity?.entity || null,
          depth: currentDepth + 1,
          tx_count: 0,
        });
      }

      // Enqueue if not visited and within depth
      if (!visited.has(link.address) && currentDepth + 1 < maxDepth) {
        visited.add(link.address);
        queue.push({ address: link.address, currentDepth: currentDepth + 1 });
      }
    }
  }

  const result: GraphData = {
    nodes: Array.from(nodes.values()),
    edges,
    root: addr,
    max_depth: maxDepth,
    total_addresses: nodes.size,
    total_connections: edges.length,
  };

  // Cache
  await safeSet(cacheKey, JSON.stringify(result), CACHE_TTL);

  return result;
}

/**
 * Get the size of an address's cluster.
 */
export async function getClusterSize(addr: string): Promise<number> {
  const analysis = await analyzeAddress(addr);
  return analysis.cluster_size;
}

/**
 * Get all addresses belonging to a known entity.
 */
export async function getEntityCluster(entity: string): Promise<{
  entity: string;
  addresses: string[];
  total_count: number;
  total_balance_btc: string;
}> {
  const entries = getAddressesByEntity(entity);
  const addresses = entries.map(e => e.address);

  // Try to get balance for each (limited to avoid API flood)
  let totalBalanceSats = 0;
  for (const addr of addresses.slice(0, 20)) {
    try {
      const info = await getAddressInfo(addr);
      totalBalanceSats += info.chain_stats.funded_txo_sum - info.chain_stats.spent_txo_sum;
    } catch {
      // Skip on error
    }
  }

  return {
    entity,
    addresses,
    total_count: addresses.length,
    total_balance_btc: (totalBalanceSats / 1e8).toFixed(8),
  };
}

// ============ HEURISTIC IMPLEMENTATIONS ============

/**
 * Common Input Ownership Heuristic:
 * If address A and address B both appear as inputs in the same transaction,
 * they likely belong to the same entity.
 */
async function findCommonInputLinks(
  addr: string,
  txs: Transaction[],
): Promise<ClusteredAddress[]> {
  const linked = new Map<string, ClusteredAddress>();

  for (const tx of txs) {
    try {
      // Get full tx to see input addresses
      const fullTx = await getTransaction(tx.txid);

      // Extract addresses from inputs
      const inputAddresses: string[] = [];
      for (const vin of fullTx.vin) {
        if (vin.prevout?.scriptpubkey_address) {
          inputAddresses.push(vin.prevout.scriptpubkey_address);
        }
      }

      // All input addresses in same tx are likely controlled by same entity
      if (inputAddresses.includes(addr)) {
        for (const inputAddr of inputAddresses) {
          if (inputAddr !== addr) {
            const entityInfo = getEntityLabel(inputAddr);
            // Higher confidence for txs with fewer inputs (less likely coinjoin)
            const confidence = inputAddresses.length <= 3 ? 0.85 : inputAddresses.length <= 6 ? 0.70 : 0.55;
            linked.set(inputAddr, {
              address: inputAddr,
              confidence,
              method: 'common_input',
              entity: entityInfo?.entity || null,
            });
          }
        }
      }
    } catch {
      // Skip failed tx fetches
    }
  }

  return Array.from(linked.values());
}

/**
 * Optimal Change Heuristic:
 * In a 2-output tx, if one output is significantly different from the input values,
 * it's likely the change address. The "unusual" output (closest to input value pattern)
 * is change.
 */
async function findChangeAddresses(
  addr: string,
  txs: Transaction[],
): Promise<ClusteredAddress[]> {
  const linked = new Map<string, ClusteredAddress>();

  for (const tx of txs) {
    try {
      const fullTx = await getTransaction(tx.txid);

      // Only analyze txs where our address is an input
      const isInput = fullTx.vin.some(
        v => v.prevout?.scriptpubkey_address === addr
      );
      if (!isInput) continue;

      const outputs = fullTx.vout;
      if (outputs.length !== 2) continue;

      // Two-output pattern: likely payment + change
      const out0Value = outputs[0].value;
      const out1Value = outputs[1].value;
      const totalOut = out0Value + out1Value;

      // Calculate input total
      const totalIn = fullTx.vin.reduce((sum, v) => sum + (v.prevout?.value || 0), 0);

      // The change output typically has a value close to (totalIn - one output value)
      // or is the smaller output if there's a big difference
      const ratio = Math.min(out0Value, out1Value) / Math.max(out0Value, out1Value);

      let changeAddress: string | null = null;
      let confidence = 0.60;

      if (ratio < CHANGE_RATIO_THRESHOLD) {
        // Very unequal split — the smaller one is likely change
        const smallerIdx = out0Value < out1Value ? 0 : 1;
        const largerIdx = out0Value < out1Value ? 1 : 0;

        // Change is the smaller output if it's significantly different from the larger
        changeAddress = outputs[smallerIdx].scriptpubkey_address;
        confidence = 0.75;
      } else if (outputs.length === 2) {
        // For 2-output txs, check if one output + fee ≈ total input
        for (let i = 0; i < 2; i++) {
          const otherIdx = 1 - i;
          const impliedFee = totalIn - outputs[i].value - outputs[otherIdx].value;
          if (impliedFee > 0 && impliedFee < 100000) {
            // Both outputs are "clean" — try to identify change by round numbers
            // Change addresses often have rounder values
            const val0 = outputs[0].value;
            const val1 = outputs[1].value;
            const isRound0 = val0 % 100000 === 0 || val0 % 1000000 === 0;
            const isRound1 = val1 % 100000 === 0 || val1 % 1000000 === 0;
            if (isRound0 && !isRound1) {
              changeAddress = outputs[0].scriptpubkey_address;
              confidence = 0.65;
            } else if (isRound1 && !isRound0) {
              changeAddress = outputs[1].scriptpubkey_address;
              confidence = 0.65;
            }
          }
        }
      }

      if (changeAddress && changeAddress !== addr) {
        const entityInfo = getEntityLabel(changeAddress);
        linked.set(changeAddress, {
          address: changeAddress,
          confidence,
          method: 'change_detection',
          entity: entityInfo?.entity || null,
        });
      }
    } catch {
      // Skip failed tx fetches
    }
  }

  return Array.from(linked.values());
}

/**
 * Entity Label Heuristic:
 * If address X is labeled "Coinbase" and address Y is also labeled "Coinbase",
 * they belong to the same entity cluster.
 */
function findEntityLinks(addr: string): ClusteredAddress[] {
  const linked: ClusteredAddress[] = [];
  const entityInfo = getEntityLabel(addr);

  if (!entityInfo) return linked;

  // Find all addresses with the same entity name
  const sameEntityAddresses = getAddressesByEntity(entityInfo.entity);

  for (const entry of sameEntityAddresses) {
    if (entry.address !== addr) {
      linked.push({
        address: entry.address,
        confidence: Math.min(entityInfo.confidence, entry.confidence) * 0.95, // Slight discount for indirect
        method: 'entity_label',
        entity: entityInfo.entity,
      });
    }
  }

  return linked;
}

/**
 * Temporal Proximity Heuristic:
 * Addresses used close in time (within same block or adjacent blocks)
 * from the same owner are likely controlled by the same entity.
 */
function findTemporalLinks(
  addr: string,
  txs: Transaction[],
): ClusteredAddress[] {
  const linked = new Map<string, ClusteredAddress>();

  // Group transactions by block height
  const blockGroups = new Map<number, Transaction[]>();
  for (const tx of txs) {
    if (tx.status.confirmed && tx.status.block_height) {
      const height = tx.status.block_height;
      if (!blockGroups.has(height)) blockGroups.set(height, []);
      blockGroups.get(height)!.push(tx);
    }
  }

  // Find addresses that appear in the same block
  for (const [, blockTxs] of blockGroups) {
    if (blockTxs.length < 2) continue;

    const addrTimestamps = new Map<string, number>();

    for (const tx of blockTxs) {
      const fullTx = tx;
      // Check if our address appears in inputs or outputs
      const isRelevant = fullTx.vin?.some(
        (v: any) => v.prevout?.scriptpubkey_address === addr
      ) || fullTx.vout?.some(
        (o: any) => o.scriptpubkey_address === addr
      );

      if (isRelevant && fullTx.status.block_time) {
        // Collect all addresses in this tx
        const addrs = new Set<string>();
        for (const vin of (fullTx.vin || [])) {
          if (vin.prevout?.scriptpubkey_address) addrs.add(vin.prevout.scriptpubkey_address);
        }
        for (const vout of (fullTx.vout || [])) {
          if (vout.scriptpubkey_address) addrs.add(vout.scriptpubkey_address);
        }

        for (const a of addrs) {
          if (a !== addr) {
            addrTimestamps.set(a, fullTx.status.block_time);
          }
        }
      }
    }

    // Addresses in same block as our address
    for (const [linkedAddr] of addrTimestamps) {
      if (!linked.has(linkedAddr)) {
        const entityInfo = getEntityLabel(linkedAddr);
        linked.set(linkedAddr, {
          address: linkedAddr,
          confidence: 0.50, // Lower confidence for temporal alone
          method: 'temporal_proximity',
          entity: entityInfo?.entity || null,
        });
      }
    }
  }

  return Array.from(linked.values());
}

/**
 * Simplified cluster finder for graph building (fewer API calls).
 */
async function findClusterForGraph(
  addr: string,
  txs: Transaction[],
): Promise<ClusteredAddress[]> {
  const linked = new Map<string, ClusteredAddress>();

  // Common input links (limit API calls)
  for (const tx of txs.slice(0, 10)) {
    try {
      const fullTx = await getTransaction(tx.txid);
      const inputAddresses: string[] = [];
      for (const vin of fullTx.vin) {
        if (vin.prevout?.scriptpubkey_address) {
          inputAddresses.push(vin.prevout.scriptpubkey_address);
        }
      }
      if (inputAddresses.includes(addr)) {
        for (const inputAddr of inputAddresses) {
          if (inputAddr !== addr) {
            linked.set(inputAddr, {
              address: inputAddr,
              confidence: 0.80,
              method: 'common_input',
              entity: getEntityLabel(inputAddr)?.entity || null,
            });
          }
        }
      }
    } catch { /* skip */ }
  }

  // Entity links
  for (const link of findEntityLinks(addr)) {
    if (!linked.has(link.address)) {
      linked.set(link.address, link);
    }
  }

  return Array.from(linked.values());
}

// ============ RISK SCORING ============

/**
 * Compute a risk score for a cluster based on linked addresses and entity types.
 */
function computeClusterRiskScore(
  linked: ClusteredAddress[],
  entityType: string | null,
): number {
  let score = 0.1; // Base score

  // Entity-based risk
  const entityRiskMap: Record<string, number> = {
    scam: 0.8,
    mixer: 0.6,
    gambling: 0.3,
    exchange: 0.1,
    etf: 0.05,
    government: 0.1,
    corporate: 0.1,
    pool: 0.1,
    defi: 0.15,
    unknown: 0.2,
  };

  if (entityType) {
    score = Math.max(score, entityRiskMap[entityType] || 0.2);
  }

  // High confidence links increase score
  const highConfidenceLinks = linked.filter(l => l.confidence > 0.8).length;
  score += highConfidenceLinks * 0.03;

  // More links = more exposure
  if (linked.length > 50) score += 0.15;
  else if (linked.length > 20) score += 0.10;
  else if (linked.length > 10) score += 0.05;

  return Math.min(1.0, Math.round(score * 100) / 100);
}
