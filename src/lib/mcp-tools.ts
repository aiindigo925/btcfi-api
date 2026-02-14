/**
 * Shared MCP Tool Definitions — MP5 Phase 7
 * Used by both stdio MCP server (mcp/src/index.ts) and hosted HTTP MCP (/api/mcp).
 */

export interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  endpoint: string;
  method: 'GET' | 'POST';
  buildUrl: (args: Record<string, unknown>) => string;
  buildBody?: (args: Record<string, unknown>) => string;
}

export function getToolPrice(endpoint: string): string {
  if (endpoint.includes('/zk/verify')) return '$0.01';
  if (endpoint.includes('/zk/')) return '$0.03';
  if (endpoint.includes('/intelligence/') || endpoint.includes('/security/') || endpoint.includes('/solv/')) return '$0.02';
  if (endpoint.includes('/broadcast')) return '$0.05';
  if (endpoint.includes('/staking') || endpoint === '/api/health' || endpoint === '/api/v1') return 'free';
  if (endpoint.includes('/stream')) return '$0.01';
  return '$0.01';
}

export function getToolCategory(endpoint: string): string {
  if (endpoint.includes('/intelligence/')) return 'intelligence';
  if (endpoint.includes('/security/')) return 'security';
  if (endpoint.includes('/solv/')) return 'solv';
  if (endpoint.includes('/zk/')) return 'zk';
  if (endpoint.includes('/staking')) return 'staking';
  if (endpoint.includes('/stream')) return 'realtime';
  if (endpoint === '/api/health' || endpoint === '/api/v1') return 'system';
  return 'core';
}

export const TOOLS: ToolDef[] = [
  // Core
  { name: 'btcfi_get_fees', description: 'Get current Bitcoin fee rates with USD estimates.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/fees', method: 'GET', buildUrl: () => '/api/v1/fees' },
  { name: 'btcfi_get_mempool', description: 'Get Bitcoin mempool summary including tx count, size, fee histogram.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/mempool', method: 'GET', buildUrl: () => '/api/v1/mempool' },
  { name: 'btcfi_get_address', description: 'Get Bitcoin address info including balance, tx count, funded/spent stats.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/address', method: 'GET', buildUrl: (a) => `/api/v1/address/${a.address}` },
  { name: 'btcfi_get_utxos', description: 'Get unspent transaction outputs (UTXOs) for a Bitcoin address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/address', method: 'GET', buildUrl: (a) => `/api/v1/address/${a.address}/utxos` },
  { name: 'btcfi_get_address_txs', description: 'Get transaction history for a Bitcoin address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/address', method: 'GET', buildUrl: (a) => `/api/v1/address/${a.address}/txs` },
  { name: 'btcfi_get_tx', description: 'Get full details of a Bitcoin transaction.', inputSchema: { type: 'object', properties: { txid: { type: 'string', description: 'Transaction ID' } }, required: ['txid'] }, endpoint: '/api/v1/tx', method: 'GET', buildUrl: (a) => `/api/v1/tx/${a.txid}` },
  { name: 'btcfi_get_tx_status', description: 'Get confirmation status of a Bitcoin transaction.', inputSchema: { type: 'object', properties: { txid: { type: 'string', description: 'Transaction ID' } }, required: ['txid'] }, endpoint: '/api/v1/tx', method: 'GET', buildUrl: (a) => `/api/v1/tx/${a.txid}/status` },
  { name: 'btcfi_broadcast_tx', description: 'Broadcast a signed Bitcoin transaction to the network.', inputSchema: { type: 'object', properties: { txHex: { type: 'string', description: 'Signed transaction hex' } }, required: ['txHex'] }, endpoint: '/api/v1/tx/broadcast', method: 'POST', buildUrl: () => '/api/v1/tx/broadcast', buildBody: (a) => JSON.stringify({ txHex: a.txHex }) },
  { name: 'btcfi_get_block', description: 'Get a Bitcoin block by height or hash.', inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'Block height or hash' } }, required: ['id'] }, endpoint: '/api/v1/block', method: 'GET', buildUrl: (a) => `/api/v1/block/${a.id}` },
  { name: 'btcfi_get_latest_blocks', description: 'Get the most recent Bitcoin blocks.', inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Number of blocks (default 10)' } }, required: [] }, endpoint: '/api/v1/block/latest', method: 'GET', buildUrl: (a) => `/api/v1/block/latest${a.limit ? `?limit=${a.limit}` : ''}` },
  // Intelligence
  { name: 'btcfi_consolidation_advice', description: 'Get UTXO consolidation advice for a Bitcoin address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/intelligence/consolidate', method: 'GET', buildUrl: (a) => `/api/v1/intelligence/consolidate/${a.address}` },
  { name: 'btcfi_fee_prediction', description: 'AI-powered fee prediction for 1h, 6h, and 24h windows.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/intelligence/fees', method: 'GET', buildUrl: () => '/api/v1/intelligence/fees' },
  { name: 'btcfi_whale_alert', description: 'Detect large Bitcoin transactions and whale movements.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/intelligence/whales', method: 'GET', buildUrl: () => '/api/v1/intelligence/whales' },
  { name: 'btcfi_address_risk', description: 'Risk score for a Bitcoin address based on transaction patterns.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/intelligence/risk', method: 'GET', buildUrl: (a) => `/api/v1/intelligence/risk/${a.address}` },
  { name: 'btcfi_network_health', description: 'Bitcoin network health: hashrate, mempool congestion, difficulty.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/intelligence/network', method: 'GET', buildUrl: () => '/api/v1/intelligence/network' },
  // Security
  { name: 'btcfi_threat_analysis', description: 'YARA-pattern threat analysis for a Bitcoin address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/security/threat', method: 'GET', buildUrl: (a) => `/api/v1/security/threat/${a.address}` },
  // Staking
  { name: 'btcfi_staking_status', description: 'Check staking tier status for a wallet address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Wallet address' } }, required: [] }, endpoint: '/api/v1/staking/status', method: 'GET', buildUrl: (a) => `/api/v1/staking/status${a.address ? `?address=${a.address}` : ''}` },
  // Solv Protocol
  { name: 'btcfi_solv_reserves', description: 'SolvBTC total supply across chains with backing ratio and TVL.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/solv/reserves', method: 'GET', buildUrl: () => '/api/v1/solv/reserves' },
  { name: 'btcfi_solv_yield', description: 'xSolvBTC yield data: APY, yield strategies, comparisons.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/solv/yield', method: 'GET', buildUrl: () => '/api/v1/solv/yield' },
  { name: 'btcfi_solv_liquidity', description: 'Cross-chain SolvBTC liquidity distribution.', inputSchema: { type: 'object', properties: { chain: { type: 'string', enum: ['ethereum', 'bnb', 'arbitrum'], description: 'Filter by chain' } }, required: [] }, endpoint: '/api/v1/solv/liquidity', method: 'GET', buildUrl: (a) => `/api/v1/solv/liquidity${a.chain ? `?chain=${a.chain}` : ''}` },
  { name: 'btcfi_solv_risk', description: 'Multi-factor risk assessment for Solv Protocol.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/solv/risk', method: 'GET', buildUrl: () => '/api/v1/solv/risk' },
  // ZK Proofs
  { name: 'btcfi_zk_balance_proof', description: 'Generate ZK balance range proof.', inputSchema: { type: 'object', properties: { address: { type: 'string' }, threshold: { type: 'number' }, unit: { type: 'string', enum: ['btc', 'sats'] } }, required: ['address', 'threshold'] }, endpoint: '/api/v1/zk/balance-proof', method: 'POST', buildUrl: () => '/api/v1/zk/balance-proof', buildBody: (a) => JSON.stringify({ address: a.address, threshold: a.threshold, unit: a.unit || 'sats' }) },
  { name: 'btcfi_zk_age_proof', description: 'Generate ZK UTXO age proof.', inputSchema: { type: 'object', properties: { address: { type: 'string' }, minBlocks: { type: 'number' } }, required: ['address', 'minBlocks'] }, endpoint: '/api/v1/zk/age-proof', method: 'POST', buildUrl: () => '/api/v1/zk/age-proof', buildBody: (a) => JSON.stringify({ address: a.address, minBlocks: a.minBlocks }) },
  { name: 'btcfi_zk_membership', description: 'Generate ZK set membership proof.', inputSchema: { type: 'object', properties: { address: { type: 'string' }, setRoot: { type: 'string' }, merkleProof: { type: 'array', items: { type: 'string' } } }, required: ['address', 'setRoot', 'merkleProof'] }, endpoint: '/api/v1/zk/membership', method: 'POST', buildUrl: () => '/api/v1/zk/membership', buildBody: (a) => JSON.stringify({ address: a.address, setRoot: a.setRoot, merkleProof: a.merkleProof }) },
  { name: 'btcfi_zk_verify', description: 'Verify any BTCFi ZK proof.', inputSchema: { type: 'object', properties: { proofType: { type: 'string', enum: ['balance_range', 'utxo_age', 'set_membership'] }, proof: { type: 'object' }, publicInputs: { type: 'array', items: { type: 'string' } } }, required: ['proofType', 'proof', 'publicInputs'] }, endpoint: '/api/v1/zk/verify', method: 'POST', buildUrl: () => '/api/v1/zk/verify', buildBody: (a) => JSON.stringify({ proofType: a.proofType, proof: a.proof, publicInputs: a.publicInputs }) },
  // System
  { name: 'btcfi_health', description: 'Check BTCFi API health status.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/health', method: 'GET', buildUrl: () => '/api/health' },
  { name: 'btcfi_api_index', description: 'Get full BTCFi API index with all endpoints and pricing.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1', method: 'GET', buildUrl: () => '/api/v1' },
];

/** Call a BTCFi API endpoint internally (server-side, no x402 needed) */
export async function callToolInternal(tool: ToolDef, args: Record<string, unknown>): Promise<string> {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
  const internalKey = process.env.INTERNAL_API_KEY || '';

  const url = `${base}${tool.buildUrl(args)}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (internalKey) headers['X-Internal-Key'] = internalKey;

  const options: RequestInit = { method: tool.method, headers };
  if (tool.method === 'POST' && tool.buildBody) {
    options.body = tool.buildBody(args);
  }

  const response = await fetch(url, { ...options, signal: AbortSignal.timeout(15000) });
  const data = await response.json();
  return JSON.stringify(data, null, 2);
}
