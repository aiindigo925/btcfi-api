// ============================================================
// @aiindigo/btcfi — Whales Module
// ============================================================

import type { HttpClient } from '../http.js';
import type {
  WhalesListResponse,
  WhalesSignalsResponse,
  WhalesMVResponse,
  WhalesSOPRResponse,
  SSECallback,
  WhaleEvent,
} from '../types.js';
import { SSEError } from '../errors.js';

/**
 * Whale tracking and on-chain signals.
 */
export class WhalesModule {
  private baseUrl: string;

  constructor(private http: HttpClient) {
    // Access baseUrl from http for SSE connections
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.baseUrl = (http as any).baseUrl || 'https://btcfi.aiindigo.com';
  }

  /**
   * List recent whale transactions (large BTC movements).
   * @param minBtc - Minimum BTC amount filter (default: 100)
   */
  async list(minBtc?: number): Promise<WhalesListResponse> {
    const params = minBtc ? `?min=${minBtc}` : '';
    return this.http.request(`/api/v1/intelligence/whales${params}`);
  }

  /**
   * Get current whale market signals (accumulation, distribution, etc.).
   */
  async signals(): Promise<WhalesSignalsResponse> {
    return this.http.request('/api/v1/intelligence/signal');
  }

  /**
   * Get MVRV (Market Value to Realized Value) ratio.
   */
  async mvrv(): Promise<WhalesMVResponse> {
    return this.http.request('/api/v1/intelligence/mvrv');
  }

  /**
   * Get SOPR (Spent Output Profit Ratio).
   */
  async sopr(): Promise<WhalesSOPRResponse> {
    return this.http.request('/api/v1/intelligence/sopr');
  }

  /**
   * Subscribe to real-time whale events via Server-Sent Events (SSE).
   * @returns Unsubscribe function to close the connection
   */
  subscribe(callback: SSECallback<WhaleEvent>): () => void {
    const eventSource = new EventSource(`${this.baseUrl}/api/v1/stream/whales`);

    eventSource.onmessage = (e: MessageEvent) => {
      try {
        const event = JSON.parse(e.data) as WhaleEvent;
        callback(event);
      } catch {
        // ignore malformed events
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }
}
