// ============================================================
// @aiindigo/btcfi — Block Module
// ============================================================

import type { HttpClient } from '../http.js';
import type { BlockLatestResponse, BlockGetResponse } from '../types.js';

/**
 * Block query methods.
 */
export class BlockModule {
  constructor(private http: HttpClient) {}

  /**
   * Get the latest blocks from the Bitcoin blockchain.
   */
  async latest(): Promise<BlockLatestResponse> {
    return this.http.request('/api/v1/block/latest');
  }

  /**
   * Get a specific block by hash or height.
   */
  async get(id: string | number): Promise<BlockGetResponse> {
    return this.http.request(`/api/v1/block/${id}`);
  }
}
