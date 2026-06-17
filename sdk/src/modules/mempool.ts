// ============================================================
// @aiindigo/btcfi — Mempool Module
// ============================================================

import type { HttpClient } from '../http.js';
import type { MempoolRecentResponse } from '../types.js';

/**
 * Mempool monitoring methods.
 */
export class MempoolModule {
  constructor(private http: HttpClient) {}

  /**
   * Get recent mempool state including pending transaction count,
   * fee histogram, and recent transactions.
   */
  async recent(): Promise<MempoolRecentResponse> {
    return this.http.request('/api/v1/mempool');
  }
}
