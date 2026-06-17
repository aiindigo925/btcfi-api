/**
 * BTCFi Webhook / Push Notification System
 * Register webhooks, evaluate triggers, fire HTTP POST with HMAC signatures.
 *
 * Trigger types:
 *   - whale:         tx >= threshold (default 10 BTC)
 *   - price_above:   BTC price crosses above threshold
 *   - price_below:   BTC price crosses below threshold
 *   - fee_spike:     fee rate > 2x 24h average
 *   - block_mined:   every new block
 */

import { createHmac, randomBytes } from 'crypto';
import { getRedis } from './redis';
import {
  getBtcPrice,
  getRecommendedFees,
  getMempoolRecent,
  getBlockHeight,
} from './bitcoin';

// ============ TYPES ============

export type TriggerType = 'whale' | 'price_above' | 'price_below' | 'fee_spike' | 'block_mined';

export interface WebhookTrigger {
  type: TriggerType;
  /** Threshold value — meaning depends on trigger type */
  threshold?: number;
}

export interface Webhook {
  id: string;
  url: string;
  triggers: WebhookTrigger[];
  secret: string;
  apiKey: string;
  createdAt: string;
  lastFiredAt?: string;
  fireCount: number;
  enabled: boolean;
}

export interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
  webhook_id: string;
  signature: string;
}

// ============ STORAGE ============

const WEBHOOK_KEY_PREFIX = 'webhooks:';
const WEBHOOK_INDEX_KEY = 'webhooks:index'; // Set of all webhook IDs for evaluation

function webhookKey(apiKey: string): string {
  return `${WEBHOOK_KEY_PREFIX}${apiKey}`;
}

function generateWebhookId(): string {
  return `wh_${Date.now()}_${randomBytes(4).toString('hex')}`;
}

function generateSecret(): string {
  return `whsec_${randomBytes(24).toString('hex')}`;
}

// ============ CRUD ============

/**
 * Register a new webhook for an API key holder.
 */
export async function registerWebhook(
  url: string,
  triggers: WebhookTrigger[],
  apiKey: string,
  secret?: string,
): Promise<Webhook> {
  const redis = getRedis();

  const webhook: Webhook = {
    id: generateWebhookId(),
    url,
    triggers,
    secret: secret || generateSecret(),
    apiKey,
    createdAt: new Date().toISOString(),
    fireCount: 0,
    enabled: true,
  };

  // Store webhook in user's list
  const key = webhookKey(apiKey);
  const existing = await redis.get<Webhook[]>(key);
  const webhooks: Webhook[] = existing || [];
  webhooks.push(webhook);
  await redis.set(key, JSON.stringify(webhooks));

  // Add to global index for trigger evaluation
  await redis.sadd(WEBHOOK_INDEX_KEY, webhook.id);
  // Store individual webhook for lookup during evaluation
  await redis.set(`webhook:one:${webhook.id}`, JSON.stringify(webhook));

  return webhook;
}

/**
 * Remove a webhook by ID. Looks up across all stored webhooks.
 */
export async function removeWebhook(apiKey: string, webhookId: string): Promise<boolean> {
  const redis = getRedis();
  const key = webhookKey(apiKey);

  const existing = await redis.get<Webhook[]>(key);
  if (!existing) return false;

  const webhooks: Webhook[] = existing;
  const filtered = webhooks.filter((w) => w.id !== webhookId);
  if (filtered.length === webhooks.length) return false;

  await redis.set(key, JSON.stringify(filtered));
  await redis.srem(WEBHOOK_INDEX_KEY, webhookId);
  await redis.del(`webhook:one:${webhookId}`);

  return true;
}

/**
 * List all webhooks for an API key.
 */
export async function listWebhooks(apiKey: string): Promise<Webhook[]> {
  const redis = getRedis();
  const key = webhookKey(apiKey);

  const existing = await redis.get<Webhook[]>(key);
  return existing || [];
}

/**
 * Get a single webhook by ID (across all API keys).
 */
export async function getWebhookById(webhookId: string): Promise<Webhook | null> {
  const redis = getRedis();
  const data = await redis.get<string>(`webhook:one:${webhookId}`);
  if (!data) return null;
  return typeof data === 'string' ? JSON.parse(data) : (data as unknown as Webhook);
}

// ============ HMAC SIGNING ============

/**
 * Generate HMAC-SHA256 signature for a webhook payload.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex');
}

/**
 * Verify an HMAC-SHA256 signature against a payload.
 */
export function verifySignature(payload: string, secret: string, signature: string): boolean {
  const expected = signPayload(payload, secret);
  // Timing-safe comparison
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ============ FIRE WEBHOOK ============

/**
 * Fire a webhook with HTTP POST and retry logic (3 attempts).
 * Returns the last response or error.
 */
export async function fireWebhook(
  webhook: Webhook,
  event: string,
  data: Record<string, unknown>,
): Promise<{ success: boolean; status?: number; error?: string }> {
  const redis = getRedis();
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 10_000;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
    webhook_id: webhook.id,
    signature: '', // filled below
  };

  const payloadJson = JSON.stringify(payload);
  payload.signature = signPayload(payloadJson, webhook.secret);
  const signedJson = JSON.stringify(payload);

  let lastError = '';
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-ID': webhook.id,
          'X-Webhook-Signature': payload.signature,
          'X-Webhook-Event': event,
          'X-Webhook-Delivery': `${webhook.id}_${Date.now()}`,
        },
        body: signedJson,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        // Update webhook stats
        const now = new Date().toISOString();
        const existingWebhook = await getWebhookById(webhook.id);
        if (existingWebhook) {
          existingWebhook.lastFiredAt = now;
          existingWebhook.fireCount += 1;
          await redis.set(`webhook:one:${webhook.id}`, JSON.stringify(existingWebhook));
          // Also update in user's list
          const userWebhooks = await listWebhooks(existingWebhook.apiKey);
          const idx = userWebhooks.findIndex((w) => w.id === webhook.id);
          if (idx >= 0) {
            userWebhooks[idx] = existingWebhook;
            await redis.set(webhookKey(existingWebhook.apiKey), JSON.stringify(userWebhooks));
          }
        }

        return { success: true, status: res.status };
      }

      lastError = `HTTP ${res.status}`;
    } catch (err: unknown) {
      lastError = err instanceof Error ? err.message : String(err);
    }

    // Exponential backoff between attempts (1s, 2s)
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return { success: false, error: `Failed after ${MAX_ATTEMPTS} attempts: ${lastError}` };
}

// ============ TRIGGER EVALUATION ============

/**
 * Cache keys for tracking "previous" values (to detect crossings).
 */
const PREV_PRICE_KEY = 'webhooks:prev:price';
const PREV_FEE_AVG_KEY = 'webhooks:prev:fee_avg';
const PREV_BLOCK_KEY = 'webhooks:prev:block';

/**
 * Evaluate all registered webhooks against current conditions.
 * Returns a summary of fired webhooks.
 *
 * Intended to be called by a cron job or periodically.
 */
export async function evaluateTriggers(): Promise<{
  fired: number;
  errors: string[];
  details: Array<{ webhook_id: string; event: string; success: boolean; error?: string }>;
}> {
  const redis = getRedis();
  const results: Array<{ webhook_id: string; event: string; success: boolean; error?: string }> = [];
  const errors: string[] = [];

  // Get current conditions from Bitcoin data
  let price: { USD: number; EUR: number };
  let fees;
  let recentTxs: any[];
  let currentBlockHeight: number;

  try {
    [price, fees, recentTxs, currentBlockHeight] = await Promise.all([
      getBtcPrice().catch(() => ({ USD: 0, EUR: 0 })),
      getRecommendedFees().catch(() => ({
        fastestFee: 0, halfHourFee: 0, hourFee: 0, economyFee: 0, minimumFee: 0,
      })),
      getMempoolRecent().catch(() => []),
      getBlockHeight().catch(() => 0),
    ]);
  } catch (err) {
    errors.push(`Failed to fetch current conditions: ${err}`);
    return { fired: 0, errors, details: results };
  }

  // Get previous state
  const prevPrice = parseFloat((await redis.get<string>(PREV_PRICE_KEY)) || '0');
  const prevBlockHeight = parseInt((await redis.get<string>(PREV_BLOCK_KEY)) || '0');
  const prevFeeAvgRaw = await redis.get<string>(PREV_FEE_AVG_KEY);
  const prevFeeAvg = prevFeeAvgRaw ? parseFloat(prevFeeAvgRaw) : fees.fastestFee;

  // Calculate 24h average fee (approximation: use current fees if no history)
  const feeAvg24h = prevFeeAvg > 0 ? (prevFeeAvg + fees.fastestFee) / 2 : fees.fastestFee;

  // Get all webhook IDs from index
  const webhookIds = await redis.smembers(WEBHOOK_INDEX_KEY);

  // Load all unique webhooks
  const allWebhooks: Webhook[] = [];
  for (const id of webhookIds) {
    const wh = await getWebhookById(id);
    if (wh && wh.enabled) {
      allWebhooks.push(wh);
    } else if (wh && !wh.enabled) {
      // Clean up disabled webhooks
      await redis.srem(WEBHOOK_INDEX_KEY, id);
    }
  }

  // Evaluate each webhook's triggers
  for (const webhook of allWebhooks) {
    for (const trigger of webhook.triggers) {
      let shouldFire = false;
      let eventData: Record<string, unknown> = {};

      switch (trigger.type) {
        case 'whale': {
          const threshold = trigger.threshold ?? 10; // default 10 BTC
          const minSats = threshold * 1e8;
          for (const tx of recentTxs) {
            if ((tx.value || 0) >= minSats) {
              shouldFire = true;
              eventData = {
                txid: tx.txid,
                amount_btc: (tx.value / 1e8).toFixed(8),
                amount_usd: ((tx.value / 1e8) * price.USD).toFixed(2),
                signal: 'whale_detected',
                threshold_btc: threshold,
              };
              break; // One whale event per evaluation cycle
            }
          }
          break;
        }
        case 'price_above': {
          const threshold = trigger.threshold ?? 100000;
          if (prevPrice > 0 && prevPrice < threshold && price.USD >= threshold) {
            shouldFire = true;
            eventData = {
              price_usd: price.USD,
              threshold_usd: threshold,
              previous_price_usd: prevPrice,
              signal: 'bullish_breakout',
            };
          }
          // Also fire if price is above and no previous (first evaluation)
          break;
        }
        case 'price_below': {
          const threshold = trigger.threshold ?? 90000;
          if (prevPrice > 0 && prevPrice > threshold && price.USD <= threshold) {
            shouldFire = true;
            eventData = {
              price_usd: price.USD,
              threshold_usd: threshold,
              previous_price_usd: prevPrice,
              signal: 'bearish_breakdown',
            };
          }
          break;
        }
        case 'fee_spike': {
          const threshold = trigger.threshold ?? 2; // multiplier (2x average)
          if (feeAvg24h > 0 && fees.fastestFee > feeAvg24h * threshold) {
            shouldFire = true;
            eventData = {
              current_fee: fees.fastestFee,
              average_fee_24h: feeAvg24h,
              multiplier: (fees.fastestFee / feeAvg24h).toFixed(2),
              signal: 'fee_spike',
              all_fees: fees,
            };
          }
          break;
        }
        case 'block_mined': {
          if (prevBlockHeight > 0 && currentBlockHeight > prevBlockHeight) {
            shouldFire = true;
            eventData = {
              block_height: currentBlockHeight,
              previous_height: prevBlockHeight,
              blocks_mined: currentBlockHeight - prevBlockHeight,
              signal: 'new_block',
            };
          }
          break;
        }
      }

      if (shouldFire) {
        const result = await fireWebhook(webhook, trigger.type, eventData);
        results.push({
          webhook_id: webhook.id,
          event: trigger.type,
          success: result.success,
          error: result.error,
        });
      }
    }
  }

  // Update previous state
  if (price.USD > 0) await redis.set(PREV_PRICE_KEY, String(price.USD));
  if (currentBlockHeight > 0) await redis.set(PREV_BLOCK_KEY, String(currentBlockHeight));
  if (fees.fastestFee > 0) await redis.set(PREV_FEE_AVG_KEY, String(fees.fastestFee));

  return {
    fired: results.filter((r) => r.success).length,
    errors,
    details: results,
  };
}

// ============ TEST FIRE ============

/**
 * Fire a test/sample payload to a webhook (or all webhooks for an API key).
 */
export async function testFireWebhook(
  apiKey: string,
  webhookId: string | null,
  event: TriggerType = 'whale',
): Promise<{ success: boolean; results: Array<{ id: string; success: boolean; error?: string }> }> {
  let webhooks: Webhook[];
  if (webhookId) {
    const wh = await getWebhookById(webhookId);
    if (!wh || wh.apiKey !== apiKey) {
      return { success: false, results: [{ id: webhookId, success: false, error: 'Webhook not found' }] };
    }
    webhooks = [wh];
  } else {
    webhooks = await listWebhooks(apiKey);
  }

  const sampleData: Record<string, Record<string, unknown>> = {
    whale: {
      txid: '0000000000000000000000000000000000000000000000000000000000000000',
      amount_btc: '25.00000000',
      amount_usd: '2500000.00',
      signal: 'buy',
      note: 'Test webhook payload',
    },
    price_above: {
      price_usd: 150000,
      threshold_usd: 100000,
      signal: 'bullish_breakout',
      note: 'Test webhook payload',
    },
    price_below: {
      price_usd: 80000,
      threshold_usd: 90000,
      signal: 'bearish_breakdown',
      note: 'Test webhook payload',
    },
    fee_spike: {
      current_fee: 150,
      average_fee_24h: 30,
      multiplier: '5.00',
      signal: 'fee_spike',
      note: 'Test webhook payload',
    },
    block_mined: {
      block_height: 900000,
      signal: 'new_block',
      note: 'Test webhook payload',
    },
  };

  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const wh of webhooks) {
    const result = await fireWebhook(wh, event, sampleData[event] || sampleData.whale);
    results.push({ id: wh.id, success: result.success, error: result.error });
  }

  return {
    success: results.some((r) => r.success),
    results,
  };
}
