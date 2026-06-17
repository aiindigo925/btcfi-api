/**
 * Bitcoin Data Library
 * Fetches data from mempool.space API
 */

const MEMPOOL_API = 'https://mempool.space/api';

// ============ COINGEKO MULTI-CURRENCY ============

const COINGEKO_CURRENCIES = 'usd,eur,gbp,jpy,aud,cad,chf,cny,inr,hkd,sgd,krw,brl,zar,mxn,idr,try,sar,aed,sek,nok,dkk,pln,czk,ils,thb,twd,php,myr,pkr,ngn,ars,clp,cop,egp,uah,vnd,bdt,kwd,gel';
let coingeckoCache: Record<string, number> | null = null;
let coingeckoCacheTimestamp = 0;
const COINGEKO_CACHE_TTL = 60_000; // 60 seconds

/**
 * BTC price in multiple currencies.
 * Keys are lowercase currency codes (usd, eur, gbp, …).
 */
export type BtcPriceExtended = Record<string, number>;

/**
 * Fetch BTC price in 38 currencies from CoinGecko.
 * In-memory cache for 60s. Gracefully returns {} on failure.
 */
export async function getBtcPriceExtended(): Promise<Record<string, number>> {
  const now = Date.now();
  if (coingeckoCache && now - coingeckoCacheTimestamp < COINGEKO_CACHE_TTL) {
    return coingeckoCache;
  }

  try {
    const url = `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=${COINGEKO_CURRENCIES}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return {};
    const json = await res.json();
    const prices: Record<string, number> = json?.bitcoin ?? {};
    coingeckoCache = prices;
    coingeckoCacheTimestamp = now;
    return prices;
  } catch {
    return {};
  }
}

export interface MempoolSummary {
  count: number;
  vsize: number;
  total_fee: number;
  fee_histogram: [number, number][];
}

export interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface AddressInfo {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

export interface UTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
  value: number;
}

export interface Transaction {
  txid: string;
  version: number;
  locktime: number;
  vin: any[];
  vout: any[];
  size: number;
  weight: number;
  fee: number;
  status: {
    confirmed: boolean;
    block_height?: number;
    block_hash?: string;
    block_time?: number;
  };
}

export interface Block {
  id: string;
  height: number;
  version: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight: number;
  merkle_root: string;
  previousblockhash: string;
  mediantime: number;
  nonce: number;
  bits: number;
  difficulty: number;
}

// ============ MEMPOOL ============

export async function getMempoolSummary(): Promise<MempoolSummary> {
  const res = await fetch(`${MEMPOOL_API}/mempool`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch mempool summary');
  return res.json();
}

export async function getMempoolRecent(): Promise<any[]> {
  // Primary: mempool.space
  try {
    const res = await fetch(`${MEMPOOL_API}/mempool/recent`, { signal: AbortSignal.timeout(8000) });
    if (res.ok) return res.json();
  } catch { /* fall through to backup */ }

  // Backup: blockstream.info (same response format, fewer txs)
  try {
    const res = await fetch('https://blockstream.info/api/mempool/recent', { signal: AbortSignal.timeout(8000) });
    if (res.ok) return res.json();
  } catch { /* both failed */ }

  return []; // graceful degradation — caller handles empty array
}

// ============ FEES ============

export async function getRecommendedFees(): Promise<RecommendedFees> {
  const res = await fetch(`${MEMPOOL_API}/v1/fees/recommended`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch recommended fees');
  return res.json();
}

/**
 * Projected next blocks with fee ranges from mempool.space
 */
export async function getMempoolBlocks(): Promise<unknown[]> {
  const res = await fetch(`${MEMPOOL_API}/v1/fees/mempool-blocks`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch mempool blocks');
  return res.json();
}

// ============ ADDRESS ============

export async function getAddressInfo(address: string): Promise<AddressInfo> {
  const res = await fetch(`${MEMPOOL_API}/address/${address}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch address info');
  return res.json();
}

export async function getAddressUtxos(address: string): Promise<UTXO[]> {
  const res = await fetch(`${MEMPOOL_API}/address/${address}/utxo`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch UTXOs');
  return res.json();
}

export async function getAddressTxs(address: string): Promise<Transaction[]> {
  const res = await fetch(`${MEMPOOL_API}/address/${address}/txs`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch address txs');
  return res.json();
}

// ============ TRANSACTION ============

export async function getTransaction(txid: string): Promise<Transaction> {
  const res = await fetch(`${MEMPOOL_API}/tx/${txid}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Transaction not found');
  return res.json();
}

export async function getTxStatus(txid: string): Promise<Transaction['status']> {
  const res = await fetch(`${MEMPOOL_API}/tx/${txid}/status`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch tx status');
  return res.json();
}

export async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${MEMPOOL_API}/tx`, {
    signal: AbortSignal.timeout(10000),
    method: 'POST',
    body: txHex,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Broadcast failed: ${error}`);
  }
  return res.text(); // Returns txid
}

// ============ BLOCKS ============

export async function getBlockHeight(): Promise<number> {
  const res = await fetch(`${MEMPOOL_API}/blocks/tip/height`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch block height');
  const n = parseInt(await res.text());
  if (isNaN(n)) throw new Error('Invalid block height response');
  return n;
}

export async function getBlockHash(height: number): Promise<string> {
  const res = await fetch(`${MEMPOOL_API}/block-height/${height}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch block hash');
  return res.text();
}

export async function getBlock(hashOrHeight: string | number): Promise<Block> {
  let hash = hashOrHeight;
  if (typeof hashOrHeight === 'number') {
    hash = await getBlockHash(hashOrHeight);
  }
  const res = await fetch(`${MEMPOOL_API}/block/${hash}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Block not found');
  return res.json();
}

export async function getLatestBlocks(limit: number = 10): Promise<Block[]> {
  const res = await fetch(`${MEMPOOL_API}/v1/blocks`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch blocks');
  const blocks: Block[] = await res.json();
  return blocks.slice(0, limit);
}

// ============ GENERIC FETCH ============

/**
 * Generic fetcher for any mempool.space API path.
 * Used by zk.ts and other modules that need raw endpoint access.
 */
export async function fetchBitcoinData(path: string): Promise<any> {
  const res = await fetch(`${MEMPOOL_API}${path}`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`mempool.space ${path} returned ${res.status}`);
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  const text = await res.text();
  const num = Number(text);
  return isNaN(num) ? text : num;
}

// ============ PRICE ============

export async function getBtcPrice(): Promise<{ USD: number; EUR: number }> {
  const res = await fetch(`${MEMPOOL_API}/v1/prices`, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error('Failed to fetch price');
  return res.json();
}


