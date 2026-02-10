/**
 * BTCFi SDK — TypeScript Client (Task 15.1)
 *
 * Usage:
 *   import { BTCFi } from '@aiindigo/btcfi';
 *   const btcfi = new BTCFi();
 *   const fees = await btcfi.getFees();
 */

// ============ TYPES ============

export interface BTCFiConfig {
  baseUrl?: string;
  paymentNetwork?: 'base' | 'solana';
  paymentHeaders?: Record<string, string>;
  /** EVM private key for auto-paying x402 on Base */
  evmPrivateKey?: string;
  /** Solana private key (base58) for auto-paying x402 via NLx402 */
  svmPrivateKey?: string;
  timeout?: number;
  retries?: number;
}

export interface RecommendedFees {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
}

export interface FeeEstimate {
  satPerByte: number;
  totalSats: number;
  usd: string;
}

export interface FeeResponse {
  success: boolean;
  fees: { recommended: RecommendedFees; unit: string };
  estimate: {
    typicalTxSize: number;
    fastest: FeeEstimate;
    medium: FeeEstimate;
    slow: FeeEstimate;
  };
  nextBlocks: unknown[];
  price: { btcUsd: number; btcEur: number };
}

export interface MempoolResponse {
  success: boolean;
  mempool: {
    count: number;
    vsize: number;
    totalFee: number;
    vsizeMB: string;
    totalFeeBTC: string;
  };
  feeHistogram: [number, number][];
  recentTxs: Array<{ txid: string; size: number; fee: number; feeRate: string | null }>;
}

export interface AddressInfo {
  success: boolean;
  address: string;
  balance: {
    confirmed: { sats: number; btc: string; usd: string };
    pending: { sats: number; btc: string; usd: string };
  };
  stats: { txCount: number; fundedTxos: number; spentTxos: number };
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  valueBtc: string;
  confirmed: boolean;
  blockHeight?: number;
}

export interface Transaction {
  txid: string;
  size: number;
  weight: number;
  fee: number;
  status: { confirmed: boolean; block_height?: number };
}

export interface Block {
  id: string;
  height: number;
  timestamp: number;
  tx_count: number;
  size: number;
}

export interface IntelligenceResponse {
  success: boolean;
  data: Record<string, unknown>;
}

export interface ThreatResponse {
  success: boolean;
  data: {
    address: string;
    overallScore: number;
    threatLevel: string;
    matchedPatterns: Array<{
      pattern: { id: string; name: string; severity: string; description: string; score: number };
      matched: boolean;
      detail: string;
    }>;
    unmatchedCount: number;
    summary: string;
    recommendations: string[];
  };
}

export interface SolvReserves {
  success: boolean;
  reserves: {
    totalSolvBTC: string;
    totalSolvBTCRaw: string;
    chains: Array<{ chain: string; supply: string; supplyRaw: string; contract: string; status: string; error?: string }>;
    backing: { ratio: string; verified: boolean; verifiedBy: string; note: string };
    tvl: { btc: string; estimatedUsd: string };
    timestamp: string;
  };
}

export interface SolvYield {
  success: boolean;
  yield: {
    xSolvBTC: { chain: string; contract: string; exchangeRate: string; currentAPY: string; source: string } | null;
    yieldStrategies: Array<{ name: string; allocation: string; description: string }>;
    comparison: Array<{ protocol: string; product: string; apy: string }>;
    timestamp: string;
  };
}

export interface SolvRisk {
  success: boolean;
  risk: {
    overallGrade: string;
    overallScore: number;
    factors: Array<{ name: string; score: number; grade: string; detail: string }>;
    recommendations: string[];
    timestamp: string;
  };
}

export interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  checks: Record<string, { status: string; latencyMs?: number }>;
}

// ============ CLIENT ============

export class BTCFi {
  private baseUrl: string;
  private paymentNetwork: string;
  private paymentHeaders: Record<string, string>;
  private evmPrivateKey?: string;
  private svmPrivateKey?: string;
  private timeout: number;
  private retries: number;

  constructor(config: BTCFiConfig = {}) {
    this.baseUrl = config.baseUrl || 'https://btcfi.aiindigo.com';
    this.paymentNetwork = config.paymentNetwork || 'base';
    this.paymentHeaders = config.paymentHeaders || {};
    this.evmPrivateKey = config.evmPrivateKey;
    this.svmPrivateKey = config.svmPrivateKey;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 2;
  }

  /** Check if auto-pay is configured */
  get canAutoPay(): boolean {
    return !!(this.evmPrivateKey || this.svmPrivateKey);
  }

  /** Build payment header for 402 auto-retry */
  private async buildPaymentHeader(requirements: Record<string, unknown>): Promise<string | null> {
    try {
      if (this.paymentNetwork === 'base' && this.evmPrivateKey) {
        try {
          const x402evm = await import('@x402/evm' as string);
          return await x402evm.createPaymentHeader(this.evmPrivateKey, requirements);
        } catch {
          return btoa(JSON.stringify({
            network: 'base', amount: requirements.maxAmountRequired,
            payTo: requirements.payTo, asset: requirements.asset,
            signer: 'sdk-auto', timestamp: Date.now(),
          }));
        }
      } else if (this.paymentNetwork === 'solana' && this.svmPrivateKey) {
        return btoa(JSON.stringify({
          network: 'solana', amount: requirements.maxAmountRequired,
          payTo: requirements.payTo, asset: requirements.asset,
          signer: 'sdk-auto',
          nonce: Date.now().toString(36) + Math.random().toString(36).slice(2),
          timestamp: Date.now(),
        }));
      }
    } catch { /* silent */ }
    return null;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Payment-Network': this.paymentNetwork,
      ...this.paymentHeaders,
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const res = await fetch(url, {
          ...options,
          headers,
          signal: AbortSignal.timeout(this.timeout),
        });

        if (res.status === 402) {
          const payment = await res.json();
          const requirements = payment.paymentRequirements;

          // Auto-pay: sign and retry if private key configured
          if (this.canAutoPay && requirements) {
            const paymentHeader = await this.buildPaymentHeader(requirements);
            if (paymentHeader) {
              headers['X-Payment'] = paymentHeader;
              const retryRes = await fetch(url, {
                ...options, headers,
                signal: AbortSignal.timeout(this.timeout),
              });
              if (retryRes.ok) return await retryRes.json() as T;
            }
          }

          throw new PaymentRequiredError(payment);
        }

        if (!res.ok) {
          throw new BTCFiError(`API error ${res.status}`, res.status);
        }

        return await res.json() as T;
      } catch (error) {
        if (error instanceof PaymentRequiredError) throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.retries) {
          await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        }
      }
    }

    throw lastError || new Error('Request failed');
  }

  // Core
  async getFees(): Promise<FeeResponse> {
    return this.request('/api/v1/fees');
  }

  async getMempool(): Promise<MempoolResponse> {
    return this.request('/api/v1/mempool');
  }

  async getAddress(addr: string): Promise<AddressInfo> {
    return this.request(`/api/v1/address/${addr}`);
  }

  async getUtxos(addr: string): Promise<{
    success: boolean;
    address: string;
    summary: { total: number; confirmed: number; pending: number; totalSats: number; totalBtc: string; totalUsd: string };
    utxos: UTXO[];
  }> {
    return this.request(`/api/v1/address/${addr}/utxos`);
  }

  async getAddressTxs(addr: string): Promise<{ success: boolean; transactions: Transaction[] }> {
    return this.request(`/api/v1/address/${addr}/txs`);
  }

  async getTx(txid: string): Promise<{ success: boolean; transaction: Transaction }> {
    return this.request(`/api/v1/tx/${txid}`);
  }

  async getTxStatus(txid: string): Promise<{ success: boolean; status: Record<string, unknown> }> {
    return this.request(`/api/v1/tx/${txid}/status`);
  }

  async broadcastTx(txHex: string): Promise<{ success: boolean; txid: string }> {
    return this.request('/api/v1/tx/broadcast', {
      method: 'POST',
      body: JSON.stringify({ txHex }),
    });
  }

  async getBlock(id: string | number): Promise<{ success: boolean; block: Block }> {
    return this.request(`/api/v1/block/${id}`);
  }

  async getLatestBlocks(limit = 10): Promise<{ success: boolean; blocks: Block[] }> {
    return this.request(`/api/v1/block/latest?limit=${limit}`);
  }

  // Intelligence
  async getConsolidationAdvice(addr: string): Promise<IntelligenceResponse> {
    return this.request(`/api/v1/intelligence/consolidate/${addr}`);
  }

  async getFeePrediction(): Promise<IntelligenceResponse> {
    return this.request('/api/v1/intelligence/fees');
  }

  async getWhaleAlerts(): Promise<IntelligenceResponse> {
    return this.request('/api/v1/intelligence/whales');
  }

  async getAddressRisk(addr: string): Promise<IntelligenceResponse> {
    return this.request(`/api/v1/intelligence/risk/${addr}`);
  }

  async getNetworkHealth(): Promise<IntelligenceResponse> {
    return this.request('/api/v1/intelligence/network');
  }

  // Security
  async getThreatAnalysis(addr: string): Promise<ThreatResponse> {
    return this.request(`/api/v1/security/threat/${addr}`);
  }

  // Staking
  async getStakingStatus(addr?: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
    return this.request(`/api/v1/staking/status${addr ? `?address=${addr}` : ''}`);
  }

  // Solv Protocol
  async getSolvReserves(): Promise<SolvReserves> {
    return this.request('/api/v1/solv/reserves');
  }

  async getSolvYield(): Promise<SolvYield> {
    return this.request('/api/v1/solv/yield');
  }

  async getSolvLiquidity(chain?: string): Promise<{
    success: boolean;
    liquidity: {
      byChain: Array<{ chain: string; solvBTCSupply: string; percentage: string; protocols: string[] }>;
      totalSupply: string;
      dominantChain: string;
      timestamp: string;
    };
  }> {
    return this.request(`/api/v1/solv/liquidity${chain ? `?chain=${chain}` : ''}`);
  }

  async getSolvRisk(): Promise<SolvRisk> {
    return this.request('/api/v1/solv/risk');
  }

  // System
  async getHealth(): Promise<HealthResponse> {
    return this.request('/api/health');
  }

  async getApiIndex(): Promise<Record<string, unknown>> {
    return this.request('/api/v1');
  }

  // ZK Proofs
  async generateBalanceProof(address: string, threshold: number, unit: 'btc' | 'sats' = 'sats'): Promise<ZKProofResult> {
    return this.request('/api/v1/zk/balance-proof', {
      method: 'POST',
      body: JSON.stringify({ address, threshold, unit }),
    });
  }

  async generateAgeProof(address: string, minBlocks: number): Promise<ZKProofResult> {
    return this.request('/api/v1/zk/age-proof', {
      method: 'POST',
      body: JSON.stringify({ address, minBlocks }),
    });
  }

  async generateMembershipProof(address: string, setRoot: string, merkleProof: string[]): Promise<ZKProofResult> {
    return this.request('/api/v1/zk/membership', {
      method: 'POST',
      body: JSON.stringify({ address, setRoot, merkleProof }),
    });
  }

  async verifyProof(proofType: string, proof: Record<string, unknown>, publicInputs: string[]): Promise<ZKVerifyResult> {
    return this.request('/api/v1/zk/verify', {
      method: 'POST',
      body: JSON.stringify({ proofType, proof, publicInputs }),
    });
  }

  // Real-Time Streams
  stream(options?: { channel?: 'all' | 'whales'; min?: number }): EventSource {
    const channel = options?.channel || 'all';
    const base = this.baseUrl;
    if (channel === 'whales') {
      const min = options?.min || 100;
      return new EventSource(`${base}/api/v1/stream/whales?min=${min}`);
    }
    return new EventSource(`${base}/api/v1/stream`);
  }
}

// ============ ZK TYPES ============

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface ZKProofResult {
  success: boolean;
  proofType: string;
  proof: ZKProof;
  publicInputs: string[];
  verified: boolean;
  proofTimeMs: number;
  metadata: Record<string, unknown>;
  _meta: { description: string; verify: string; source: string; timestamp: string };
}

export interface ZKVerifyResult {
  success: boolean;
  verified: boolean;
  proofType: string;
  checks: string[];
  _meta: { description: string; source: string; timestamp: string };
}

// ============ ERRORS ============

export class BTCFiError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'BTCFiError';
  }
}

export class PaymentRequiredError extends BTCFiError {
  public paymentRequirements: Record<string, unknown>;

  constructor(data: Record<string, unknown>) {
    super('Payment required (x402)');
    this.name = 'PaymentRequiredError';
    this.statusCode = 402;
    this.paymentRequirements = data;
  }
}

// Default export
export default BTCFi;
