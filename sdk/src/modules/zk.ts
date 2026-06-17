// ============================================================
// @aiindigo/btcfi — ZK Proofs Module
// ============================================================

import type { HttpClient } from '../http.js';
import type { ZKProofResult, ZKVerifyResult } from '../types.js';

/**
 * Zero-knowledge proof generation and verification.
 */
export class ZKModule {
  constructor(private http: HttpClient) {}

  /**
   * Generate a ZK proof that an address holds at least a certain balance.
   * @param address - Bitcoin address
   * @param amount - Minimum balance threshold (in satoshis)
   */
  async proofBalance(address: string, amount: number): Promise<ZKProofResult> {
    return this.http.request('/api/v1/zk/balance-proof', {
      method: 'POST',
      body: JSON.stringify({ address, threshold: amount, unit: 'sats' }),
    });
  }

  /**
   * Generate a ZK proof that an address has been active for at least N days.
   * @param address - Bitcoin address
   * @param days - Minimum age in days
   */
  async proofAge(address: string, days: number): Promise<ZKProofResult> {
    const minBlocks = days * 144; // ~144 blocks per day
    return this.http.request('/api/v1/zk/age-proof', {
      method: 'POST',
      body: JSON.stringify({ address, minBlocks }),
    });
  }

  /**
   * Verify a ZK proof.
   */
  async verifyProof(
    proofType: string,
    proof: Record<string, unknown>,
    publicInputs: string[],
  ): Promise<ZKVerifyResult> {
    return this.http.request('/api/v1/zk/verify', {
      method: 'POST',
      body: JSON.stringify({ proofType, proof, publicInputs }),
    });
  }
}
