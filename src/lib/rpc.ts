/**
 * Centralized RPC Configuration — Task 11.1
 *
 * Solana: Whistle Network (decentralized, community-operated, x402-native)
 * EVM chains: Configurable via environment variables
 *
 * Source: https://github.com/DylanPort/WHISTLE
 * No API keys needed. Self-sovereign infrastructure.
 */

// ============ SOLANA RPC ============

const SOLANA_RPC_PRIMARY = process.env.SOLANA_RPC_URL || 'https://rpc.whistle.ninja/rpc';
const SOLANA_RPC_FALLBACK = 'https://api.mainnet-beta.solana.com';

let activeSolanaRpc = SOLANA_RPC_PRIMARY;
let solanaFallbackUntil = 0;

/**
 * Get the active Solana RPC URL
 * Auto-failover: if Whistle is down, switch to fallback for 5 min
 */
export function getSolanaRpc(): string {
  if (Date.now() < solanaFallbackUntil) {
    return SOLANA_RPC_FALLBACK;
  }
  return activeSolanaRpc;
}

/**
 * Mark Solana primary RPC as failed — switch to fallback for 5 min
 */
export function markSolanaRpcFailed(): void {
  console.warn('[RPC] Whistle RPC failed, switching to fallback for 5 min');
  solanaFallbackUntil = Date.now() + 5 * 60 * 1000;
}

/**
 * Make a JSON-RPC call to Solana
 */
export async function solanaRpcCall(method: string, params: unknown[] = []): Promise<unknown> {
  const rpcUrl = getSolanaRpc();
  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    });

    if (!res.ok) {
      throw new Error(`Solana RPC ${res.status}`);
    }

    const data = await res.json();
    if (data.error) {
      throw new Error(data.error.message || 'RPC error');
    }
    return data.result;
  } catch (error) {
    // If primary failed, mark and retry with fallback
    if (rpcUrl === SOLANA_RPC_PRIMARY) {
      markSolanaRpcFailed();
      return solanaRpcCall(method, params); // retry once with fallback
    }
    throw error;
  }
}

// ============ EVM RPC ============

interface EvmRpcConfig {
  url: string;
  chainId: number;
  name: string;
}

const EVM_RPCS: Record<string, EvmRpcConfig> = {
  ethereum: {
    url: process.env.ETH_RPC_URL || 'https://eth.llamarpc.com',
    chainId: 1,
    name: 'Ethereum',
  },
  bnb: {
    url: process.env.BNB_RPC_URL || 'https://bsc-dataseed1.binance.org',
    chainId: 56,
    name: 'BNB Chain',
  },
  arbitrum: {
    url: process.env.ARB_RPC_URL || 'https://arb1.arbitrum.io/rpc',
    chainId: 42161,
    name: 'Arbitrum',
  },
  base: {
    url: process.env.BASE_RPC_URL || 'https://mainnet.base.org',
    chainId: 8453,
    name: 'Base',
  },
  avalanche: {
    url: process.env.AVAX_RPC_URL || 'https://api.avax.network/ext/bc/C/rpc',
    chainId: 43114,
    name: 'Avalanche',
  },
};

/**
 * Get EVM RPC URL for a chain
 */
export function getEvmRpc(chain: string): EvmRpcConfig {
  const config = EVM_RPCS[chain.toLowerCase()];
  if (!config) throw new Error(`Unknown chain: ${chain}`);
  return config;
}

/**
 * Make an eth_call to an EVM chain (read-only)
 */
export async function evmCall(
  chain: string,
  to: string,
  data: string
): Promise<string> {
  const rpc = getEvmRpc(chain);
  const res = await fetch(rpc.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'eth_call',
      params: [{ to, data }, 'latest'],
    }),
  });

  if (!res.ok) throw new Error(`${rpc.name} RPC ${res.status}`);
  const result = await res.json();
  if (result.error) throw new Error(result.error.message || `${rpc.name} RPC error`);
  return result.result;
}

/**
 * Read ERC-20 totalSupply from a contract
 */
export async function erc20TotalSupply(chain: string, contract: string): Promise<bigint> {
  // totalSupply() selector: 0x18160ddd
  const result = await evmCall(chain, contract, '0x18160ddd');
  return BigInt(result);
}

/**
 * Read ERC-20 balanceOf from a contract
 */
export async function erc20BalanceOf(chain: string, contract: string, address: string): Promise<bigint> {
  // balanceOf(address) selector: 0x70a08231 + address padded to 32 bytes
  const paddedAddr = address.toLowerCase().replace('0x', '').padStart(64, '0');
  const result = await evmCall(chain, contract, `0x70a08231${paddedAddr}`);
  return BigInt(result);
}

// ============ HEALTH CHECK ============

export interface RpcHealth {
  solana: { url: string; status: 'ok' | 'fallback' | 'down'; latencyMs?: number };
  evm: Record<string, { url: string; status: 'ok' | 'down'; latencyMs?: number }>;
}

/**
 * Check health of all configured RPCs
 */
export async function checkRpcHealth(): Promise<RpcHealth> {
  const health: RpcHealth = {
    solana: { url: getSolanaRpc(), status: 'ok' },
    evm: {},
  };

  // Solana health
  try {
    const start = Date.now();
    await solanaRpcCall('getSlot');
    health.solana.latencyMs = Date.now() - start;
    health.solana.status = getSolanaRpc() === SOLANA_RPC_PRIMARY ? 'ok' : 'fallback';
  } catch {
    health.solana.status = 'down';
  }

  // EVM health (check each chain)
  for (const [chain, config] of Object.entries(EVM_RPCS)) {
    try {
      const start = Date.now();
      const res = await fetch(config.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
      });
      health.evm[chain] = {
        url: config.url,
        status: res.ok ? 'ok' : 'down',
        latencyMs: Date.now() - start,
      };
    } catch {
      health.evm[chain] = { url: config.url, status: 'down' };
    }
  }

  return health;
}

/**
 * Get available chains list
 */
export function getAvailableChains(): string[] {
  return Object.keys(EVM_RPCS);
}
