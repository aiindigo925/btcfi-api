// ============================================================
// @aiindigo/btcfi — Address Module
// ============================================================

import type { HttpClient } from '../http.js';
import type {
  AddressInfoResponse,
  UtxoResponse,
  TxHistoryResponse,
} from '../types.js';

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
export class AddressModule {
  constructor(private http: HttpClient) {}

  /**
   * Get balance and stats for a Bitcoin address.
   */
  async getBalance(address: string): Promise<AddressInfoResponse> {
    return this.http.request(`/api/v1/address/${address}`);
  }

  /**
   * Get UTXOs for a Bitcoin address.
   */
  async getUtxos(address: string): Promise<UtxoResponse> {
    return this.http.request(`/api/v1/address/${address}/utxos`);
  }

  /**
   * Get transaction history for a Bitcoin address.
   */
  async getTxHistory(address: string): Promise<TxHistoryResponse> {
    return this.http.request(`/api/v1/address/${address}/txs`);
  }
}
