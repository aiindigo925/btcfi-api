// ============================================================
// @aiindigo/btcfi — Intelligence Module
// ============================================================

import type { HttpClient } from '../http.js';
import type {
  IntelligenceRiskResponse,
  IntelligenceEntityResponse,
  IntelligencePortfolioResponse,
} from '../types.js';

/**
 * Bitcoin intelligence and analysis methods.
 */
export class IntelligenceModule {
  constructor(private http: HttpClient) {}

  /**
   * Get risk analysis for a Bitcoin address.
   */
  async risk(address: string): Promise<IntelligenceRiskResponse> {
    return this.http.request(`/api/v1/intelligence/risk/${address}`);
  }

  /**
   * Identify the entity/label associated with a Bitcoin address.
   */
  async entity(address: string): Promise<IntelligenceEntityResponse> {
    return this.http.request(`/api/v1/intelligence/entity/${address}`);
  }

  /**
   * Get portfolio analysis across multiple Bitcoin addresses.
   */
  async portfolio(addresses: string[]): Promise<IntelligencePortfolioResponse> {
    if (addresses.length === 0) {
      throw new Error('At least one address is required');
    }
    if (addresses.length === 1) {
      return this.http.request(`/api/v1/intelligence/portfolio/${addresses[0]}`);
    }
    return this.http.request('/api/v1/intelligence/portfolio', {
      method: 'POST',
      body: JSON.stringify({ addresses }),
    });
  }
}
