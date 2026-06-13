/**
 * BTCFi Agent Skills Package — Agent Discovery Layer
 *
 * Defines machine-readable "skills" that AI agents can discover and invoke.
 * Each skill maps to one or more API endpoints, with metadata about
 * parameters, pricing, and capabilities.
 *
 * This file is served at /api/v1/agent-skills and can be consumed
 * by MCP servers, agent frameworks, and LLM tool routers.
 */

import { NextResponse } from 'next/server';

interface AgentSkill {
  /** Unique skill identifier (kebab-case) */
  id: string;
  /** Human-readable name */
  name: string;
  /** What this skill does — 1-2 sentences */
  description: string;
  /** Skill category for grouping */
  category: 'core' | 'intelligence' | 'security' | 'btcfi' | 'zk' | 'stream' | 'cross-chain';
  /** Required parameters */
  params: Array<{
    name: string;
    type: 'string' | 'number' | 'boolean';
    required: boolean;
    description: string;
    /** For enum params */
    enum?: string[];
  }>;
  /** API endpoint(s) this skill maps to */
  endpoints: Array<{
    method: 'GET' | 'POST';
    path: string;
  }>;
  /** Cost in USDC per invocation */
  price: number;
  /** Example usage prompt for LLMs */
  examplePrompt: string;
  /** Example response shape (key fields only) */
  exampleResponse: Record<string, unknown>;
  /** Tags for semantic search */
  tags: string[];
}

/**
 * Complete skill registry for BTCFi API.
 * Agents can discover available capabilities via GET /api/v1/agent-skills.
 */
const AGENT_SKILLS: AgentSkill[] = [
  // ── Core Bitcoin ──
  {
    id: 'btc-fees',
    name: 'Bitcoin Fee Estimation',
    description: 'Get current Bitcoin fee rates with USD cost estimates for fast, medium, and economy transactions.',
    category: 'core',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/fees' }],
    price: 0.01,
    examplePrompt: 'What are the current Bitcoin transaction fees?',
    exampleResponse: {
      fees: { fastestFee: 45, halfHourFee: 30, hourFee: 15, economyFee: 8 },
      price: { btcUsd: 105000 },
    },
    tags: ['fees', 'cost', 'transaction', 'bitcoin', 'mempool'],
  },
  {
    id: 'btc-mempool',
    name: 'Mempool Analysis',
    description: 'Get mempool summary including transaction count, total size, fee histogram, and recent transactions.',
    category: 'core',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/mempool' }],
    price: 0.01,
    examplePrompt: 'Show me the current Bitcoin mempool state.',
    exampleResponse: {
      count: 45000,
      size: 28000000,
      feeHistogram: [{ start: 1, count: 12000 }],
    },
    tags: ['mempool', 'pending', 'transactions', 'congestion', 'bitcoin'],
  },
  {
    id: 'btc-address-info',
    name: 'Address Lookup',
    description: 'Get Bitcoin address balance, transaction count, funded/spent stats from both chain and mempool.',
    category: 'core',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Bitcoin address (legacy, segwit, or taproot)' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/address/{addr}' }],
    price: 0.01,
    examplePrompt: 'What is the balance of bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh?',
    exampleResponse: {
      address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
      balance: 1.5,
      txCount: 42,
    },
    tags: ['address', 'balance', 'bitcoin', 'wallet', 'lookup'],
  },
  {
    id: 'btc-address-utxos',
    name: 'UTXO Enumeration',
    description: 'List all unspent transaction outputs for a Bitcoin address, essential for transaction construction.',
    category: 'core',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Bitcoin address' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/address/{addr}/utxos' }],
    price: 0.01,
    examplePrompt: 'List the UTXOs for address bc1q...',
    exampleResponse: {
      utxos: [{ txid: 'abc...', vout: 0, amount: 0.5, confirmations: 6 }],
    },
    tags: ['utxo', 'unspent', 'transaction-construction', 'bitcoin'],
  },
  {
    id: 'btc-address-txs',
    name: 'Address Transaction History',
    description: 'Get the transaction history for a Bitcoin address.',
    category: 'core',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Bitcoin address' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/address/{addr}/txs' }],
    price: 0.01,
    examplePrompt: 'Show recent transactions for this Bitcoin address.',
    exampleResponse: { txs: [{ txid: 'abc...', amount: 0.1, confirmed: true }] },
    tags: ['transactions', 'history', 'address', 'bitcoin'],
  },
  {
    id: 'btc-transaction',
    name: 'Transaction Details',
    description: 'Get full details for a Bitcoin transaction including inputs, outputs, fees, and confirmation status.',
    category: 'core',
    params: [
      { name: 'txid', type: 'string', required: true, description: 'Transaction ID (txid)' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/tx/{txid}' }],
    price: 0.01,
    examplePrompt: 'Show details for transaction abc123...',
    exampleResponse: { txid: 'abc...', confirmed: true, blockHeight: 850000, fee: 1500 },
    tags: ['transaction', 'details', 'bitcoin', 'txid'],
  },
  {
    id: 'btc-transaction-status',
    name: 'Transaction Confirmation Status',
    description: 'Check if a Bitcoin transaction is confirmed and how many confirmations it has.',
    category: 'core',
    params: [
      { name: 'txid', type: 'string', required: true, description: 'Transaction ID' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/tx/{txid}/status' }],
    price: 0.01,
    examplePrompt: 'Is this transaction confirmed?',
    exampleResponse: { confirmed: true, confirmations: 6 },
    tags: ['transaction', 'confirmation', 'status', 'bitcoin'],
  },
  {
    id: 'btc-broadcast',
    name: 'Broadcast Transaction',
    description: 'Broadcast a signed Bitcoin transaction to the network. This is a write operation.',
    category: 'core',
    params: [
      { name: 'txHex', type: 'string', required: true, description: 'Signed transaction hex' },
    ],
    endpoints: [{ method: 'POST', path: '/api/v1/tx/broadcast' }],
    price: 0.05,
    examplePrompt: 'Broadcast this signed transaction.',
    exampleResponse: { success: true, txid: 'abc...' },
    tags: ['broadcast', 'send', 'transaction', 'bitcoin', 'write'],
  },
  {
    id: 'btc-latest-blocks',
    name: 'Latest Blocks',
    description: 'Get the most recent Bitcoin blocks with height, hash, timestamp, and tx count.',
    category: 'core',
    params: [
      { name: 'limit', type: 'number', required: false, description: 'Number of blocks (default 10)' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/block/latest' }],
    price: 0.01,
    examplePrompt: 'Show me the latest Bitcoin blocks.',
    exampleResponse: { blocks: [{ height: 850000, hash: '0000...', txCount: 3000 }] },
    tags: ['blocks', 'latest', 'blockchain', 'bitcoin'],
  },
  {
    id: 'btc-block',
    name: 'Block Lookup',
    description: 'Get details for a specific Bitcoin block by height or hash.',
    category: 'core',
    params: [
      { name: 'id', type: 'string', required: true, description: 'Block height or hash' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/block/{id}' }],
    price: 0.01,
    examplePrompt: 'Get block 850000.',
    exampleResponse: { height: 850000, hash: '0000...', txCount: 3000 },
    tags: ['block', 'height', 'hash', 'bitcoin'],
  },

  // ── Intelligence ──
  {
    id: 'intel-fee-prediction',
    name: 'AI Fee Prediction',
    description: 'AI-powered Bitcoin fee predictions for 1-hour, 6-hour, and 24-hour windows with optimal timing.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/fees' }],
    price: 0.02,
    examplePrompt: 'What will Bitcoin fees be in the next few hours?',
    exampleResponse: {
      predictions: {
        '1h': { recommended: 25, confidence: 0.85 },
        '6h': { recommended: 20, confidence: 0.72 },
        '24h': { recommended: 18, confidence: 0.65 },
      },
    },
    tags: ['fees', 'prediction', 'ai', 'timing', 'intelligence'],
  },
  {
    id: 'intel-whales',
    name: 'Whale Transaction Detection',
    description: 'Detect large Bitcoin transactions (whale movements) in the mempool with buy/sell signal analysis.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/whales' }],
    price: 0.02,
    examplePrompt: 'Are there any large Bitcoin transactions happening right now?',
    exampleResponse: {
      whales: [{ txid: 'abc...', amount: 500, signal: 'accumulation' }],
    },
    tags: ['whales', 'large-transactions', 'signals', 'intelligence', 'mempool'],
  },
  {
    id: 'intel-risk-score',
    name: 'Address Risk Analysis',
    description: 'Score a Bitcoin address for risk based on transaction patterns, associations, and behavioral analysis.',
    category: 'intelligence',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Bitcoin address to analyze' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/risk/{addr}' }],
    price: 0.02,
    examplePrompt: 'Analyze the risk profile of this Bitcoin address.',
    exampleResponse: {
      risk: { score: 35, level: 'low', factors: ['established', 'no-mixer-contact'] },
    },
    tags: ['risk', 'analysis', 'security', 'address', 'intelligence'],
  },
  {
    id: 'intel-network-health',
    name: 'Network Health Metrics',
    description: 'Bitcoin network health including hashrate, difficulty, block time, and congestion analysis.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/network' }],
    price: 0.02,
    examplePrompt: 'How healthy is the Bitcoin network right now?',
    exampleResponse: {
      hashrate: '650 EH/s',
      difficulty: '88T',
      avgBlockTime: '9.8 min',
      congestion: 'low',
    },
    tags: ['network', 'hashrate', 'difficulty', 'health', 'congestion'],
  },
  {
    id: 'intel-utxo-consolidation',
    name: 'UTXO Consolidation Advisor',
    description: 'Analyze dust UTXOs and recommend optimal consolidation timing to save on fees.',
    category: 'intelligence',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Bitcoin address' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/consolidate/{addr}' }],
    price: 0.02,
    examplePrompt: 'Should I consolidate UTXOs for this address?',
    exampleResponse: {
      dustUtxos: 15,
      estimatedSavings: '0.0005 BTC',
      optimalFee: 8,
    },
    tags: ['utxo', 'consolidation', 'dust', 'optimization', 'fees'],
  },
  {
    id: 'intel-mvrv',
    name: 'MVRV Ratio',
    description: 'Market Value to Realized Value ratio — a key Bitcoin cycle indicator.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/mvrv' }],
    price: 0.02,
    examplePrompt: 'What is the current Bitcoin MVRV ratio?',
    exampleResponse: { mvrv: 1.85, signal: 'undervalued' },
    tags: ['mvrv', 'cycle', 'indicator', 'on-chain', 'valuation'],
  },
  {
    id: 'intel-sopr',
    name: 'SOPR (Spent Output Profit Ratio)',
    description: 'Whether spent outputs are in profit or loss — market sentiment indicator.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/sopr' }],
    price: 0.02,
    examplePrompt: 'What is the Bitcoin SOPR?',
    exampleResponse: { sopr: 1.02, signal: 'slight-profit-taking' },
    tags: ['sopr', 'profit', 'sentiment', 'on-chain', 'indicator'],
  },
  {
    id: 'intel-nupl',
    name: 'NUPL (Net Unrealized Profit/Loss)',
    description: 'Aggregate unrealized profit/loss across all Bitcoin holders — market phase indicator.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/nupl' }],
    price: 0.02,
    examplePrompt: 'What is the Bitcoin NUPL?',
    exampleResponse: { nupl: 0.45, phase: 'belief' },
    tags: ['nupl', 'profit', 'loss', 'market-phase', 'on-chain'],
  },
  {
    id: 'intel-hodl-waves',
    name: 'HODL Wave Distribution',
    description: 'Distribution of Bitcoin supply by age bands — shows long-term vs short-term holder activity.',
    category: 'intelligence',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/intelligence/hodl-waves' }],
    price: 0.02,
    examplePrompt: 'Show me the Bitcoin HODL wave distribution.',
    exampleResponse: {
      waves: { '1y+': '65%', '6m-1y': '15%', '1m-6m': '12%', '<1m': '8%' },
    },
    tags: ['hodl', 'waves', 'age', 'distribution', 'on-chain'],
  },

  // ── Security ──
  {
    id: 'security-threat-analysis',
    name: 'Address Threat Analysis',
    description: 'YARA-pattern threat detection for Bitcoin addresses — checks for known malicious patterns.',
    category: 'security',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Bitcoin address to scan' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/security/threat/{addr}' }],
    price: 0.02,
    examplePrompt: 'Scan this address for security threats.',
    exampleResponse: {
      threats: [],
      score: 0,
      patternsChecked: 8,
      status: 'clean',
    },
    tags: ['security', 'threat', 'yara', 'malicious', 'scam'],
  },

  // ── Solv Protocol / BTCFi ──
  {
    id: 'solv-reserves',
    name: 'SolvBTC Reserve Data',
    description: 'SolvBTC total supply across chains, backing ratio, and TVL metrics.',
    category: 'btcfi',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/solv/reserves' }],
    price: 0.02,
    examplePrompt: 'What are the current SolvBTC reserves?',
    exampleResponse: {
      totalSupply: '12000',
      backingRatio: 1.02,
      tvl: '1.2B',
    },
    tags: ['solv', 'reserves', 'btcfi', 'tvl', 'backing'],
  },
  {
    id: 'solv-yield',
    name: 'xSolvBTC Yield Data',
    description: 'xSolvBTC APY, yield strategies, and DeFi yield comparisons.',
    category: 'btcfi',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/solv/yield' }],
    price: 0.02,
    examplePrompt: 'What yield can I get on xSolvBTC?',
    exampleResponse: { apy: 4.5, strategies: ['lending', 'lp'] },
    tags: ['yield', 'apy', 'solv', 'btcfi', 'defi'],
  },
  {
    id: 'solv-liquidity',
    name: 'SolvBTC Cross-Chain Liquidity',
    description: 'Cross-chain SolvBTC liquidity distribution across Ethereum, BNB, and Arbitrum.',
    category: 'btcfi',
    params: [
      { name: 'chain', type: 'string', required: false, description: 'Filter by chain', enum: ['ethereum', 'bnb', 'arbitrum'] },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/solv/liquidity' }],
    price: 0.02,
    examplePrompt: 'Show SolvBTC liquidity distribution across chains.',
    exampleResponse: {
      ethereum: '8000',
      bnb: '2500',
      arbitrum: '1500',
    },
    tags: ['liquidity', 'cross-chain', 'solv', 'btcfi'],
  },
  {
    id: 'solv-risk',
    name: 'Solv Protocol Risk Assessment',
    description: 'Multi-factor risk assessment of the Solv Protocol including smart contract and counterparty risk.',
    category: 'btcfi',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/solv/risk' }],
    price: 0.02,
    examplePrompt: 'What are the risks of using Solv Protocol?',
    exampleResponse: { riskScore: 25, factors: ['audited', 'battle-tested'] },
    tags: ['risk', 'solv', 'btcfi', 'smart-contract', 'defi'],
  },

  // ── ZK Proofs ──
  {
    id: 'zk-balance-proof',
    name: 'Balance Range Proof',
    description: 'Generate a ZK proof that a Bitcoin address holds at least a threshold balance without revealing exact amount.',
    category: 'zk',
    params: [
      { name: 'address', type: 'string', required: true, description: 'Bitcoin address' },
      { name: 'threshold', type: 'number', required: true, description: 'Minimum balance to prove (BTC)' },
      { name: 'unit', type: 'string', required: false, description: 'Unit: btc or sats', enum: ['btc', 'sats'] },
    ],
    endpoints: [{ method: 'POST', path: '/api/v1/zk/balance-proof' }],
    price: 0.03,
    examplePrompt: 'Prove this address has at least 1 BTC without revealing the exact balance.',
    exampleResponse: { proof: { a: '0x...', b: '0x...', c: '0x...' }, publicInputs: ['...'] },
    tags: ['zk', 'proof', 'balance', 'privacy', 'groth16'],
  },
  {
    id: 'zk-age-proof',
    name: 'UTXO Age Proof',
    description: 'Generate a ZK proof that an address holds UTXOs older than N blocks — proves holding duration.',
    category: 'zk',
    params: [
      { name: 'address', type: 'string', required: true, description: 'Bitcoin address' },
      { name: 'minBlocks', type: 'number', required: true, description: 'Minimum block age' },
    ],
    endpoints: [{ method: 'POST', path: '/api/v1/zk/age-proof' }],
    price: 0.03,
    examplePrompt: 'Prove this address has UTXOs older than 1000 blocks.',
    exampleResponse: { proof: { a: '0x...', b: '0x...', c: '0x...' }, publicInputs: ['...'] },
    tags: ['zk', 'proof', 'age', 'hodl', 'privacy'],
  },
  {
    id: 'zk-membership-proof',
    name: 'Set Membership Proof',
    description: 'Generate a ZK proof that a Bitcoin address belongs to a specific set (e.g., whitelist).',
    category: 'zk',
    params: [
      { name: 'address', type: 'string', required: true, description: 'Bitcoin address' },
      { name: 'setRoot', type: 'string', required: true, description: 'Merkle root of the set' },
      { name: 'merkleProof', type: 'string', required: true, description: 'Merkle proof path (JSON array)' },
    ],
    endpoints: [{ method: 'POST', path: '/api/v1/zk/membership' }],
    price: 0.03,
    examplePrompt: 'Prove this address is in the allowed set.',
    exampleResponse: { proof: { a: '0x...', b: '0x...', c: '0x...' }, publicInputs: ['...'] },
    tags: ['zk', 'proof', 'membership', 'whitelist', 'merkle'],
  },
  {
    id: 'zk-verify',
    name: 'Verify ZK Proof',
    description: 'Verify any BTCFi ZK proof (balance, age, or membership) without re-generating it.',
    category: 'zk',
    params: [
      { name: 'proofType', type: 'string', required: true, description: 'Type of proof', enum: ['balance', 'age', 'membership'] },
      { name: 'proof', type: 'string', required: true, description: 'The proof object (JSON)' },
      { name: 'publicInputs', type: 'string', required: true, description: 'Public inputs (JSON array)' },
    ],
    endpoints: [{ method: 'POST', path: '/api/v1/zk/verify' }],
    price: 0.01,
    examplePrompt: 'Verify this ZK proof.',
    exampleResponse: { valid: true, proofType: 'balance' },
    tags: ['zk', 'verify', 'proof', 'validation'],
  },

  // ── Streams ──
  {
    id: 'stream-events',
    name: 'Real-Time Block & Mempool Stream',
    description: 'SSE stream of new blocks, fee changes, and mempool surge events.',
    category: 'stream',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/stream' }],
    price: 0.01,
    examplePrompt: 'Subscribe to real-time Bitcoin events.',
    exampleResponse: { event: 'new_block', data: { height: 850000 } },
    tags: ['stream', 'sse', 'real-time', 'blocks', 'mempool'],
  },
  {
    id: 'stream-whales',
    name: 'Whale Alert Stream',
    description: 'SSE stream of whale transaction alerts with configurable minimum BTC threshold.',
    category: 'stream',
    params: [
      { name: 'min', type: 'number', required: false, description: 'Minimum BTC amount (default 100)' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/stream/whales' }],
    price: 0.01,
    examplePrompt: 'Stream whale transactions over 100 BTC.',
    exampleResponse: { event: 'whale', data: { txid: 'abc...', amount: 500 } },
    tags: ['stream', 'whales', 'sse', 'real-time', 'alerts'],
  },

  // ── Cross-Chain ──
  {
    id: 'eth-gas',
    name: 'Ethereum Gas Prices',
    description: 'Get current Ethereum gas prices (gwei) for fast, standard, and slow transactions.',
    category: 'cross-chain',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/eth/gas' }],
    price: 0.01,
    examplePrompt: 'What are the current ETH gas prices?',
    exampleResponse: { fast: 45, standard: 25, slow: 15 },
    tags: ['ethereum', 'gas', 'gwei', 'fees', 'cross-chain'],
  },
  {
    id: 'eth-address',
    name: 'Ethereum Address Balance',
    description: 'Get ETH balance and token holdings for an Ethereum address.',
    category: 'cross-chain',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Ethereum address' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/eth/address/{addr}' }],
    price: 0.01,
    examplePrompt: 'What is the ETH balance of this address?',
    exampleResponse: { balance: 15.5, address: '0x...' },
    tags: ['ethereum', 'address', 'balance', 'cross-chain'],
  },
  {
    id: 'eth-transaction',
    name: 'Ethereum Transaction Details',
    description: 'Get details for an Ethereum transaction by hash.',
    category: 'cross-chain',
    params: [
      { name: 'hash', type: 'string', required: true, description: 'Transaction hash' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/eth/tx/{hash}' }],
    price: 0.01,
    examplePrompt: 'Show details for this ETH transaction.',
    exampleResponse: { hash: '0x...', status: 'success', gasUsed: 21000 },
    tags: ['ethereum', 'transaction', 'details', 'cross-chain'],
  },
  {
    id: 'sol-fees',
    name: 'Solana Priority Fees',
    description: 'Get current Solana priority fee estimates for fast, medium, and slow transactions.',
    category: 'cross-chain',
    params: [],
    endpoints: [{ method: 'GET', path: '/api/v1/sol/fees' }],
    price: 0.01,
    examplePrompt: 'What are the Solana priority fees right now?',
    exampleResponse: { fast: 0.005, standard: 0.001, slow: 0.0005 },
    tags: ['solana', 'fees', 'priority', 'cross-chain'],
  },
  {
    id: 'sol-address',
    name: 'Solana Address Balance',
    description: 'Get SOL balance for a Solana address.',
    category: 'cross-chain',
    params: [
      { name: 'addr', type: 'string', required: true, description: 'Solana address' },
    ],
    endpoints: [{ method: 'GET', path: '/api/v1/sol/address/{addr}' }],
    price: 0.01,
    examplePrompt: 'What is the SOL balance of this address?',
    exampleResponse: { balance: 125.5, address: '...' },
    tags: ['solana', 'address', 'balance', 'cross-chain'],
  },
];

/**
 * API route handler: GET /api/v1/agent-skills
 *
 * Returns the full skill registry with optional filtering.
 * Query params:
 *   - category: filter by category
 *   - tag: filter by tag
 *   - search: full-text search across name, description, tags
 *   - format: 'full' (default) | 'summary' (compact)
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const tag = url.searchParams.get('tag');
  const search = url.searchParams.get('search');
  const format = url.searchParams.get('format') || 'full';

  let skills = [...AGENT_SKILLS];

  // Filter by category
  if (category) {
    skills = skills.filter(s => s.category === category);
  }

  // Filter by tag
  if (tag) {
    const tagLower = tag.toLowerCase();
    skills = skills.filter(s => s.tags.some(t => t.includes(tagLower)));
  }

  // Full-text search
  if (search) {
    const q = search.toLowerCase();
    skills = skills.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.tags.some(t => t.includes(q))
    );
  }

  // Format response
  if (format === 'summary') {
    const summary = skills.map(s => ({
      id: s.id,
      name: s.name,
      category: s.category,
      price: s.price,
      endpoint: s.endpoints[0].path,
    }));

    return NextResponse.json({
      version: '1.0',
      provider: 'BTCFi API',
      url: 'https://btcfi.aiindigo.com',
      totalSkills: AGENT_SKILLS.length,
      filtered: summary.length,
      categories: [...new Set(AGENT_SKILLS.map(s => s.category))],
      skills: summary,
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600',
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
      },
    });
  }

  return NextResponse.json({
    version: '1.0',
    provider: 'BTCFi API',
    url: 'https://btcfi.aiindigo.com',
    mcp: '@aiindigo/btcfi-mcp',
    sdk: '@aiindigo/btcfi',
    totalSkills: AGENT_SKILLS.length,
    filtered: skills.length,
    categories: [...new Set(AGENT_SKILLS.map(s => s.category))],
    skills,
  }, {
    headers: {
      'Cache-Control': 'public, s-maxage=3600',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
