/**
 * Bitcoin Data Library
 * Fetches data from mempool.space API
 */

const MEMPOOL_API = 'https://mempool.space/api';

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
  const res = await fetch(`${MEMPOOL_API}/mempool`);
  if (!res.ok) throw new Error('Failed to fetch mempool summary');
  return res.json();
}

export async function getMempoolTxs(limit: number = 10): Promise<string[]> {
  const res = await fetch(`${MEMPOOL_API}/mempool/txids`);
  if (!res.ok) throw new Error('Failed to fetch mempool txs');
  const txids: string[] = await res.json();
  return txids.slice(0, limit);
}

export async function getMempoolRecent(): Promise<Transaction[]> {
  const res = await fetch(`${MEMPOOL_API}/mempool/recent`);
  if (!res.ok) throw new Error('Failed to fetch recent mempool txs');
  return res.json();
}

// ============ FEES ============

export async function getRecommendedFees(): Promise<RecommendedFees> {
  const res = await fetch(`${MEMPOOL_API}/v1/fees/recommended`);
  if (!res.ok) throw new Error('Failed to fetch recommended fees');
  return res.json();
}

export async function getFeeHistogram(): Promise<[number, number][]> {
  const res = await fetch(`${MEMPOOL_API}/v1/fees/mempool-blocks`);
  if (!res.ok) throw new Error('Failed to fetch fee histogram');
  return res.json();
}

// ============ ADDRESS ============

export async function getAddressInfo(address: string): Promise<AddressInfo> {
  const res = await fetch(`${MEMPOOL_API}/address/${address}`);
  if (!res.ok) throw new Error('Failed to fetch address info');
  return res.json();
}

export async function getAddressUtxos(address: string): Promise<UTXO[]> {
  const res = await fetch(`${MEMPOOL_API}/address/${address}/utxo`);
  if (!res.ok) throw new Error('Failed to fetch UTXOs');
  return res.json();
}

export async function getAddressTxs(address: string): Promise<Transaction[]> {
  const res = await fetch(`${MEMPOOL_API}/address/${address}/txs`);
  if (!res.ok) throw new Error('Failed to fetch address txs');
  return res.json();
}

// ============ TRANSACTION ============

export async function getTransaction(txid: string): Promise<Transaction> {
  const res = await fetch(`${MEMPOOL_API}/tx/${txid}`);
  if (!res.ok) throw new Error('Transaction not found');
  return res.json();
}

export async function getTxStatus(txid: string): Promise<Transaction['status']> {
  const res = await fetch(`${MEMPOOL_API}/tx/${txid}/status`);
  if (!res.ok) throw new Error('Failed to fetch tx status');
  return res.json();
}

export async function broadcastTx(txHex: string): Promise<string> {
  const res = await fetch(`${MEMPOOL_API}/tx`, {
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
  const res = await fetch(`${MEMPOOL_API}/blocks/tip/height`);
  if (!res.ok) throw new Error('Failed to fetch block height');
  return parseInt(await res.text());
}

export async function getBlockHash(height: number): Promise<string> {
  const res = await fetch(`${MEMPOOL_API}/block-height/${height}`);
  if (!res.ok) throw new Error('Failed to fetch block hash');
  return res.text();
}

export async function getBlock(hashOrHeight: string | number): Promise<Block> {
  let hash = hashOrHeight;
  if (typeof hashOrHeight === 'number') {
    hash = await getBlockHash(hashOrHeight);
  }
  const res = await fetch(`${MEMPOOL_API}/block/${hash}`);
  if (!res.ok) throw new Error('Block not found');
  return res.json();
}

export async function getLatestBlocks(limit: number = 10): Promise<Block[]> {
  const res = await fetch(`${MEMPOOL_API}/v1/blocks`);
  if (!res.ok) throw new Error('Failed to fetch blocks');
  const blocks: Block[] = await res.json();
  return blocks.slice(0, limit);
}

// ============ PRICE ============

export async function getBtcPrice(): Promise<{ USD: number; EUR: number }> {
  const res = await fetch(`${MEMPOOL_API}/v1/prices`);
  if (!res.ok) throw new Error('Failed to fetch price');
  return res.json();
}
