/**
 * Lightning Channel Insights
 * Deep analysis of Lightning Network nodes, channels, and routing.
 * Uses 1ML API and public Lightning data.
 */

import { safeGet, safeSet } from './redis';

const CACHE_TTL_NODE = 300; // 5 minutes for node info
const CACHE_TTL_CHANNEL = 300; // 5 minutes for channel info
const CACHE_TTL_ROUTING = 120; // 2 minutes for routing estimates
const CACHE_TTL_TOP = 600; // 10 minutes for top nodes list

const ONEML_API = 'https://1ml.com';

// ============ TYPES ============

export interface LightningNode {
  publicKey: string;
  alias: string;
  color: string;
  capacity: number;
  capacityBtc: string;
  capacityUsd: string;
  channels: number;
  firstSeen: number;
  updatedAt: number;
  country?: string;
  city?: string;
  isp?: string;
  sockets?: string[];
  peers: {
    publicKey: string;
    alias: string;
    capacity: number;
    channels: number;
  }[];
  routingFees: {
    baseFeeMsat: number;
    feeRatePpm: number;
    timelockDelta: number;
  };
  uptimeEstimate: number;
}

export interface ChannelInfo {
  channelId: string;
  capacity: number;
  capacityBtc: string;
  capacityUsd: string;
  node1: {
    publicKey: string;
    alias: string;
    color: string;
  };
  node2: {
    publicKey: string;
    alias: string;
    color: string;
  };
  policy1: {
    feeRatePpm: number;
    baseFeeMsat: number;
    timelockDelta: number;
    disabled: boolean;
  };
  policy2: {
    feeRatePpm: number;
    baseFeeMsat: number;
    timelockDelta: number;
    disabled: boolean;
  };
  lastUpdate: number;
  blockHeight: number;
  uptimeEstimate: number;
}

export interface RoutingFeeEstimate {
  from: string;
  to: string;
  amountMsat: number;
  amountSats: number;
  estimatedFeeMsat: number;
  estimatedFeeSats: string;
  estimatedFeePpm: number;
  estimatedFeeUsd: string;
  hops: number;
  path: { publicKey: string; alias: string }[];
  confidence: 'high' | 'medium' | 'low';
}

export interface TopNode {
  publicKey: string;
  alias: string;
  color: string;
  capacity: number;
  capacityBtc: string;
  channels: number;
  uptimeEstimate: number;
  country?: string;
}

// ============ HELPERS ============

function satsToBtc(sats: number): string {
  return (sats / 1e8).toFixed(8);
}

async function fetch1ML<T>(path: string, cacheTtl: number, fallback: T): Promise<T> {
  const key = `ln:1ml:${path.replace(/[^a-zA-Z0-9?=&_/-]/g, '_')}`;
  const cached = await safeGet(key);
  if (cached) {
    try { return JSON.parse(cached) as T; } catch { /* fall through */ }
  }

  try {
    const res = await fetch(`${ONEML_API}${path}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    await safeSet(key, JSON.stringify(data), cacheTtl);
    return data as T;
  } catch {
    return fallback;
  }
}

// ============ NODE INFO ============

/**
 * Get detailed Lightning node info including peers, capacity, and routing fees.
 */
export async function getNodeInfo(pubkey: string): Promise<LightningNode | null> {
  const data = await fetch1ML<any>(`/node/${pubkey}?json`, CACHE_TTL_NODE, null);
  if (!data || !data.pub_key) return null;

  const capacity = data.capacity || 0;
  const channels = data.num_channels || data.channels || 0;

  // Parse peers from channels
  const peersMap = new Map<string, { publicKey: string; alias: string; capacity: number; channels: number }>();
  if (Array.isArray(data.channels)) {
    for (const ch of data.channels) {
      const peerPub = ch.node1Pub === pubkey ? ch.node2Pub : ch.node1Pub;
      const peerAlias = ch.node1Pub === pubkey ? (ch.node2Alias || 'Unknown') : (ch.node1Alias || 'Unknown');
      const existing = peersMap.get(peerPub);
      if (existing) {
        existing.channels += 1;
        existing.capacity += ch.capacity || 0;
      } else {
        peersMap.set(peerPub, {
          publicKey: peerPub,
          alias: peerAlias,
          capacity: ch.capacity || 0,
          channels: 1,
        });
      }
    }
  }

  const routingFees = data.fee_rate !== undefined ? {
    baseFeeMsat: data.base_fee_msat || 1000,
    feeRatePpm: data.fee_rate || 0,
    timelockDelta: data.timelock_delta || 144,
  } : {
    baseFeeMsat: 1000,
    feeRatePpm: 0,
    timelockDelta: 144,
  };

  return {
    publicKey: pubkey,
    alias: data.alias || 'Unknown',
    color: data.color || '#000000',
    capacity,
    capacityBtc: satsToBtc(capacity),
    capacityUsd: '0', // BTC price needed for USD
    channels,
    firstSeen: data.first_seen || 0,
    updatedAt: data.last_update || 0,
    country: data.country?.iso !== 'XX' ? data.country?.name : undefined,
    city: data.city?.en,
    isp: data.as?.name,
    sockets: data.sockets,
    peers: Array.from(peersMap.values()).sort((a, b) => b.capacity - a.capacity).slice(0, 50),
    routingFees,
    uptimeEstimate: data.uptime ?? 99,
  };
}

/**
 * Get detailed channel info by channel short ID or outpoint.
 */
export async function getChannelInfo(chanId: string): Promise<ChannelInfo | null> {
  // Try 1ML with the channel ID
  const data = await fetch1ML<any>(`/channel/${chanId}?json`, CACHE_TTL_CHANNEL, null);
  if (!data || !data.channelID) return null;

  const capacity = data.capacity || 0;

  return {
    channelId: chanId,
    capacity,
    capacityBtc: satsToBtc(capacity),
    capacityUsd: '0',
    node1: {
      publicKey: data.node1Pub || '',
      alias: data.node1Alias || 'Unknown',
      color: data.node1Color || '#000000',
    },
    node2: {
      publicKey: data.node2Pub || '',
      alias: data.node2Alias || 'Unknown',
      color: data.node2Color || '#000000',
    },
    policy1: {
      feeRatePpm: data.node1Policy?.fee_rate ?? 0,
      baseFeeMsat: data.node1Policy?.base_fee_msat ?? 1000,
      timelockDelta: data.node1Policy?.timelock_delta ?? 144,
      disabled: data.node1Policy?.disabled ?? false,
    },
    policy2: {
      feeRatePpm: data.node2Policy?.fee_rate ?? 0,
      baseFeeMsat: data.node2Policy?.base_fee_msat ?? 1000,
      timelockDelta: data.node2Policy?.timelock_delta ?? 144,
      disabled: data.node2Policy?.disabled ?? false,
    },
    lastUpdate: data.last_update || 0,
    blockHeight: data.block_height || 0,
    uptimeEstimate: data.uptime ?? 99,
  };
}

/**
 * Estimate routing fee between two nodes for a given amount.
 * Uses 1ML node data to calculate multi-hop fee estimates.
 */
export async function estimateRoutingFee(
  from: string,
  to: string,
  amountSats: number,
): Promise<RoutingFeeEstimate> {
  const key = `ln:route:${from}:${to}:${amountSats}`;
  const cached = await safeGet(key);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  const amountMsat = amountSats * 1000;

  // Get both nodes to find paths
  const [fromNode, toNode] = await Promise.all([
    getNodeInfo(from),
    getNodeInfo(to),
  ]);

  if (!fromNode || !toNode) {
    const result: RoutingFeeEstimate = {
      from,
      to,
      amountMsat,
      amountSats,
      estimatedFeeMsat: 0,
      estimatedFeeSats: '0',
      estimatedFeePpm: 0,
      estimatedFeeUsd: '0',
      hops: 0,
      path: [],
      confidence: 'low',
    };
    await safeSet(key, JSON.stringify(result), CACHE_TTL_ROUTING);
    return result;
  }

  // Estimate hops based on channel overlap
  // Check if from and to are direct peers
  const directPeer = fromNode.peers.find(p => p.publicKey === to);
  const commonPeers = directPeer ? [] : fromNode.peers.filter(fp =>
    toNode.peers.some(tp => tp.publicKey === fp.publicKey),
  );

  let hops: { publicKey: string; alias: string }[];
  let totalFeeMsat = 0;

  if (directPeer) {
    // Direct connection — single hop
    hops = [
      { publicKey: from, alias: fromNode.alias },
      { publicKey: to, alias: toNode.alias },
    ];
    // Fee = baseFee + (amount * feeRatePpm / 1_000_000)
    const feeRatePpm = fromNode.routingFees.feeRatePpm || 50;
    const baseFeeMsat = fromNode.routingFees.baseFeeMsat || 1000;
    totalFeeMsat = baseFeeMsat + Math.round(amountMsat * feeRatePpm / 1_000_000);
  } else if (commonPeers.length > 0) {
    // Route through best common peer
    const midNode = commonPeers[0];
    hops = [
      { publicKey: from, alias: fromNode.alias },
      { publicKey: midNode.publicKey, alias: midNode.alias },
      { publicKey: to, alias: toNode.alias },
    ];
    // Two hops: from→mid and mid→to
    const feeRate1 = fromNode.routingFees.feeRatePpm || 50;
    const fee1 = 1000 + Math.round(amountMsat * feeRate1 / 1_000_000);
    const feeRate2 = 50; // estimated
    const fee2 = 1000 + Math.round((amountMsat + fee1) * feeRate2 / 1_000_000);
    totalFeeMsat = fee1 + fee2;
  } else {
    // Estimated 3-hop route
    hops = [
      { publicKey: from, alias: fromNode.alias },
      { publicKey: '...intermediate', alias: 'Intermediate' },
      { publicKey: '...relay', alias: 'Relay Node' },
      { publicKey: to, alias: toNode.alias },
    ];
    // 3 hops at typical 50ppm + 1000msat base
    totalFeeMsat = 3000 + Math.round(amountMsat * 150 / 1_000_000);
  }

  const estimatedFeeSats = (totalFeeMsat / 1000).toFixed(4);
  const estimatedFeePpm = amountMsat > 0 ? Math.round(totalFeeMsat / amountMsat * 1_000_000) : 0;
  const confidence = directPeer ? 'high' : commonPeers.length > 0 ? 'medium' : 'low';

  const result: RoutingFeeEstimate = {
    from,
    to,
    amountMsat,
    amountSats,
    estimatedFeeMsat: totalFeeMsat,
    estimatedFeeSats,
    estimatedFeePpm,
    estimatedFeeUsd: '0', // price lookup omitted for speed
    hops: hops.length - 1,
    path: hops,
    confidence,
  };

  await safeSet(key, JSON.stringify(result), CACHE_TTL_ROUTING);
  return result;
}

/**
 * Get top Lightning nodes ranked by channel capacity.
 */
export async function getTopNodes(limit: number = 25): Promise<TopNode[]> {
  const capped = Math.min(limit, 100);
  const key = `ln:top:${capped}`;
  const cached = await safeGet(key);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  // 1ML doesn't have a direct top-n endpoint, so we scrape from statistics
  const statsData = await fetch1ML<any>('/statistics', CACHE_TTL_TOP, null);

  let nodes: TopNode[] = [];
  if (statsData && Array.isArray(statsData.top_nodes)) {
    nodes = statsData.top_nodes.slice(0, capped).map((n: any) => ({
      publicKey: n.pub_key || n.publicKey || '',
      alias: n.alias || 'Unknown',
      color: n.color || '#000000',
      capacity: n.capacity || 0,
      capacityBtc: satsToBtc(n.capacity || 0),
      channels: n.num_channels || n.channels || 0,
      uptimeEstimate: n.uptime ?? 99,
      country: n.country?.name,
    }));
  }

  await safeSet(key, JSON.stringify(nodes), CACHE_TTL_TOP);
  return nodes;
}
