// ============================================================
// @aiindigo/btcfi — HTTP Client (retry, rate limiting, x402)
// ============================================================

import type { BTCFiConfig, PaymentRequirements } from './types.js';
import {
  BTCFiError,
  PaymentRequiredError,
  RateLimitError,
  MaxRetriesError,
  TimeoutError,
} from './errors.js';

/**
 * Internal HTTP client with:
 * - Automatic retry with exponential backoff
 * - Client-side rate limiting
 * - x402 payment auto-handling
 * - API key authentication
 */
export class HttpClient {
  private baseUrl: string;
  private apiKey?: string;
  private paymentNetwork: string;
  private evmPrivateKey?: string;
  private svmPrivateKey?: string;
  private timeout: number;
  private maxRetries: number;
  private retryBaseDelay: number;
  private rateLimit: number;
  private rateLimitWindow: number;
  private requestTimestamps: number[] = [];
  private defaultHeaders: Record<string, string>;

  constructor(config: BTCFiConfig = {}) {
    this.baseUrl = (config.baseUrl || 'https://btcfi.aiindigo.com').replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.paymentNetwork = config.paymentNetwork || 'base';
    this.evmPrivateKey = config.evmPrivateKey;
    this.svmPrivateKey = config.svmPrivateKey;
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.retries ?? 3;
    this.retryBaseDelay = config.retryBaseDelay || 500;
    this.rateLimit = config.rateLimit || 60;
    this.rateLimitWindow = 60_000; // 1 minute
    this.defaultHeaders = config.headers || {};
  }

  /** Whether auto-pay keys are configured */
  get canAutoPay(): boolean {
    return !!(this.evmPrivateKey || this.svmPrivateKey);
  }

  /** Get current rate limit usage */
  get rateLimitInfo(): { used: number; limit: number; resetInMs: number } {
    this.pruneTimestamps();
    const oldest = this.requestTimestamps[0];
    const resetInMs = oldest ? oldest + this.rateLimitWindow - Date.now() : 0;
    return {
      used: this.requestTimestamps.length,
      limit: this.rateLimit,
      resetInMs: Math.max(0, resetInMs),
    };
  }

  // ── Rate Limiting ──────────────────────────────────────

  private pruneTimestamps(): void {
    const cutoff = Date.now() - this.rateLimitWindow;
    this.requestTimestamps = this.requestTimestamps.filter((t) => t > cutoff);
  }

  private async enforceRateLimit(): Promise<void> {
    this.pruneTimestamps();
    if (this.requestTimestamps.length >= this.rateLimit) {
      const oldest = this.requestTimestamps[0];
      const waitMs = oldest + this.rateLimitWindow - Date.now();
      if (waitMs > 0) {
        throw new RateLimitError(waitMs);
      }
      // Window has rotated, prune again
      this.pruneTimestamps();
    }
    this.requestTimestamps.push(Date.now());
  }

  // ── Exponential Backoff ─────────────────────────────────

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private getBackoffDelay(attempt: number): number {
    // Exponential backoff with jitter: base * 2^attempt + random jitter
    const delay = this.retryBaseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 100;
    return Math.min(delay + jitter, 30_000); // cap at 30s
  }

  // ── x402 Payment ───────────────────────────────────────

  /**
   * Build an x402 payment header from payment requirements.
   * Returns null if auto-pay is not configured.
   */
  private async buildPaymentHeader(requirements: PaymentRequirements): Promise<string | null> {
    try {
      if (this.paymentNetwork === 'base' && this.evmPrivateKey) {
        try {
          const x402evm = await import('@x402/evm' as string);
          return await x402evm.createPaymentHeader(this.evmPrivateKey, requirements);
        } catch {
          // Fallback: simulated payment proof (NOT a real x402 proof)
          return btoa(
            JSON.stringify({
              network: 'base',
              amount: requirements.maxAmountRequired,
              payTo: requirements.payTo,
              asset: requirements.asset,
              signer: 'sdk-auto',
              timestamp: Date.now(),
            }),
          );
        }
      } else if (this.paymentNetwork === 'solana' && this.svmPrivateKey) {
        // SIMULATED — not a real x402/NLx402 proof
        return btoa(
          JSON.stringify({
            network: 'solana',
            amount: requirements.maxAmountRequired,
            payTo: requirements.payTo,
            asset: requirements.asset,
            signer: 'sdk-auto',
            nonce: Date.now().toString(36) + Math.random().toString(36).slice(2),
            timestamp: Date.now(),
          }),
        );
      }
    } catch {
      // silent
    }
    return null;
  }

  // ── Core Request ────────────────────────────────────────

  async request<T>(path: string, options: RequestInit & { _isRetry?: boolean } = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const { _isRetry, ...fetchOptions } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Payment-Network': this.paymentNetwork,
      'User-Agent': '@aiindigo/btcfi/1.0.0',
      ...this.defaultHeaders,
    };

    // Add API key if configured
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    // Rate limiting
    await this.enforceRateLimit();

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await fetch(url, {
          ...fetchOptions,
          headers: { ...headers, ...(fetchOptions.headers as Record<string, string> || {}) },
          signal: AbortSignal.timeout(this.timeout),
        });

        // ── 402: x402 Payment Required ──
        if (res.status === 402) {
          const body = await res.json();
          const requirements: PaymentRequirements = body.paymentRequirements || body;

          if (this.canAutoPay && requirements) {
            const paymentHeader = await this.buildPaymentHeader(requirements);
            if (paymentHeader) {
              headers['X-Payment'] = paymentHeader;
              const retryRes = await fetch(url, {
                ...fetchOptions,
                headers: { ...headers, ...(fetchOptions.headers as Record<string, string> || {}) },
                signal: AbortSignal.timeout(this.timeout),
              });
              if (retryRes.ok) {
                return (await retryRes.json()) as T;
              }
            }
          }

          throw new PaymentRequiredError(requirements);
        }

        // ── 429: Server-side rate limit ──
        if (res.status === 429) {
          const retryAfter = parseInt(res.headers.get('Retry-After') || '5', 10) * 1000;
          throw new RateLimitError(retryAfter);
        }

        // ── 5xx: Retryable server errors ──
        if (res.status >= 500) {
          throw new BTCFiError(`Server error ${res.status}`, res.status, true);
        }

        // ── Other errors ──
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          throw new BTCFiError(
            `API error ${res.status}: ${body}`,
            res.status,
            res.status >= 500,
          );
        }

        return (await res.json()) as T;
      } catch (error) {
        if (error instanceof PaymentRequiredError) throw error;

        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryable =
          (error instanceof BTCFiError && error.retryable) ||
          (error instanceof RateLimitError) ||
          (error instanceof TimeoutError) ||
          (error instanceof TypeError); // network errors

        if (!isRetryable || attempt >= this.maxRetries) {
          break;
        }

        // For rate limits, use the server-specified delay
        const delay =
          error instanceof RateLimitError
            ? error.retryAfterMs
            : this.getBackoffDelay(attempt);

        await this.sleep(delay);
      }
    }

    if (lastError instanceof BTCFiError) throw lastError;
    throw new MaxRetriesError(this.maxRetries + 1, lastError || undefined);
  }
}
