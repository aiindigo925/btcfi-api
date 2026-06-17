/**
 * Taproot Asset Tracking
 * Track TAP (Taproot Assets Protocol) assets held by addresses.
 * Uses public TAP indexers (tapd / protonet / public explorers).
 */

import { safeGet, safeSet } from './redis';
import { getBtcPrice } from './bitcoin';

const CACHE_TTL = 300; // 5 minutes
const TRANSFER_CACHE_TTL = 60; // 1 minute for transfers
const ASSET_INFO_CACHE_TTL = 600; // 10 minutes for asset metadata

// Public TAP indexer endpoints
const TAP_INDEXERS = [
  'https://tapindex.aiindigo.com',
  'https://protonet-node.com/taproot-assets',
];

function getTapIndexerUrl(): string {
  return process.env.TAP_INDEXER_URL || TAP_INDEXERS[0];
}

// ============ TYPES ============

export interface TaprootAsset {
  assetId: string;
  name: string;
  assetType: 'NORMAL' | 'COLLECTIBLE' | 'SCRIPT' | 'GROUP';
  amount: string;
  amountBtc?: string;
  scriptKey: string;
  internalKey: string;
  assetGroupKey?: string;
  creationTimeUnix: number;
  tapscriptRoot?: string;
}

export interface TaprootAssetInfo {
  assetId: string;
  name: string;
  assetType: 'NORMAL' | 'COLLECTIBLE' | 'SCRIPT' | 'GROUP';
  amount: string;
  amountBtc?: string;
  amountUsd?: string;
  genesisHeight: number;
  genesisTxHash: string;
  scriptKey: string;
  internalKey: string;
  assetGroupKey?: string;
  creationTimeUnix: number;
  tag?: string;
  metaHash?: string;
  outputIndex: number;
  totalSupply?: string;
  holders?: number;
  groupAnchor?: string;
}

export interface TaprootTransfer {
  txHash: string;
  blockHeight: number;
  blockTime: number;
  inputs: {
    address: string;
    assetId: string;
    amount: string;
    scriptKey: string;
  }[];
  outputs: {
    address: string;
    assetId: string;
    amount: string;
    scriptKey: string;
  }[];
  inputTotalSats: number;
  outputTotalSats: number;
  feeSats: number;
}

// ============ CACHE HELPERS ============

function cacheKey(prefix: string, param: string): string {
  return `tap:${prefix}:${param}`;
}

// ============ DATA FETCHING ============

async function fetchFromIndexer<T>(path: string, cacheTtl: number, fallback: T): Promise<T> {
  const key = cacheKey('idx', path.replace(/[^a-zA-Z0-9]/g, '_'));
  const cached = await safeGet(key);
  if (cached) {
    try { return JSON.parse(cached) as T; } catch { /* fall through */ }
  }

  const base = getTapIndexerUrl();
  try {
    const res = await fetch(`${base}${path}`, {
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

/**
 * Get Taproot Assets held by a Bitcoin address.
 * Queries public TAP indexers for assets bound to the address's script keys.
 */
export async function getTaprootAssets(address: string): Promise<{
  address: string;
  assets: TaprootAsset[];
  totalAssets: number;
  totalBtc: string;
  totalUsd: string;
  groups: { groupKey: string; name: string; count: number; totalAmount: string }[];
}> {
  const key = cacheKey('assets', address);
  const cached = await safeGet(key);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  // Query TAP indexer for assets held by address
  const data = await fetchFromIndexer<any>(`/v1/assets/address/${address}`, CACHE_TTL, null);

  let assets: TaprootAsset[] = [];
  if (data && Array.isArray(data.assets)) {
    assets = data.assets.map((a: any) => ({
      assetId: a.asset_id || a.assetId || '',
      name: a.name || 'Unknown',
      assetType: a.asset_type || a.assetType || 'NORMAL',
      amount: String(a.amount || '0'),
      amountBtc: a.amount ? (parseFloat(String(a.amount)) / 1e8).toFixed(8) : undefined,
      scriptKey: a.script_key || a.scriptKey || '',
      internalKey: a.internal_key || a.internalKey || '',
      assetGroupKey: a.asset_group_key || a.assetGroupKey,
      creationTimeUnix: a.creation_time_unix || a.creationTimeUnix || 0,
      tapscriptRoot: a.tapscript_root || a.tapscriptRoot,
    }));
  }

  // If indexer is down, return empty with graceful fallback
  if (assets.length === 0) {
    // Try mempool.space for basic taproot output detection
    const result = {
      address,
      assets: [] as TaprootAsset[],
      totalAssets: 0,
      totalBtc: '0',
      totalUsd: '0',
      groups: [] as { groupKey: string; name: string; count: number; totalAmount: string }[],
    };
    await safeSet(key, JSON.stringify(result), CACHE_TTL);
    return result;
  }

  const price = await getBtcPrice();
  let totalBtcSats = 0;
  const groupMap = new Map<string, { name: string; count: number; totalAmount: string }>();

  for (const asset of assets) {
    totalBtcSats += parseFloat(asset.amount || '0');
    if (asset.assetGroupKey) {
      const existing = groupMap.get(asset.assetGroupKey);
      if (existing) {
        existing.count += 1;
        existing.totalAmount = String(BigInt(existing.totalAmount) + BigInt(asset.amount || '0'));
      } else {
        groupMap.set(asset.assetGroupKey, {
          name: asset.name,
          count: 1,
          totalAmount: asset.amount || '0',
        });
      }
    }
  }

  const totalBtc = (totalBtcSats / 1e8).toFixed(8);
  const totalUsd = (totalBtcSats / 1e8 * price.USD).toFixed(2);

  const groups = Array.from(groupMap.entries()).map(([groupKey, info]) => ({
    groupKey,
    ...info,
  }));

  const result = {
    address,
    assets,
    totalAssets: assets.length,
    totalBtc,
    totalUsd,
    groups,
  };

  await safeSet(key, JSON.stringify(result), CACHE_TTL);
  return result;
}

/**
 * Get detailed info for a specific Taproot Asset by asset ID.
 */
export async function getTaprootAssetInfo(assetId: string): Promise<TaprootAssetInfo | null> {
  const key = cacheKey('info', assetId);
  const cached = await safeGet(key);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed === null) return null;
      return parsed as TaprootAssetInfo;
    } catch { /* fall through */ }
  }

  const data = await fetchFromIndexer<any>(`/v1/assets/${assetId}`, ASSET_INFO_CACHE_TTL, null);
  if (!data || !data.asset_id) {
    await safeSet(key, JSON.stringify(null), ASSET_INFO_CACHE_TTL);
    return null;
  }

  const price = await getBtcPrice();
  const amount = String(data.amount || '0');
  const amountBtc = (parseFloat(amount) / 1e8).toFixed(8);
  const amountUsd = (parseFloat(amount) / 1e8 * price.USD).toFixed(2);

  const info: TaprootAssetInfo = {
    assetId: data.asset_id || assetId,
    name: data.name || 'Unknown',
    assetType: data.asset_type || 'NORMAL',
    amount,
    amountBtc,
    amountUsd,
    genesisHeight: data.genesis_height || 0,
    genesisTxHash: data.genesis_tx_hash || '',
    scriptKey: data.script_key || '',
    internalKey: data.internal_key || '',
    assetGroupKey: data.asset_group_key,
    creationTimeUnix: data.creation_time_unix || 0,
    tag: data.tag,
    metaHash: data.meta_hash || data.meta_hash_encrypted,
    outputIndex: data.output_index || 0,
    totalSupply: data.total_supply ? String(data.total_supply) : undefined,
    holders: data.holders || undefined,
    groupAnchor: data.group_anchor,
  };

  await safeSet(key, JSON.stringify(info), ASSET_INFO_CACHE_TTL);
  return info;
}

/**
 * Get recent Taproot Asset transfers for an address.
 */
export async function getTaprootAssetTransfers(
  address: string,
  limit: number = 20,
): Promise<{
  address: string;
  transfers: TaprootTransfer[];
  count: number;
}> {
  const key = cacheKey('xfers', `${address}:${limit}`);
  const cached = await safeGet(key);
  if (cached) {
    try { return JSON.parse(cached); } catch { /* fall through */ }
  }

  const data = await fetchFromIndexer<any>(
    `/v1/transfers/address/${address}?limit=${Math.min(limit, 100)}`,
    TRANSFER_CACHE_TTL,
    null,
  );

  let transfers: TaprootTransfer[] = [];
  if (data && Array.isArray(data.transfers)) {
    transfers = data.transfers.map((t: any) => ({
      txHash: t.tx_hash || t.txHash || '',
      blockHeight: t.block_height || t.blockHeight || 0,
      blockTime: t.block_time || t.blockTime || 0,
      inputs: (t.inputs || []).map((i: any) => ({
        address: i.address || '',
        assetId: i.asset_id || i.assetId || '',
        amount: String(i.amount || '0'),
        scriptKey: i.script_key || i.scriptKey || '',
      })),
      outputs: (t.outputs || []).map((o: any) => ({
        address: o.address || '',
        assetId: o.asset_id || o.assetId || '',
        amount: String(o.amount || '0'),
        scriptKey: o.script_key || o.scriptKey || '',
      })),
      inputTotalSats: t.input_total_sats || t.inputTotalSats || 0,
      outputTotalSats: t.output_total_sats || t.outputTotalSats || 0,
      feeSats: t.fee_sats || t.feeSats || 0,
    }));
  }

  const result = {
    address,
    transfers: transfers.slice(0, limit),
    count: transfers.length,
  };

  await safeSet(key, JSON.stringify(result), TRANSFER_CACHE_TTL);
  return result;
}
