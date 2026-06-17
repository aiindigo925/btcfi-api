// ============================================================
// @aiindigo/btcfi — Batch Module
// ============================================================

import type { HttpClient } from '../http.js';
import type {
  BatchAddressesResponse,
  BatchRiskResponse,
  BatchEntitiesResponse,
} from '../types.js';

/**
 * Batch operations for multiple addresses at once.
 */
export class BatchModule {
  constructor(private http: HttpClient) {}

  /**
   * Get balance and stats for multiple addresses in one request.
   * @param addresses - Array of Bitcoin addresses (max 20)
   */
  async addresses(addresses: string[]): Promise<BatchAddressesResponse> {
    this.validateBatch(addresses);
    return this.http.request('/api/v1/batch', {
      method: 'POST',
      body: JSON.stringify({ type: 'addresses', addresses }),
    });
  }

  /**
   * Get risk analysis for multiple addresses in one request.
   * @param addresses - Array of Bitcoin addresses (max 20)
   */
  async risk(addresses: string[]): Promise<BatchRiskResponse> {
    this.validateBatch(addresses);
    return this.http.request('/api/v1/batch', {
      method: 'POST',
      body: JSON.stringify({ type: 'risk', addresses }),
    });
  }

  /**
   * Identify entities for multiple addresses in one request.
   * @param addresses - Array of Bitcoin addresses (max 20)
   */
  async entities(addresses: string[]): Promise<BatchEntitiesResponse> {
    this.validateBatch(addresses);
    return this.http.request('/api/v1/batch', {
      method: 'POST',
      body: JSON.stringify({ type: 'entities', addresses }),
    });
  }

  private validateBatch(addresses: string[]): void {
    if (addresses.length === 0) throw new Error('At least one address is required');
    if (addresses.length > 20) throw new Error('Maximum 20 addresses per batch request');
  }
}
