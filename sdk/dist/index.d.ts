interface BTCFiConfig {
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
interface AddressBalance {
    sats: number;
    btc: string;
    usd: string;
}
interface AddressInfoResponse {
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
interface UTXO {
    txid: string;
    vout: number;
    value: number;
    valueBtc: string;
    confirmed: boolean;
    blockHeight?: number;
}
interface UtxoResponse {
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
interface Transaction {
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
interface TxHistoryResponse {
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
interface RecommendedFees {
    fastestFee: number;
    halfHourFee: number;
    hourFee: number;
    economyFee: number;
    minimumFee: number;
}
interface FeeEstimate {
    satPerByte: number;
    totalSats: number;
    usd: string;
}
interface FeesRecommendedResponse {
    success: boolean;
    fees: RecommendedFees;
    unit: string;
}
interface FeesEstimateResponse {
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
interface MempoolInfo {
    count: number;
    vsize: number;
    totalFee: number;
    vsizeMB: string;
    totalFeeBTC: string;
}
interface RecentTx {
    txid: string;
    size: number;
    fee: number;
    feeRate: string | null;
}
interface MempoolRecentResponse {
    success: boolean;
    mempool: MempoolInfo;
    feeHistogram: [number, number][];
    recentTxs: RecentTx[];
}
interface Block {
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
interface BlockLatestResponse {
    success: boolean;
    blocks: Block[];
}
interface BlockGetResponse {
    success: boolean;
    block: Block;
}
interface WhaleAlert {
    txid: string;
    amount: number;
    amountBtc: string;
    from: string;
    to: string;
    timestamp: number;
    type?: string;
}
interface WhalesListResponse {
    success: boolean;
    whales: WhaleAlert[];
    count: number;
}
interface WhaleSignal {
    signal: string;
    strength: number;
    description: string;
    timestamp: number;
}
interface WhalesSignalsResponse {
    success: boolean;
    signals: WhaleSignal[];
}
interface MVRVData {
    mvrv: number;
    zscore: number;
    signal: string;
    timestamp: number;
}
interface WhalesMVResponse {
    success: boolean;
    data: MVRVData;
}
interface SOPRData {
    sopr: number;
    signal: string;
    description: string;
    timestamp: number;
}
interface WhalesSOPRResponse {
    success: boolean;
    data: SOPRData;
}
interface IntelligenceResponse {
    success: boolean;
    data: Record<string, unknown>;
}
interface RiskData {
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
interface IntelligenceRiskResponse {
    success: boolean;
    data: RiskData;
}
interface EntityData {
    address: string;
    entity?: string;
    labels: string[];
    confidence: number;
    category: string;
    knownBy: string[];
}
interface IntelligenceEntityResponse {
    success: boolean;
    data: EntityData;
}
interface PortfolioData {
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
interface IntelligencePortfolioResponse {
    success: boolean;
    data: PortfolioData;
}
interface ZKProof {
    pi_a: string[];
    pi_b: string[][];
    pi_c: string[];
    protocol: string;
    curve: string;
}
interface ZKProofResult {
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
interface ZKVerifyResult {
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
interface BatchAddressInfo {
    address: string;
    balance?: AddressBalance;
    stats?: {
        txCount: number;
        fundedTxos: number;
        spentTxos: number;
    };
    error?: string;
}
interface BatchAddressesResponse {
    success: boolean;
    results: BatchAddressInfo[];
}
interface BatchRiskInfo {
    address: string;
    riskScore?: number;
    threatLevel?: string;
    error?: string;
}
interface BatchRiskResponse {
    success: boolean;
    results: BatchRiskInfo[];
}
interface BatchEntityInfo {
    address: string;
    entity?: string;
    labels?: string[];
    error?: string;
}
interface BatchEntitiesResponse {
    success: boolean;
    results: BatchEntityInfo[];
}
interface Webhook {
    id: string;
    url: string;
    triggers: string[];
    active: boolean;
    createdAt: string;
    updatedAt?: string;
    lastTriggered?: string;
    failureCount?: number;
}
interface WebhooksListResponse {
    success: boolean;
    webhooks: Webhook[];
}
interface WebhooksCreateResponse {
    success: boolean;
    webhook: Webhook;
}
interface WebhooksDeleteResponse {
    success: boolean;
    deleted: string;
}
interface SSEEvent {
    type: string;
    data: Record<string, unknown>;
    timestamp: number;
}
interface WhaleEvent extends SSEEvent {
    type: 'whale_transaction';
    data: {
        txid: string;
        amount: number;
        amountBtc: string;
        from: string;
        to: string;
    };
}
interface MempoolEvent extends SSEEvent {
    type: 'mempool_update';
    data: {
        count: number;
        vsize: number;
    };
}
type SSECallback<T = SSEEvent> = (event: T) => void;
interface HealthResponse {
    status: string;
    uptime: number;
    version: string;
    checks: Record<string, {
        status: string;
        latencyMs?: number;
    }>;
}
interface PaymentRequirements {
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    network: string;
    [key: string]: unknown;
}

/**
 * Internal HTTP client with:
 * - Automatic retry with exponential backoff
 * - Client-side rate limiting
 * - x402 payment auto-handling
 * - API key authentication
 */
declare class HttpClient {
    private baseUrl;
    private apiKey?;
    private paymentNetwork;
    private evmPrivateKey?;
    private svmPrivateKey?;
    private timeout;
    private maxRetries;
    private retryBaseDelay;
    private rateLimit;
    private rateLimitWindow;
    private requestTimestamps;
    private defaultHeaders;
    constructor(config?: BTCFiConfig);
    /** Whether auto-pay keys are configured */
    get canAutoPay(): boolean;
    /** Get current rate limit usage */
    get rateLimitInfo(): {
        used: number;
        limit: number;
        resetInMs: number;
    };
    private pruneTimestamps;
    private enforceRateLimit;
    private sleep;
    private getBackoffDelay;
    /**
     * Build an x402 payment header from payment requirements.
     * Returns null if auto-pay is not configured.
     */
    private buildPaymentHeader;
    request<T>(path: string, options?: RequestInit & {
        _isRetry?: boolean;
    }): Promise<T>;
}

/**
 * Address-related API methods.
 *
 * @example
 * ```ts
 * const info = await client.address.getBalance('1A1zP1...');
 * const utxos = await client.address.getUtxos('1A1zP1...');
 * const history = await client.address.getTxHistory('1A1zP1...');
 * ```
 */
declare class AddressModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Get balance and stats for a Bitcoin address.
     */
    getBalance(address: string): Promise<AddressInfoResponse>;
    /**
     * Get UTXOs for a Bitcoin address.
     */
    getUtxos(address: string): Promise<UtxoResponse>;
    /**
     * Get transaction history for a Bitcoin address.
     */
    getTxHistory(address: string): Promise<TxHistoryResponse>;
}

/**
 * Fee estimation methods.
 */
declare class FeesModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Get recommended fee rates from the Bitcoin mempool.
     */
    recommended(): Promise<FeesRecommendedResponse>;
    /**
     * Get a detailed fee estimate with USD costs for a typical transaction.
     */
    estimate(): Promise<FeesEstimateResponse>;
}

/**
 * Mempool monitoring methods.
 */
declare class MempoolModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Get recent mempool state including pending transaction count,
     * fee histogram, and recent transactions.
     */
    recent(): Promise<MempoolRecentResponse>;
}

/**
 * Block query methods.
 */
declare class BlockModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Get the latest blocks from the Bitcoin blockchain.
     */
    latest(): Promise<BlockLatestResponse>;
    /**
     * Get a specific block by hash or height.
     */
    get(id: string | number): Promise<BlockGetResponse>;
}

/**
 * Whale tracking and on-chain signals.
 */
declare class WhalesModule {
    private http;
    private baseUrl;
    constructor(http: HttpClient);
    /**
     * List recent whale transactions (large BTC movements).
     * @param minBtc - Minimum BTC amount filter (default: 100)
     */
    list(minBtc?: number): Promise<WhalesListResponse>;
    /**
     * Get current whale market signals (accumulation, distribution, etc.).
     */
    signals(): Promise<WhalesSignalsResponse>;
    /**
     * Get MVRV (Market Value to Realized Value) ratio.
     */
    mvrv(): Promise<WhalesMVResponse>;
    /**
     * Get SOPR (Spent Output Profit Ratio).
     */
    sopr(): Promise<WhalesSOPRResponse>;
    /**
     * Subscribe to real-time whale events via Server-Sent Events (SSE).
     * @returns Unsubscribe function to close the connection
     */
    subscribe(callback: SSECallback<WhaleEvent>): () => void;
}

/**
 * Bitcoin intelligence and analysis methods.
 */
declare class IntelligenceModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Get risk analysis for a Bitcoin address.
     */
    risk(address: string): Promise<IntelligenceRiskResponse>;
    /**
     * Identify the entity/label associated with a Bitcoin address.
     */
    entity(address: string): Promise<IntelligenceEntityResponse>;
    /**
     * Get portfolio analysis across multiple Bitcoin addresses.
     */
    portfolio(addresses: string[]): Promise<IntelligencePortfolioResponse>;
}

/**
 * Zero-knowledge proof generation and verification.
 */
declare class ZKModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Generate a ZK proof that an address holds at least a certain balance.
     * @param address - Bitcoin address
     * @param amount - Minimum balance threshold (in satoshis)
     */
    proofBalance(address: string, amount: number): Promise<ZKProofResult>;
    /**
     * Generate a ZK proof that an address has been active for at least N days.
     * @param address - Bitcoin address
     * @param days - Minimum age in days
     */
    proofAge(address: string, days: number): Promise<ZKProofResult>;
    /**
     * Verify a ZK proof.
     */
    verifyProof(proofType: string, proof: Record<string, unknown>, publicInputs: string[]): Promise<ZKVerifyResult>;
}

/**
 * Batch operations for multiple addresses at once.
 */
declare class BatchModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Get balance and stats for multiple addresses in one request.
     * @param addresses - Array of Bitcoin addresses (max 20)
     */
    addresses(addresses: string[]): Promise<BatchAddressesResponse>;
    /**
     * Get risk analysis for multiple addresses in one request.
     * @param addresses - Array of Bitcoin addresses (max 20)
     */
    risk(addresses: string[]): Promise<BatchRiskResponse>;
    /**
     * Identify entities for multiple addresses in one request.
     * @param addresses - Array of Bitcoin addresses (max 20)
     */
    entities(addresses: string[]): Promise<BatchEntitiesResponse>;
    private validateBatch;
}

/**
 * Webhook management for receiving real-time event notifications.
 */
declare class WebhooksModule {
    private http;
    constructor(http: HttpClient);
    /**
     * Create a new webhook to receive event notifications.
     * @param url - HTTPS URL to receive webhook POST requests
     * @param triggers - Event types to subscribe to
     */
    create(url: string, triggers: string[]): Promise<WebhooksCreateResponse>;
    /**
     * List all configured webhooks.
     */
    list(): Promise<WebhooksListResponse>;
    /**
     * Delete a webhook by ID.
     */
    delete(id: string): Promise<WebhooksDeleteResponse>;
}

/**
 * Base error class for BTCFi SDK errors.
 */
declare class BTCFiError extends Error {
    statusCode?: number;
    retryable: boolean;
    constructor(message: string, statusCode?: number, retryable?: boolean);
}
/**
 * Thrown when the API returns 402 Payment Required (x402 micropayment needed).
 */
declare class PaymentRequiredError extends BTCFiError {
    paymentRequirements: PaymentRequirements;
    constructor(data: PaymentRequirements);
}
/**
 * Thrown when the SDK's built-in rate limiter blocks a request.
 */
declare class RateLimitError extends BTCFiError {
    retryAfterMs: number;
    constructor(retryAfterMs: number);
}
/**
 * Thrown after all retry attempts are exhausted.
 */
declare class MaxRetriesError extends BTCFiError {
    attempts: number;
    lastError?: Error;
    constructor(attempts: number, lastError?: Error);
}
/**
 * Thrown when the request times out.
 */
declare class TimeoutError extends BTCFiError {
    constructor(timeoutMs: number);
}
/**
 * Thrown when an SSE connection encounters an error.
 */
declare class SSEError extends BTCFiError {
    constructor(message: string);
}

/**
 * BTCFi SDK — Unified client for the BTCFi API.
 *
 * Features:
 * - Automatic retry with exponential backoff (3 attempts)
 * - Client-side rate limiting (respects tier quotas)
 * - x402 payment auto-handling (intercept 402, pay, retry)
 * - Full TypeScript types for all responses
 * - SSE subscription support for real-time events
 *
 * @example
 * ```ts
 * import { BTCFi } from '@aiindigo/btcfi';
 *
 * // With API key
 * const client = new BTCFi({ apiKey: 'btcfi_xxx' });
 *
 * // With auto-payment enabled
 * const client = new BTCFi({
 *   apiKey: 'btcfi_xxx',
 *   evmPrivateKey: process.env.EVM_PRIVATE_KEY,  // Base USDC
 * });
 *
 * // Query address balance
 * const info = await client.address.getBalance('1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa');
 * console.log(info.balance.confirmed.btc); // "50.00000000"
 *
 * // Estimate fees
 * const fees = await client.fees.recommended();
 *
 * // Track whales
 * const whales = await client.whales.list(100);
 *
 * // Subscribe to real-time events
 * const unsub = client.whales.subscribe(event => {
 *   console.log(`🐋 ${event.data.amountBtc} BTC moved`);
 * });
 * ```
 */
declare class BTCFi {
    /** Address queries (balance, UTXOs, transaction history) */
    readonly address: AddressModule;
    /** Fee estimation and recommendations */
    readonly fees: FeesModule;
    /** Mempool monitoring */
    readonly mempool: MempoolModule;
    /** Block queries */
    readonly block: BlockModule;
    /** Whale tracking and on-chain signals */
    readonly whales: WhalesModule;
    /** Intelligence and analysis (risk, entity, portfolio) */
    readonly intelligence: IntelligenceModule;
    /** Zero-knowledge proof generation and verification */
    readonly zk: ZKModule;
    /** Batch operations for multiple addresses */
    readonly batch: BatchModule;
    /** Webhook management */
    readonly webhooks: WebhooksModule;
    /** The internal HTTP client (for advanced use) */
    readonly _http: HttpClient;
    constructor(config?: BTCFiConfig);
    /** Check if auto-pay is configured */
    get canAutoPay(): boolean;
    /** Get current rate limit usage */
    get rateLimitInfo(): {
        used: number;
        limit: number;
        resetInMs: number;
    };
}

export { type AddressBalance, type AddressInfoResponse, AddressModule, BTCFi, type BTCFiConfig, BTCFiError, type BatchAddressInfo, type BatchAddressesResponse, type BatchEntitiesResponse, type BatchEntityInfo, BatchModule, type BatchRiskInfo, type BatchRiskResponse, type Block, type BlockGetResponse, type BlockLatestResponse, BlockModule, type EntityData, type FeeEstimate, type FeesEstimateResponse, FeesModule, type FeesRecommendedResponse, type HealthResponse, HttpClient, type IntelligenceEntityResponse, IntelligenceModule, type IntelligencePortfolioResponse, type IntelligenceResponse, type IntelligenceRiskResponse, type MVRVData, MaxRetriesError, type MempoolEvent, type MempoolInfo, MempoolModule, type MempoolRecentResponse, PaymentRequiredError, type PaymentRequirements, type PortfolioData, RateLimitError, type RecentTx, type RecommendedFees, type RiskData, type SOPRData, type SSECallback, SSEError, type SSEEvent, TimeoutError, type Transaction, type TxHistoryResponse, type UTXO, type UtxoResponse, type Webhook, type WebhooksCreateResponse, type WebhooksDeleteResponse, type WebhooksListResponse, WebhooksModule, type WhaleAlert, type WhaleEvent, type WhaleSignal, type WhalesListResponse, type WhalesMVResponse, WhalesModule, type WhalesSOPRResponse, type WhalesSignalsResponse, ZKModule, type ZKProof, type ZKProofResult, type ZKVerifyResult };
