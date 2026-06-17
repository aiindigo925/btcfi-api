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
  if (endpoint.includes('/batch')) return '$0.01 base (per-item: $0.01 balance, $0.02 risk, $0.05 entity)';
  if (endpoint.includes('/zk/verify')) return '$0.01';
  if (endpoint.includes('/zk/')) return '$0.03';
  if (endpoint.includes('/intelligence/') || endpoint.includes('/security/') || endpoint.includes('/solv/')) return '$0.02';
  if (endpoint.includes('/runes')) return '$0.01';
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
  if (endpoint.includes('/runes')) return 'runes';
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
  // Address Cluster / Graph
  { name: 'btcfi_cluster_analysis', description: 'Analyze address cluster: find linked addresses using common input ownership, change detection, entity labels, and temporal proximity heuristics.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address to analyze' } }, required: ['address'] }, endpoint: '/api/v1/intelligence/cluster', method: 'GET', buildUrl: (a) => `/api/v1/intelligence/cluster/${a.address}` },
  { name: 'btcfi_address_graph', description: 'Build a connection graph (nodes + edges) up to N hops from a Bitcoin address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' }, depth: { type: 'number', description: 'Graph depth (1-5, default 2)' } }, required: ['address'] }, endpoint: '/api/v1/intelligence/graph', method: 'GET', buildUrl: (a) => `/api/v1/intelligence/graph/${a.address}${a.depth ? `?depth=${a.depth}` : ''}` },
  // Batch
  { name: 'btcfi_batch_query', description: 'Run multiple balance lookups, risk analyses, and entity lookups in parallel. Max 50 per category.', inputSchema: { type: 'object', properties: { addresses: { type: 'array', items: { type: 'string' }, description: 'Bitcoin addresses for balance lookup (max 50)' }, risk: { type: 'array', items: { type: 'string' }, description: 'Bitcoin addresses for risk analysis (max 50)' }, entity: { type: 'array', items: { type: 'string' }, description: 'Bitcoin addresses for entity lookup (max 50)' } }, required: [] }, endpoint: '/api/v1/batch', method: 'POST', buildUrl: () => '/api/v1/batch', buildBody: (a) => JSON.stringify({ addresses: a.addresses || [], risk: a.risk || [], entity: a.entity || [] }) },
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
  // Taproot Assets
  { name: 'btcfi_taproot_assets', description: 'List Taproot Assets (TAP) held by a Bitcoin address.', inputSchema: { type: 'object', properties: { address: { type: 'string', description: 'Bitcoin address' } }, required: ['address'] }, endpoint: '/api/v1/taproot/assets', method: 'GET', buildUrl: (a) => `/api/v1/taproot/assets/${a.address}` },
  { name: 'btcfi_taproot_asset_info', description: 'Get detailed Taproot Asset info by asset ID.', inputSchema: { type: 'object', properties: { assetId: { type: 'string', description: 'TAP asset ID' } }, required: ['assetId'] }, endpoint: '/api/v1/taproot/assets', method: 'GET', buildUrl: (a) => `/api/v1/taproot/assets/x/${a.assetId}` },
  // Lightning Insights
  { name: 'btcfi_lightning_node', description: 'Get Lightning Network node info: peers, capacity, routing fees.', inputSchema: { type: 'object', properties: { pubkey: { type: 'string', description: 'Lightning node public key' } }, required: ['pubkey'] }, endpoint: '/api/v1/lightning/node', method: 'GET', buildUrl: (a) => `/api/v1/lightning/node/${a.pubkey}` },
  { name: 'btcfi_lightning_channel', description: 'Get Lightning channel info: capacity, fee rates, uptime.', inputSchema: { type: 'object', properties: { chanId: { type: 'string', description: 'Channel ID or outpoint' } }, required: ['chanId'] }, endpoint: '/api/v1/lightning/channels', method: 'GET', buildUrl: (a) => `/api/v1/lightning/channels/${a.chanId}` },
  { name: 'btcfi_lightning_routing_fee', description: 'Estimate Lightning routing fee between two nodes.', inputSchema: { type: 'object', properties: { from: { type: 'string', description: 'Source node pubkey' }, to: { type: 'string', description: 'Destination node pubkey' }, amount: { type: 'number', description: 'Amount in sats' } }, required: ['from', 'to', 'amount'] }, endpoint: '/api/v1/lightning/routing-fee', method: 'GET', buildUrl: (a) => `/api/v1/lightning/routing-fee?from=${a.from}&to=${a.to}&amount=${a.amount}` },
  // Portfolio V2
  { name: 'btcfi_portfolio_get', description: 'Get saved multi-address portfolio by user ID.', inputSchema: { type: 'object', properties: { userId: { type: 'string', description: 'User identifier' } }, required: ['userId'] }, endpoint: '/api/v1/portfolio', method: 'GET', buildUrl: (a) => `/api/v1/portfolio/${a.userId}` },
  { name: 'btcfi_portfolio_analytics', description: 'Aggregate analytics across all addresses in a portfolio.', inputSchema: { type: 'object', properties: { userId: { type: 'string', description: 'User identifier' } }, required: ['userId'] }, endpoint: '/api/v1/portfolio', method: 'GET', buildUrl: (a) => `/api/v1/portfolio/${a.userId}/analytics` },
  // Runes Protocol
  { name: 'btcfi_runes_list', description: 'List all Bitcoin Runes tokens with pagination.', inputSchema: { type: 'object', properties: { page: { type: 'number', description: 'Page number (default 1)' }, limit: { type: 'number', description: 'Items per page (default 20, max 100)' } }, required: [] }, endpoint: '/api/v1/runes', method: 'GET', buildUrl: (a) => `/api/v1/runes?page=${a.page || 1}&limit=${a.limit || 20}` },
  { name: 'btcfi_rune_info', description: 'Get detailed info for a specific Runes token by ticker.', inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Rune ticker (e.g., DOG•GO•TO•THE•MOON)' } }, required: ['ticker'] }, endpoint: '/api/v1/runes/[ticker]', method: 'GET', buildUrl: (a) => `/api/v1/runes/${encodeURIComponent(a.ticker as string)}` },
  { name: 'btcfi_rune_holders', description: 'Get holder distribution for a Runes token.', inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Rune ticker' } }, required: ['ticker'] }, endpoint: '/api/v1/runes/[ticker]/holders', method: 'GET', buildUrl: (a) => `/api/v1/runes/${encodeURIComponent(a.ticker as string)}/holders` },
  { name: 'btcfi_rune_transfers', description: 'Get recent transfer activity for a Runes token.', inputSchema: { type: 'object', properties: { ticker: { type: 'string', description: 'Rune ticker' }, limit: { type: 'number', description: 'Number of transfers (default 20, max 100)' } }, required: ['ticker'] }, endpoint: '/api/v1/runes/[ticker]/transfers', method: 'GET', buildUrl: (a) => `/api/v1/runes/${encodeURIComponent(a.ticker as string)}/transfers?limit=${a.limit || 20}` },
  { name: 'btcfi_runes_trending', description: 'Get trending Runes tokens by 24h activity.', inputSchema: { type: 'object', properties: { limit: { type: 'number', description: 'Number of trending runes (default 10, max 50)' } }, required: [] }, endpoint: '/api/v1/runes/trending', method: 'GET', buildUrl: (a) => `/api/v1/runes/trending?limit=${a.limit || 10}` },
  // System
  { name: 'btcfi_health', description: 'Check BTCFi API health status.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/health', method: 'GET', buildUrl: () => '/api/health' },
  { name: 'btcfi_api_index', description: 'Get full BTCFi API index with all endpoints and pricing.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1', method: 'GET', buildUrl: () => '/api/v1' },
  // Alert Rules
  { name: 'btcfi_create_alert', description: 'Create a smart alert rule. Supports threshold, compound, scheduled, and anomaly types. Delivered via webhook or Telegram DM.', inputSchema: { type: 'object', properties: { type: { type: 'string', enum: ['threshold', 'compound', 'scheduled', 'anomaly'], description: 'Rule type' }, metric: { type: 'string', enum: ['price', 'fees', 'whale_btc', 'whale_count', 'mvrv', 'sopr', 'mempool_size', 'block_time'], description: 'Metric to monitor' }, op: { type: 'string', enum: ['>', '<', '>=', '<=', '==', 'crosses_above', 'crosses_below'], description: 'Comparison operator' }, value: { type: 'number', description: 'Threshold value' }, delivery: { type: 'object', description: 'Delivery config: { type: "webhook", url, secret } or { type: "telegram", userId }' } }, required: ['type', 'metric', 'op', 'value', 'delivery'] }, endpoint: '/api/v1/alerts/rules', method: 'POST', buildUrl: () => '/api/v1/alerts/rules', buildBody: (a) => JSON.stringify({ type: a.type, metric: a.metric, op: a.op, value: a.value, delivery: a.delivery }) },
  { name: 'btcfi_list_alerts', description: 'List all alert rules for the authenticated API key.', inputSchema: { type: 'object', properties: {}, required: [] }, endpoint: '/api/v1/alerts/rules', method: 'GET', buildUrl: () => '/api/v1/alerts/rules' },
  { name: 'btcfi_delete_alert', description: 'Delete an alert rule by ID.', inputSchema: { type: 'object', properties: { rule_id: { type: 'string', description: 'Alert rule ID to delete' } }, required: ['rule_id'] }, endpoint: '/api/v1/alerts/rules', method: 'GET', buildUrl: (a) => `/api/v1/alerts/rules/${a.rule_id}` },
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
