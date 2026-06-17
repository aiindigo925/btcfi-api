// ============================================================
// @aiindigo/btcfi — Error Classes
// ============================================================

import type { PaymentRequirements } from './types.js';

/**
 * Base error class for BTCFi SDK errors.
 */
export class BTCFiError extends Error {
  public statusCode?: number;
  public retryable: boolean;

  constructor(message: string, statusCode?: number, retryable = false) {
    super(message);
    this.name = 'BTCFiError';
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * Thrown when the API returns 402 Payment Required (x402 micropayment needed).
 */
export class PaymentRequiredError extends BTCFiError {
  public paymentRequirements: PaymentRequirements;

  constructor(data: PaymentRequirements) {
    super('Payment required (x402)');
    this.name = 'PaymentRequiredError';
    this.statusCode = 402;
    this.retryable = false;
    this.paymentRequirements = data;
  }
}

/**
 * Thrown when the SDK's built-in rate limiter blocks a request.
 */
export class RateLimitError extends BTCFiError {
  public retryAfterMs: number;

  constructor(retryAfterMs: number) {
    super(`Rate limited — retry after ${retryAfterMs}ms`);
    this.name = 'RateLimitError';
    this.retryable = true;
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Thrown after all retry attempts are exhausted.
 */
export class MaxRetriesError extends BTCFiError {
  public attempts: number;
  public lastError?: Error;

  constructor(attempts: number, lastError?: Error) {
    super(`All ${attempts} retry attempts exhausted`);
    this.name = 'MaxRetriesError';
    this.retryable = false;
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

/**
 * Thrown when the request times out.
 */
export class TimeoutError extends BTCFiError {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.retryable = true;
  }
}

/**
 * Thrown when an SSE connection encounters an error.
 */
export class SSEError extends BTCFiError {
  constructor(message: string) {
    super(message);
    this.name = 'SSEError';
    this.retryable = false;
  }
}
