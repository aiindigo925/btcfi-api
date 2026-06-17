// ============================================================
// @aiindigo/btcfi — TypeScript Types
// ============================================================

// ============ CONFIG ============

export interface BTCFiConfig {
  /** API key for authenticated requests */
  apiKey?: string;
  /** Base URL (default: https://btcfi.aiindigo.com) */
  baseUrl?: string;
  /** Payment network for x402: 'base' | 'solana' (default: 'base') */
  paymentNetwork?: 'base' | 'solana';
  /** EVM private key for auto-paying x402 on Base */
  evmPrivateKey?: string;
  /** Solana private key (base58) for auto-paying x402 via NLx402 */
  svmPrivateKey?: string;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Max retry attempts (default: 3) */
  retries?: number;
  /** Base delay for exponential backoff in ms (default: 500) */
  retryBaseDelay?: number;
  /** Rate limit: max requests per minute (default: 60) */
  rateLimit?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

// ============ ADDRESS ============

export interface AddressBalance {
  sats: number;
  btc: string;
  usd: string;
}

export interface AddressInfoResponse {
  success: boolean;
  address: string;
  balance: {
    confirmed: AddressBalance;
    pending: AddressBalance;
  };
  stats: {
    txCount: number;
    fundedTxos: number;
    spentTxos: number;
  };
}

export interface UTXO {
  txid: string;
  vout: number;
  value: number;
  valueBtc: string;
  confirmed: boolean;
  blockHeight?: number;
}

export interface UtxoResponse {
  success: boolean;
  address: string;
  summary: {
    total: number;
    confirmed: number;
    pending: number;
    totalSats: number;
    totalBtc: string;
    totalUsd: string;
  };
  utxos: UTXO[];
}

export interface Transaction {
  txid: string;
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

export interface TxHistoryResponse {
  success: boolean;
  address: string;
  transactions: Transaction[];
  pagination?: {
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
}

// ============ FEES ============

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

export interface FeesRecommendedResponse {
  success: boolean;
  fees: RecommendedFees;
  unit: string;
}

export interface FeesEstimateResponse {
  success: boolean;
  estimate: {
    typicalTxSize: number;
    fastest: FeeEstimate;
    medium: FeeEstimate;
    slow: FeeEstimate;
  };
  price: {
    btcUsd: number;
    btcEur: number;
  };
}

// ============ MEMPOOL ============

export interface MempoolInfo {
  count: number;
  vsize: number;
  totalFee: number;
  vsizeMB: string;
  totalFeeBTC: string;
}

export interface RecentTx {
  txid: string;
  size: number;
  fee: number;
  feeRate: string | null;
}

export interface MempoolRecentResponse {
  success: boolean;
  mempool: MempoolInfo;
  feeHistogram: [number, number][];
  recentTxs: RecentTx[];
}

// ============ BLOCK ============

export interface Block {
  id: string;
  height: number;
  timestamp: number;
  tx_count: number;
  size: number;
  weight?: number;
  difficulty?: string;
  nonce?: number;
  previous_block?: string;
}

export interface BlockLatestResponse {
  success: boolean;
  blocks: Block[];
}

export interface BlockGetResponse {
  success: boolean;
  block: Block;
}

// ============ WHALES ============

export interface WhaleAlert {
  txid: string;
  amount: number;
  amountBtc: string;
  from: string;
  to: string;
  timestamp: number;
  type?: string;
}

export interface WhalesListResponse {
  success: boolean;
  whales: WhaleAlert[];
  count: number;
}

export interface WhaleSignal {
  signal: string;
  strength: number;
  description: string;
  timestamp: number;
}

export interface WhalesSignalsResponse {
  success: boolean;
  signals: WhaleSignal[];
}

export interface MVRVData {
  mvrv: number;
  zscore: number;
  signal: string;
  timestamp: number;
}

export interface WhalesMVResponse {
  success: boolean;
  data: MVRVData;
}

export interface SOPRData {
  sopr: number;
  signal: string;
  description: string;
  timestamp: number;
}

export interface WhalesSOPRResponse {
  success: boolean;
  data: SOPRData;
}

// ============ INTELLIGENCE ============

export interface IntelligenceResponse {
  success: boolean;
  data: Record<string, unknown>;
}

export interface RiskData {
  address: string;
  overallScore: number;
  threatLevel: string;
  riskFactors: Array<{
    category: string;
    severity: string;
    detail: string;
  }>;
  summary: string;
  recommendations: string[];
}

export interface IntelligenceRiskResponse {
  success: boolean;
  data: RiskData;
}

export interface EntityData {
  address: string;
  entity?: string;
  labels: string[];
  confidence: number;
  category: string;
  knownBy: string[];
}

export interface IntelligenceEntityResponse {
  success: boolean;
  data: EntityData;
}

export interface PortfolioData {
  addresses: string[];
  totalBalance: {
    sats: number;
    btc: string;
    usd: string;
  };
  holdings: Array<{
    address: string;
    balance: AddressBalance;
    riskScore?: number;
  }>;
}

export interface IntelligencePortfolioResponse {
  success: boolean;
  data: PortfolioData;
}

// ============ ZK PROOFS ============

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
  _meta: {
    description: string;
    verify: string;
    source: string;
    timestamp: string;
  };
}

export interface ZKVerifyResult {
  success: boolean;
  verified: boolean;
  proofType: string;
  checks: string[];
  _meta: {
    description: string;
    source: string;
    timestamp: string;
  };
}

// ============ BATCH ============

export interface BatchAddressInfo {
  address: string;
  balance?: AddressBalance;
  stats?: { txCount: number; fundedTxos: number; spentTxos: number };
  error?: string;
}

export interface BatchAddressesResponse {
  success: boolean;
  results: BatchAddressInfo[];
}

export interface BatchRiskInfo {
  address: string;
  riskScore?: number;
  threatLevel?: string;
  error?: string;
}

export interface BatchRiskResponse {
  success: boolean;
  results: BatchRiskInfo[];
}

export interface BatchEntityInfo {
  address: string;
  entity?: string;
  labels?: string[];
  error?: string;
}

export interface BatchEntitiesResponse {
  success: boolean;
  results: BatchEntityInfo[];
}

// ============ WEBHOOKS ============

export interface Webhook {
  id: string;
  url: string;
  triggers: string[];
  active: boolean;
  createdAt: string;
  updatedAt?: string;
  lastTriggered?: string;
  failureCount?: number;
}

export interface WebhooksListResponse {
  success: boolean;
  webhooks: Webhook[];
}

export interface WebhooksCreateResponse {
  success: boolean;
  webhook: Webhook;
}

export interface WebhooksDeleteResponse {
  success: boolean;
  deleted: string;
}

// ============ SSE EVENTS ============

export interface SSEEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface WhaleEvent extends SSEEvent {
  type: 'whale_transaction';
  data: {
    txid: string;
    amount: number;
    amountBtc: string;
    from: string;
    to: string;
  };
}

export interface MempoolEvent extends SSEEvent {
  type: 'mempool_update';
  data: {
    count: number;
    vsize: number;
  };
}

export type SSECallback<T = SSEEvent> = (event: T) => void;

// ============ HEALTH ============

export interface HealthResponse {
  status: string;
  uptime: number;
  version: string;
  checks: Record<string, { status: string; latencyMs?: number }>;
}

// ============ ERRORS ============

export interface PaymentRequirements {
  maxAmountRequired: string;
  payTo: string;
  asset: string;
  network: string;
  [key: string]: unknown;
}
