// src/errors.ts
var BTCFiError = class extends Error {
  statusCode;
  retryable;
  constructor(message, statusCode, retryable = false) {
    super(message);
    this.name = "BTCFiError";
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
};
var PaymentRequiredError = class extends BTCFiError {
  paymentRequirements;
  constructor(data) {
    super("Payment required (x402)");
    this.name = "PaymentRequiredError";
    this.statusCode = 402;
    this.retryable = false;
    this.paymentRequirements = data;
  }
};
var RateLimitError = class extends BTCFiError {
  retryAfterMs;
  constructor(retryAfterMs) {
    super(`Rate limited \u2014 retry after ${retryAfterMs}ms`);
    this.name = "RateLimitError";
    this.retryable = true;
    this.retryAfterMs = retryAfterMs;
  }
};
var MaxRetriesError = class extends BTCFiError {
  attempts;
  lastError;
  constructor(attempts, lastError) {
    super(`All ${attempts} retry attempts exhausted`);
    this.name = "MaxRetriesError";
    this.retryable = false;
    this.attempts = attempts;
    this.lastError = lastError;
  }
};
var TimeoutError = class extends BTCFiError {
  constructor(timeoutMs) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.retryable = true;
  }
};
var SSEError = class extends BTCFiError {
  constructor(message) {
    super(message);
    this.name = "SSEError";
    this.retryable = false;
  }
};

// src/http.ts
var HttpClient = class {
  baseUrl;
  apiKey;
  paymentNetwork;
  evmPrivateKey;
  svmPrivateKey;
  timeout;
  maxRetries;
  retryBaseDelay;
  rateLimit;
  rateLimitWindow;
  requestTimestamps = [];
  defaultHeaders;
  constructor(config = {}) {
    this.baseUrl = (config.baseUrl || "https://btcfi.aiindigo.com").replace(/\/$/, "");
    this.apiKey = config.apiKey;
    this.paymentNetwork = config.paymentNetwork || "base";
    this.evmPrivateKey = config.evmPrivateKey;
    this.svmPrivateKey = config.svmPrivateKey;
    this.timeout = config.timeout || 3e4;
    this.maxRetries = config.retries ?? 3;
    this.retryBaseDelay = config.retryBaseDelay || 500;
    this.rateLimit = config.rateLimit || 60;
    this.rateLimitWindow = 6e4;
    this.defaultHeaders = config.headers || {};
  }
  /** Whether auto-pay keys are configured */
  get canAutoPay() {
    return !!(this.evmPrivateKey || this.svmPrivateKey);
  }
  /** Get current rate limit usage */
  get rateLimitInfo() {
    this.pruneTimestamps();
    const oldest = this.requestTimestamps[0];
    const resetInMs = oldest ? oldest + this.rateLimitWindow - Date.now() : 0;
    return {
      used: this.requestTimestamps.length,
      limit: this.rateLimit,
      resetInMs: Math.max(0, resetInMs)
    };
  }
  // ── Rate Limiting ──────────────────────────────────────
  pruneTimestamps() {
    const cutoff = Date.now() - this.rateLimitWindow;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > cutoff);
  }
  async enforceRateLimit() {
    this.pruneTimestamps();
    if (this.requestTimestamps.length >= this.rateLimit) {
      const oldest = this.requestTimestamps[0];
      const waitMs = oldest + this.rateLimitWindow - Date.now();
      if (waitMs > 0) {
        throw new RateLimitError(waitMs);
      }
      this.pruneTimestamps();
    }
    this.requestTimestamps.push(Date.now());
  }
  // ── Exponential Backoff ─────────────────────────────────
  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  getBackoffDelay(attempt) {
    const delay = this.retryBaseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 100;
    return Math.min(delay + jitter, 3e4);
  }
  // ── x402 Payment ───────────────────────────────────────
  /**
   * Build an x402 payment header from payment requirements.
   * Returns null if auto-pay is not configured.
   */
  async buildPaymentHeader(requirements) {
    try {
      if (this.paymentNetwork === "base" && this.evmPrivateKey) {
        try {
          const x402evm = await import("@x402/evm");
          return await x402evm.createPaymentHeader(this.evmPrivateKey, requirements);
        } catch {
          return btoa(
            JSON.stringify({
              network: "base",
              amount: requirements.maxAmountRequired,
              payTo: requirements.payTo,
              asset: requirements.asset,
              signer: "sdk-auto",
              timestamp: Date.now()
            })
          );
        }
      } else if (this.paymentNetwork === "solana" && this.svmPrivateKey) {
        return btoa(
          JSON.stringify({
            network: "solana",
            amount: requirements.maxAmountRequired,
            payTo: requirements.payTo,
            asset: requirements.asset,
            signer: "sdk-auto",
            nonce: Date.now().toString(36) + Math.random().toString(36).slice(2),
            timestamp: Date.now()
          })
        );
      }
    } catch {
    }
    return null;
  }
  // ── Core Request ────────────────────────────────────────
  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;
    const { _isRetry, ...fetchOptions } = options;
    const headers = {
      "Content-Type": "application/json",
      "X-Payment-Network": this.paymentNetwork,
      "User-Agent": "@aiindigo/btcfi/1.0.0",
      ...this.defaultHeaders
    };
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }
    await this.enforceRateLimit();
    let lastError = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          ...fetchOptions,
          headers: { ...headers, ...fetchOptions.headers || {} },
          signal: AbortSignal.timeout(this.timeout)
        });
        if (res.status === 402) {
          const body = await res.json();
          const requirements = body.paymentRequirements || body;
          if (this.canAutoPay && requirements) {
            const paymentHeader = await this.buildPaymentHeader(requirements);
            if (paymentHeader) {
              headers["X-Payment"] = paymentHeader;
              const retryRes = await fetch(url, {
                ...fetchOptions,
                headers: { ...headers, ...fetchOptions.headers || {} },
                signal: AbortSignal.timeout(this.timeout)
              });
              if (retryRes.ok) {
                return await retryRes.json();
              }
            }
          }
          throw new PaymentRequiredError(requirements);
        }
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get("Retry-After") || "5", 10) * 1e3;
          throw new RateLimitError(retryAfter);
        }
        if (res.status >= 500) {
          throw new BTCFiError(`Server error ${res.status}`, res.status, true);
        }
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new BTCFiError(
            `API error ${res.status}: ${body}`,
            res.status,
            res.status >= 500
          );
        }
        return await res.json();
      } catch (error) {
        if (error instanceof PaymentRequiredError) throw error;
        lastError = error instanceof Error ? error : new Error(String(error));
        const isRetryable = error instanceof BTCFiError && error.retryable || error instanceof RateLimitError || error instanceof TimeoutError || error instanceof TypeError;
        if (!isRetryable || attempt >= this.maxRetries) {
          break;
        }
        const delay = error instanceof RateLimitError ? error.retryAfterMs : this.getBackoffDelay(attempt);
        await this.sleep(delay);
      }
    }
    if (lastError instanceof BTCFiError) throw lastError;
    throw new MaxRetriesError(this.maxRetries + 1, lastError || void 0);
  }
};

// src/modules/address.ts
var AddressModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get balance and stats for a Bitcoin address.
   */
  async getBalance(address) {
    return this.http.request(`/api/v1/address/${address}`);
  }
  /**
   * Get UTXOs for a Bitcoin address.
   */
  async getUtxos(address) {
    return this.http.request(`/api/v1/address/${address}/utxos`);
  }
  /**
   * Get transaction history for a Bitcoin address.
   */
  async getTxHistory(address) {
    return this.http.request(`/api/v1/address/${address}/txs`);
  }
};

// src/modules/fees.ts
var FeesModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get recommended fee rates from the Bitcoin mempool.
   */
  async recommended() {
    return this.http.request("/api/v1/fees");
  }
  /**
   * Get a detailed fee estimate with USD costs for a typical transaction.
   */
  async estimate() {
    return this.http.request("/api/v1/fees");
  }
};

// src/modules/mempool.ts
var MempoolModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get recent mempool state including pending transaction count,
   * fee histogram, and recent transactions.
   */
  async recent() {
    return this.http.request("/api/v1/mempool");
  }
};

// src/modules/block.ts
var BlockModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get the latest blocks from the Bitcoin blockchain.
   */
  async latest() {
    return this.http.request("/api/v1/block/latest");
  }
  /**
   * Get a specific block by hash or height.
   */
  async get(id) {
    return this.http.request(`/api/v1/block/${id}`);
  }
};

// src/modules/whales.ts
var WhalesModule = class {
  constructor(http) {
    this.http = http;
    this.baseUrl = http.baseUrl || "https://btcfi.aiindigo.com";
  }
  baseUrl;
  /**
   * List recent whale transactions (large BTC movements).
   * @param minBtc - Minimum BTC amount filter (default: 100)
   */
  async list(minBtc) {
    const params = minBtc ? `?min=${minBtc}` : "";
    return this.http.request(`/api/v1/intelligence/whales${params}`);
  }
  /**
   * Get current whale market signals (accumulation, distribution, etc.).
   */
  async signals() {
    return this.http.request("/api/v1/intelligence/signal");
  }
  /**
   * Get MVRV (Market Value to Realized Value) ratio.
   */
  async mvrv() {
    return this.http.request("/api/v1/intelligence/mvrv");
  }
  /**
   * Get SOPR (Spent Output Profit Ratio).
   */
  async sopr() {
    return this.http.request("/api/v1/intelligence/sopr");
  }
  /**
   * Subscribe to real-time whale events via Server-Sent Events (SSE).
   * @returns Unsubscribe function to close the connection
   */
  subscribe(callback) {
    const eventSource = new EventSource(`${this.baseUrl}/api/v1/stream/whales`);
    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data);
        callback(event);
      } catch {
      }
    };
    eventSource.onerror = () => {
      eventSource.close();
    };
    return () => {
      eventSource.close();
    };
  }
};

// src/modules/intelligence.ts
var IntelligenceModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get risk analysis for a Bitcoin address.
   */
  async risk(address) {
    return this.http.request(`/api/v1/intelligence/risk/${address}`);
  }
  /**
   * Identify the entity/label associated with a Bitcoin address.
   */
  async entity(address) {
    return this.http.request(`/api/v1/intelligence/entity/${address}`);
  }
  /**
   * Get portfolio analysis across multiple Bitcoin addresses.
   */
  async portfolio(addresses) {
    if (addresses.length === 0) {
      throw new Error("At least one address is required");
    }
    if (addresses.length === 1) {
      return this.http.request(`/api/v1/intelligence/portfolio/${addresses[0]}`);
    }
    return this.http.request("/api/v1/intelligence/portfolio", {
      method: "POST",
      body: JSON.stringify({ addresses })
    });
  }
};

// src/modules/zk.ts
var ZKModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Generate a ZK proof that an address holds at least a certain balance.
   * @param address - Bitcoin address
   * @param amount - Minimum balance threshold (in satoshis)
   */
  async proofBalance(address, amount) {
    return this.http.request("/api/v1/zk/balance-proof", {
      method: "POST",
      body: JSON.stringify({ address, threshold: amount, unit: "sats" })
    });
  }
  /**
   * Generate a ZK proof that an address has been active for at least N days.
   * @param address - Bitcoin address
   * @param days - Minimum age in days
   */
  async proofAge(address, days) {
    const minBlocks = days * 144;
    return this.http.request("/api/v1/zk/age-proof", {
      method: "POST",
      body: JSON.stringify({ address, minBlocks })
    });
  }
  /**
   * Verify a ZK proof.
   */
  async verifyProof(proofType, proof, publicInputs) {
    return this.http.request("/api/v1/zk/verify", {
      method: "POST",
      body: JSON.stringify({ proofType, proof, publicInputs })
    });
  }
};

// src/modules/batch.ts
var BatchModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Get balance and stats for multiple addresses in one request.
   * @param addresses - Array of Bitcoin addresses (max 20)
   */
  async addresses(addresses) {
    this.validateBatch(addresses);
    return this.http.request("/api/v1/batch", {
      method: "POST",
      body: JSON.stringify({ type: "addresses", addresses })
    });
  }
  /**
   * Get risk analysis for multiple addresses in one request.
   * @param addresses - Array of Bitcoin addresses (max 20)
   */
  async risk(addresses) {
    this.validateBatch(addresses);
    return this.http.request("/api/v1/batch", {
      method: "POST",
      body: JSON.stringify({ type: "risk", addresses })
    });
  }
  /**
   * Identify entities for multiple addresses in one request.
   * @param addresses - Array of Bitcoin addresses (max 20)
   */
  async entities(addresses) {
    this.validateBatch(addresses);
    return this.http.request("/api/v1/batch", {
      method: "POST",
      body: JSON.stringify({ type: "entities", addresses })
    });
  }
  validateBatch(addresses) {
    if (addresses.length === 0) throw new Error("At least one address is required");
    if (addresses.length > 20) throw new Error("Maximum 20 addresses per batch request");
  }
};

// src/modules/webhooks.ts
var WebhooksModule = class {
  constructor(http) {
    this.http = http;
  }
  /**
   * Create a new webhook to receive event notifications.
   * @param url - HTTPS URL to receive webhook POST requests
   * @param triggers - Event types to subscribe to
   */
  async create(url, triggers) {
    if (!url.startsWith("https://")) throw new Error("Webhook URL must use HTTPS");
    if (triggers.length === 0) throw new Error("At least one trigger is required");
    return this.http.request("/api/v1/webhooks", {
      method: "POST",
      body: JSON.stringify({ url, triggers })
    });
  }
  /**
   * List all configured webhooks.
   */
  async list() {
    return this.http.request("/api/v1/webhooks");
  }
  /**
   * Delete a webhook by ID.
   */
  async delete(id) {
    return this.http.request(`/api/v1/webhooks?id=${id}`, {
      method: "DELETE"
    });
  }
};

// src/index.ts
var BTCFi = class {
  /** Address queries (balance, UTXOs, transaction history) */
  address;
  /** Fee estimation and recommendations */
  fees;
  /** Mempool monitoring */
  mempool;
  /** Block queries */
  block;
  /** Whale tracking and on-chain signals */
  whales;
  /** Intelligence and analysis (risk, entity, portfolio) */
  intelligence;
  /** Zero-knowledge proof generation and verification */
  zk;
  /** Batch operations for multiple addresses */
  batch;
  /** Webhook management */
  webhooks;
  /** The internal HTTP client (for advanced use) */
  _http;
  constructor(config = {}) {
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
  get canAutoPay() {
    return this._http.canAutoPay;
  }
  /** Get current rate limit usage */
  get rateLimitInfo() {
    return this._http.rateLimitInfo;
  }
};
export {
  AddressModule,
  BTCFi,
  BTCFiError,
  BatchModule,
  BlockModule,
  FeesModule,
  HttpClient,
  IntelligenceModule,
  MaxRetriesError,
  MempoolModule,
  PaymentRequiredError,
  RateLimitError,
  SSEError,
  TimeoutError,
  WebhooksModule,
  WhalesModule,
  ZKModule
};
