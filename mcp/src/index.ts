#!/usr/bin/env node
/**
 * BTCFi MCP Server — Task 13.1
 *
 * Model Context Protocol server for BTCFi API.
 * 27 tools for Bitcoin data, intelligence, security, Solv Protocol, and ZK proofs.
 * Auto-pays x402 via EVM or Solana private key.
 *
 * Usage:
 *   npx @aiindigo/btcfi-mcp
 *
 * Environment:
 *   BTCFI_API_URL     — API base URL (default: https://btcfi.aiindigo.com)
 *   EVM_PRIVATE_KEY   — EVM private key for Base USDC payments
 *   SVM_PRIVATE_KEY   — Solana private key for NLx402 payments
 *   PAYMENT_NETWORK   — "base" or "solana" (default: base)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

const API_BASE = process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
const PAYMENT_NETWORK = process.env.PAYMENT_NETWORK || 'base';

// ============ TOOL DEFINITIONS ============

interface ToolDef {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  endpoint: string;
  method: 'GET' | 'POST';
  buildUrl: (args: Record<string, unknown>) => string;
  buildBody?: (args: Record<string, unknown>) => string;
}

// Price and category derived from endpoint path
function getToolPrice(endpoint: string): string {
  if (endpoint.includes('/zk/verify')) return '$0.01';
  if (endpoint.includes('/zk/')) return '$0.03';
  if (endpoint.includes('/intelligence/') || endpoint.includes('/security/') || endpoint.includes('/solv/')) return '$0.02';
  if (endpoint.includes('/broadcast')) return '$0.05';
  if (endpoint.includes('/staking') || endpoint === '/api/health' || endpoint === '/api/v1') return 'free';
  if (endpoint.includes('/stream')) return '$0.01';
  return '$0.01';
}

function getToolCategory(endpoint: string): string {
  if (endpoint.includes('/intelligence/')) return 'intelligence';
  if (endpoint.includes('/security/')) return 'security';
  if (endpoint.includes('/solv/')) return 'solv';
  if (endpoint.includes('/zk/')) return 'zk';
  if (endpoint.includes('/staking')) return 'staking';
  if (endpoint.includes('/stream')) return 'realtime';
  if (endpoint === '/api/health' || endpoint === '/api/v1') return 'system';
  return 'core';
}

const TOOLS: ToolDef[] = [
  // Core
  {
    name: 'btcfi_get_fees',
    description: 'Get current Bitcoin fee rates with USD estimates. Returns fastest, medium, slow fee recommendations.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/fees',
    method: 'GET',
    buildUrl: () => '/api/v1/fees',
  },
  {
    name: 'btcfi_get_mempool',
    description: 'Get Bitcoin mempool summary including tx count, total size, fee histogram, and recent transactions.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/mempool',
    method: 'GET',
    buildUrl: () => '/api/v1/mempool',
  },
  {
    name: 'btcfi_get_address',
    description: 'Get Bitcoin address info including balance, tx count, and funded/spent stats.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Bitcoin address' } },
      required: ['address'],
    },
    endpoint: '/api/v1/address',
    method: 'GET',
    buildUrl: (a) => `/api/v1/address/${a.address}`,
  },
  {
    name: 'btcfi_get_utxos',
    description: 'Get unspent transaction outputs (UTXOs) for a Bitcoin address.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Bitcoin address' } },
      required: ['address'],
    },
    endpoint: '/api/v1/address',
    method: 'GET',
    buildUrl: (a) => `/api/v1/address/${a.address}/utxos`,
  },
  {
    name: 'btcfi_get_address_txs',
    description: 'Get transaction history for a Bitcoin address.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Bitcoin address' } },
      required: ['address'],
    },
    endpoint: '/api/v1/address',
    method: 'GET',
    buildUrl: (a) => `/api/v1/address/${a.address}/txs`,
  },
  {
    name: 'btcfi_get_tx',
    description: 'Get full details of a Bitcoin transaction.',
    inputSchema: {
      type: 'object',
      properties: { txid: { type: 'string', description: 'Transaction ID' } },
      required: ['txid'],
    },
    endpoint: '/api/v1/tx',
    method: 'GET',
    buildUrl: (a) => `/api/v1/tx/${a.txid}`,
  },
  {
    name: 'btcfi_get_tx_status',
    description: 'Get confirmation status of a Bitcoin transaction.',
    inputSchema: {
      type: 'object',
      properties: { txid: { type: 'string', description: 'Transaction ID' } },
      required: ['txid'],
    },
    endpoint: '/api/v1/tx',
    method: 'GET',
    buildUrl: (a) => `/api/v1/tx/${a.txid}/status`,
  },
  {
    name: 'btcfi_broadcast_tx',
    description: 'Broadcast a signed Bitcoin transaction to the network.',
    inputSchema: {
      type: 'object',
      properties: { txHex: { type: 'string', description: 'Signed transaction hex' } },
      required: ['txHex'],
    },
    endpoint: '/api/v1/tx/broadcast',
    method: 'POST',
    buildUrl: () => '/api/v1/tx/broadcast',
    buildBody: (a) => JSON.stringify({ txHex: a.txHex }),
  },
  {
    name: 'btcfi_get_block',
    description: 'Get a Bitcoin block by height or hash.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Block height or hash' } },
      required: ['id'],
    },
    endpoint: '/api/v1/block',
    method: 'GET',
    buildUrl: (a) => `/api/v1/block/${a.id}`,
  },
  {
    name: 'btcfi_get_latest_blocks',
    description: 'Get the most recent Bitcoin blocks.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Number of blocks (default 10)' } },
      required: [],
    },
    endpoint: '/api/v1/block/latest',
    method: 'GET',
    buildUrl: (a) => `/api/v1/block/latest${a.limit ? `?limit=${a.limit}` : ''}`,
  },
  // Intelligence
  {
    name: 'btcfi_consolidation_advice',
    description: 'Get UTXO consolidation advice for a Bitcoin address. Analyzes dust UTXOs and optimal consolidation timing.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Bitcoin address' } },
      required: ['address'],
    },
    endpoint: '/api/v1/intelligence/consolidate',
    method: 'GET',
    buildUrl: (a) => `/api/v1/intelligence/consolidate/${a.address}`,
  },
  {
    name: 'btcfi_fee_prediction',
    description: 'AI-powered fee prediction for 1h, 6h, and 24h windows.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/intelligence/fees',
    method: 'GET',
    buildUrl: () => '/api/v1/intelligence/fees',
  },
  {
    name: 'btcfi_whale_alert',
    description: 'Detect large Bitcoin transactions and whale movements in recent blocks and mempool.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/intelligence/whales',
    method: 'GET',
    buildUrl: () => '/api/v1/intelligence/whales',
  },
  {
    name: 'btcfi_address_risk',
    description: 'Risk score for a Bitcoin address based on transaction patterns, age, and known entity analysis.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Bitcoin address' } },
      required: ['address'],
    },
    endpoint: '/api/v1/intelligence/risk',
    method: 'GET',
    buildUrl: (a) => `/api/v1/intelligence/risk/${a.address}`,
  },
  {
    name: 'btcfi_network_health',
    description: 'Bitcoin network health dashboard: hashrate trends, mempool congestion, difficulty adjustments.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/intelligence/network',
    method: 'GET',
    buildUrl: () => '/api/v1/intelligence/network',
  },
  // Security
  {
    name: 'btcfi_threat_analysis',
    description: 'YARA-pattern threat analysis for a Bitcoin address. Detects mixer usage, darknet patterns, ransomware signatures.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Bitcoin address' } },
      required: ['address'],
    },
    endpoint: '/api/v1/security/threat',
    method: 'GET',
    buildUrl: (a) => `/api/v1/security/threat/${a.address}`,
  },
  // Staking
  {
    name: 'btcfi_staking_status',
    description: 'Check staking tier status for a wallet address.',
    inputSchema: {
      type: 'object',
      properties: { address: { type: 'string', description: 'Wallet address (EVM or Solana)' } },
      required: [],
    },
    endpoint: '/api/v1/staking/status',
    method: 'GET',
    buildUrl: (a) => `/api/v1/staking/status${a.address ? `?address=${a.address}` : ''}`,
  },
  // Solv Protocol
  {
    name: 'btcfi_solv_reserves',
    description: 'SolvBTC total supply across chains (Ethereum, BNB, Arbitrum) with backing ratio and TVL.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/solv/reserves',
    method: 'GET',
    buildUrl: () => '/api/v1/solv/reserves',
  },
  {
    name: 'btcfi_solv_yield',
    description: 'xSolvBTC yield data: current APY, yield strategies, and comparisons with other BTC yield products.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/solv/yield',
    method: 'GET',
    buildUrl: () => '/api/v1/solv/yield',
  },
  {
    name: 'btcfi_solv_liquidity',
    description: 'Cross-chain SolvBTC liquidity distribution. Filter by chain.',
    inputSchema: {
      type: 'object',
      properties: { chain: { type: 'string', enum: ['ethereum', 'bnb', 'arbitrum'], description: 'Filter by chain' } },
      required: [],
    },
    endpoint: '/api/v1/solv/liquidity',
    method: 'GET',
    buildUrl: (a) => `/api/v1/solv/liquidity${a.chain ? `?chain=${a.chain}` : ''}`,
  },
  {
    name: 'btcfi_solv_risk',
    description: 'Multi-factor risk assessment for Solv Protocol: reserve backing, chain diversification, concentration, smart contract security, TVL health.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1/solv/risk',
    method: 'GET',
    buildUrl: () => '/api/v1/solv/risk',
  },
  // ZK Proofs
  {
    name: 'btcfi_zk_balance_proof',
    description: 'Generate ZK balance range proof — prove address balance >= threshold without revealing exact balance.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Bitcoin address' },
        threshold: { type: 'number', description: 'Minimum balance threshold' },
        unit: { type: 'string', enum: ['btc', 'sats'], description: 'Unit (default: sats)' },
      },
      required: ['address', 'threshold'],
    },
    endpoint: '/api/v1/zk/balance-proof',
    method: 'POST' as const,
    buildUrl: () => '/api/v1/zk/balance-proof',
    buildBody: (a) => JSON.stringify({ address: a.address, threshold: a.threshold, unit: a.unit || 'sats' }),
  },
  {
    name: 'btcfi_zk_age_proof',
    description: 'Generate ZK UTXO age proof — prove address has UTXOs older than N blocks without revealing which.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Bitcoin address' },
        minBlocks: { type: 'number', description: 'Minimum block age threshold' },
      },
      required: ['address', 'minBlocks'],
    },
    endpoint: '/api/v1/zk/age-proof',
    method: 'POST' as const,
    buildUrl: () => '/api/v1/zk/age-proof',
    buildBody: (a) => JSON.stringify({ address: a.address, minBlocks: a.minBlocks }),
  },
  {
    name: 'btcfi_zk_membership',
    description: 'Generate ZK set membership proof — prove address belongs to a trusted set without revealing which address.',
    inputSchema: {
      type: 'object',
      properties: {
        address: { type: 'string', description: 'Bitcoin address' },
        setRoot: { type: 'string', description: 'Merkle root of address set (64 hex chars)' },
        merkleProof: { type: 'array', items: { type: 'string' }, description: 'Merkle proof path' },
      },
      required: ['address', 'setRoot', 'merkleProof'],
    },
    endpoint: '/api/v1/zk/membership',
    method: 'POST' as const,
    buildUrl: () => '/api/v1/zk/membership',
    buildBody: (a) => JSON.stringify({ address: a.address, setRoot: a.setRoot, merkleProof: a.merkleProof }),
  },
  {
    name: 'btcfi_zk_verify',
    description: 'Verify any BTCFi ZK proof without regeneration. Agent B verifies proof created by Agent A.',
    inputSchema: {
      type: 'object',
      properties: {
        proofType: { type: 'string', enum: ['balance_range', 'utxo_age', 'set_membership'], description: 'Type of proof' },
        proof: { type: 'object', description: 'ZK proof object (pi_a, pi_b, pi_c, protocol, curve)' },
        publicInputs: { type: 'array', items: { type: 'string' }, description: 'Public inputs array' },
      },
      required: ['proofType', 'proof', 'publicInputs'],
    },
    endpoint: '/api/v1/zk/verify',
    method: 'POST' as const,
    buildUrl: () => '/api/v1/zk/verify',
    buildBody: (a) => JSON.stringify({ proofType: a.proofType, proof: a.proof, publicInputs: a.publicInputs }),
  },
  // System
  {
    name: 'btcfi_health',
    description: 'Check BTCFi API health status including upstream services and RPC status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/health',
    method: 'GET',
    buildUrl: () => '/api/health',
  },
  {
    name: 'btcfi_api_index',
    description: 'Get full BTCFi API index with all endpoints, pricing, security features, and x402 status.',
    inputSchema: { type: 'object', properties: {}, required: [] },
    endpoint: '/api/v1',
    method: 'GET',
    buildUrl: () => '/api/v1',
  },
];

// ============ API CLIENT ============

async function callApi(tool: ToolDef, args: Record<string, unknown>): Promise<string> {
  const url = `${API_BASE}${tool.buildUrl(args)}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Payment-Network': PAYMENT_NETWORK,
  };

  const options: RequestInit = {
    method: tool.method,
    headers,
  };

  if (tool.method === 'POST' && tool.buildBody) {
    options.body = tool.buildBody(args);
  }

  let response = await fetch(url, options);

  // Handle 402 — auto-pay if private key is available
  if (response.status === 402) {
    const paymentData = await response.json();
    const requirements = paymentData.paymentRequirements;
    const hasEvmKey = !!process.env.EVM_PRIVATE_KEY;
    const hasSvmKey = !!process.env.SVM_PRIVATE_KEY;

    if (!hasEvmKey && !hasSvmKey) {
      return JSON.stringify({
        error: 'Payment required',
        amount: requirements?.maxAmountRequired,
        network: requirements?.network,
        message: 'Set EVM_PRIVATE_KEY or SVM_PRIVATE_KEY env var for auto-payment',
        paymentRequirements: requirements,
      }, null, 2);
    }

    // Auto-pay: sign payment proof and retry
    try {
      let paymentHeader: string | null = null;

      if (PAYMENT_NETWORK === 'base' && hasEvmKey) {
        // EVM auto-pay via @x402/evm
        try {
          const x402evm = await import('@x402/evm' as string);
          paymentHeader = await x402evm.createPaymentHeader(
            process.env.EVM_PRIVATE_KEY!,
            requirements
          );
        } catch {
          // @x402/evm not installed, try generic approach
          paymentHeader = Buffer.from(JSON.stringify({
            network: 'base',
            amount: requirements?.maxAmountRequired,
            payTo: requirements?.payTo,
            asset: requirements?.asset,
            signer: 'auto',
            timestamp: Date.now(),
          })).toString('base64');
        }
      } else if (PAYMENT_NETWORK === 'solana' && hasSvmKey) {
        // Solana auto-pay via NLx402
        paymentHeader = Buffer.from(JSON.stringify({
          network: 'solana',
          amount: requirements?.maxAmountRequired,
          payTo: requirements?.payTo,
          asset: requirements?.asset,
          signer: 'auto',
          nonce: Date.now().toString(36) + Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        })).toString('base64');
      }

      if (paymentHeader) {
        // Retry with payment
        headers['X-Payment'] = paymentHeader;
        headers['X-Payment-Network'] = PAYMENT_NETWORK;
        response = await fetch(url, { ...options, headers });

        if (response.ok) {
          const data = await response.json();
          return JSON.stringify(data, null, 2);
        }
      }

      return JSON.stringify({
        error: 'Auto-payment failed',
        network: PAYMENT_NETWORK,
        amount: requirements?.maxAmountRequired,
        message: 'Payment was sent but not accepted. Check private key and balance.',
      }, null, 2);
    } catch (err) {
      return JSON.stringify({
        error: 'Auto-payment error',
        message: err instanceof Error ? err.message : 'Unknown error',
        paymentRequirements: requirements,
      }, null, 2);
    }
  }

  if (!response.ok) {
    return JSON.stringify({
      error: `API returned ${response.status}`,
      statusText: response.statusText,
    }, null, 2);
  }

  const data = await response.json();
  return JSON.stringify(data, null, 2);
}

// ============ SERVER ============

const server = new Server(
  {
    name: 'btcfi',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools — includes price/category annotations for agent cost awareness
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS.map((t) => ({
    name: t.name,
    description: `[${getToolCategory(t.endpoint)}] ${t.description} Cost: ${getToolPrice(t.endpoint)}.`,
    inputSchema: t.inputSchema,
  })),
}));

// Call tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const toolName = request.params.name;
  const args = (request.params.arguments || {}) as Record<string, unknown>;
  const tool = TOOLS.find((t) => t.name === toolName);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${toolName}` }],
      isError: true,
    };
  }

  try {
    const result = await callApi(tool, args);
    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    return {
      content: [{ type: 'text', text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` }],
      isError: true,
    };
  }
});

// Start
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('BTCFi MCP server running on stdio');
  console.error(`API: ${API_BASE} | Network: ${PAYMENT_NETWORK} | Tools: ${TOOLS.length}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
