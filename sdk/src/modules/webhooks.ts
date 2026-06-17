// ============================================================
// @aiindigo/btcfi — Webhooks Module
// ============================================================

import type { HttpClient } from '../http.js';
import type {
  WebhooksListResponse,
  WebhooksCreateResponse,
  WebhooksDeleteResponse,
} from '../types.js';

/**
 * Webhook management for receiving real-time event notifications.
 */
export class WebhooksModule {
  constructor(private http: HttpClient) {}

  /**
   * Create a new webhook to receive event notifications.
   * @param url - HTTPS URL to receive webhook POST requests
   * @param triggers - Event types to subscribe to
   */
  async create(url: string, triggers: string[]): Promise<WebhooksCreateResponse> {
    if (!url.startsWith('https://')) throw new Error('Webhook URL must use HTTPS');
    if (triggers.length === 0) throw new Error('At least one trigger is required');
    return this.http.request('/api/v1/webhooks', {
      method: 'POST',
      body: JSON.stringify({ url, triggers }),
    });
  }

  /**
   * List all configured webhooks.
   */
  async list(): Promise<WebhooksListResponse> {
    return this.http.request('/api/v1/webhooks');
  }

  /**
   * Delete a webhook by ID.
   */
  async delete(id: string): Promise<WebhooksDeleteResponse> {
    return this.http.request(`/api/v1/webhooks?id=${id}`, {
      method: 'DELETE',
    });
  }
}
