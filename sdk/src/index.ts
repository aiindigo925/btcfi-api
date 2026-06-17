// ============================================================
// @aiindigo/btcfi — Main SDK Entry Point
// ============================================================
//
// Usage:
//   import { BTCFi } from '@aiindigo/btcfi';
//   const client = new BTCFi({ apiKey: 'btcfi_xxx' });
//   const balance = await client.address.getBalance('1A1zP1...');

import type { BTCFiConfig } from './types.js';
import { HttpClient } from './http.js';
import { AddressModule } from './modules/address.js';
import { FeesModule } from './modules/fees.js';
import { MempoolModule } from './modules/mempool.js';
import { BlockModule } from './modules/block.js';
import { WhalesModule } from './modules/whales.js';
import { IntelligenceModule } from './modules/intelligence.js';
import { ZKModule } from './modules/zk.js';
import { BatchModule } from './modules/batch.js';
import { WebhooksModule } from './modules/webhooks.js';

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
export class BTCFi {
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

  constructor(config: BTCFiConfig = {}) {
    this._http = new HttpClient(config);

    this.address = new AddressModule(this._http);
    this.fees = new FeesModule(this._http);
    this.mempool = new MempoolModule(this._http);
    this.block = new BlockModule(this._http);
    this.whales = new WhalesModule(this._http);
    this.intelligence = new IntelligenceModule(this._http);
    this.zk = new ZKModule(this._http);
    this.batch = new BatchModule(this._http);
    this.webhooks = new WebhooksModule(this._http);
  }

  /** Check if auto-pay is configured */
  get canAutoPay(): boolean {
    return this._http.canAutoPay;
  }

  /** Get current rate limit usage */
  get rateLimitInfo() {
    return this._http.rateLimitInfo;
  }
}

// ── Re-export everything ──────────────────────────────────

// Types (all response types, config, etc.)
export type {
  BTCFiConfig,
  AddressInfoResponse,
  AddressBalance,
  UtxoResponse,
  UTXO,
  TxHistoryResponse,
  Transaction,
  FeesRecommendedResponse,
  FeesEstimateResponse,
  RecommendedFees,
  FeeEstimate,
  MempoolRecentResponse,
  MempoolInfo,
  RecentTx,
  BlockLatestResponse,
  BlockGetResponse,
  Block,
  WhalesListResponse,
  WhaleAlert,
  WhalesSignalsResponse,
  WhaleSignal,
  WhalesMVResponse,
  MVRVData,
  WhalesSOPRResponse,
  SOPRData,
  IntelligenceResponse,
  IntelligenceRiskResponse,
  RiskData,
  IntelligenceEntityResponse,
  EntityData,
  IntelligencePortfolioResponse,
  PortfolioData,
  ZKProof,
  ZKProofResult,
  ZKVerifyResult,
  BatchAddressesResponse,
  BatchAddressInfo,
  BatchRiskResponse,
  BatchRiskInfo,
  BatchEntitiesResponse,
  BatchEntityInfo,
  Webhook,
  WebhooksListResponse,
  WebhooksCreateResponse,
  WebhooksDeleteResponse,
  SSEEvent,
  WhaleEvent,
  MempoolEvent,
  SSECallback,
  PaymentRequirements,
  HealthResponse,
} from './types.js';

// Error classes
export {
  BTCFiError,
  PaymentRequiredError,
  RateLimitError,
  MaxRetriesError,
  TimeoutError,
  SSEError,
} from './errors.js';

// Individual modules (for tree-shaking or advanced use)
export { AddressModule } from './modules/address.js';
export { FeesModule } from './modules/fees.js';
export { MempoolModule } from './modules/mempool.js';
export { BlockModule } from './modules/block.js';
export { WhalesModule } from './modules/whales.js';
export { IntelligenceModule } from './modules/intelligence.js';
export { ZKModule } from './modules/zk.js';
export { BatchModule } from './modules/batch.js';
export { WebhooksModule } from './modules/webhooks.js';

// HTTP client (advanced)
export { HttpClient } from './http.js';
