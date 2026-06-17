// ============================================================
// @aiindigo/btcfi — Fees Module
// ============================================================

import type { HttpClient } from '../http.js';
import type {
  FeesRecommendedResponse,
  FeesEstimateResponse,
} from '../types.js';

/**
 * Fee estimation methods.
 */
export class FeesModule {
  constructor(private http: HttpClient) {}

  /**
   * Get recommended fee rates from the Bitcoin mempool.
   */
  async recommended(): Promise<FeesRecommendedResponse> {
    return this.http.request('/api/v1/fees');
  }

  /**
   * Get a detailed fee estimate with USD costs for a typical transaction.
   */
  async estimate(): Promise<FeesEstimateResponse> {
    return this.http.request('/api/v1/fees');
  }
}
