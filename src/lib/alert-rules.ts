/**
 * Smart Alert Rules Engine — BTCFi
 *
 * Flexible rule-based alerting system with support for:
 *   - Threshold rules (single metric comparison)
 *   - Compound rules (AND/OR logic across multiple conditions)
 *   - Anomaly rules (z-score based anomaly detection)
 *   - Scheduled rules (cron-based periodic checks)
 *
 * Delivery via webhook (HMAC-signed) or Telegram DM.
 * Rules stored in Upstash Redis per user.
 *
 * Redis key schema:
 *   alert_rules:{userId}        — JSON array of AlertRule objects
 *   alert_history:{userId}      — JSON array of AlertEvent objects (max 100)
 *   alert_anomaly:{metric}      — JSON { values: number[], avg: number, stddev: number }
 *   alert_prev:{userId}:{ruleId} — previous metric value (for crosses_above/below)
 */

import { getRedis } from './redis';
import { signPayload, type WebhookPayload } from './webhooks';
import {
  getBtcPrice,
  getRecommendedFees,
  getMempoolSummary,
  getBlockHeight,
} from './bitcoin';

// ============ TYPES ============

export type AlertMetric =
  | 'price'
  | 'fees'
  | 'whale_btc'
  | 'whale_count'
  | 'mvrv'
  | 'sopr'
  | 'mempool_size'
  | 'block_time';

export type AlertOp =
  | '>'
  | '<'
  | '>='
  | '<='
  | '=='
  | 'crosses_above'
  | 'crosses_below';

export type AlertRuleType = 'threshold' | 'compound' | 'scheduled' | 'anomaly';

export interface AlertDeliveryWebhook {
  type: 'webhook';
  url: string;
  secret: string;
}

export interface AlertDeliveryTelegram {
  type: 'telegram';
  userId: string;
}

export type AlertDelivery = AlertDeliveryWebhook | AlertDeliveryTelegram;

export interface AlertRule {
  id: string;
  userId: string;
  type: AlertRuleType;
  metric: AlertMetric;
  op: AlertOp;
  value: number;
  // compound rules
  operator?: 'and' | 'or';
  conditions?: AlertRule[];
  // scheduled rules
  cron?: string;
  // anomaly rules
  zscore_threshold?: number;
  // delivery
  delivery: AlertDelivery;
  enabled: boolean;
  created_at: string;
  last_triggered?: string;
}

export interface AlertEvent {
  id: string;
  rule_id: string;
  rule_name: string;
  userId: string;
  metric: AlertMetric;
  value: number;
  threshold: number;
  op: AlertOp;
  message: string;
  delivered_via: string;
  delivered_successfully: boolean;
  timestamp: string;
}

// ============ STORAGE ============

const RULES_KEY_PREFIX = 'alert_rules:';
const HISTORY_KEY_PREFIX = 'alert_history:';
const ANOMALY_KEY_PREFIX = 'alert_anomaly:';
const PREV_KEY_PREFIX = 'alert_prev:';
const MAX_HISTORY = 100;

function rulesKey(userId: string): string {
  return `${RULES_KEY_PREFIX}${userId}`;
}

function historyKey(userId: string): string {
  return `${HISTORY_KEY_PREFIX}${userId}`;
}

function anomalyKey(metric: string): string {
  return `${ANOMALY_KEY_PREFIX}${metric}`;
}

function prevKey(userId: string, ruleId: string): string {
  return `${PREV_KEY_PREFIX}${userId}:${ruleId}`;
}

function generateId(): string {
  return `ar_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ============ TIER LIMITS ============

const TIER_MAX_RULES: Record<string, number> = {
  free: 5,
  pro: 25,
  enterprise: 100,
};

export function getMaxRules(tier: string): number {
  return TIER_MAX_RULES[tier] || TIER_MAX_RULES.free;
}

// ============ CRUD ============

/**
 * Create a new alert rule for a user.
 */
export async function createRule(
  userId: string,
  rule: Omit<AlertRule, 'id' | 'created_at' | 'enabled'>
): Promise<AlertRule> {
  const redis = getRedis();
  const key = rulesKey(userId);

  const fullRule: AlertRule = {
    ...rule,
    id: generateId(),
    enabled: true,
    created_at: new Date().toISOString(),
  };

  const existing = await redis.get<AlertRule[]>(key);
  const rules: AlertRule[] = existing || [];
  rules.push(fullRule);
  await redis.set(key, JSON.stringify(rules));

  return fullRule;
}

/**
 * Delete an alert rule by ID for a given user.
 */
export async function deleteRule(userId: string, ruleId: string): Promise<boolean> {
  const redis = getRedis();
  const key = rulesKey(userId);

  const existing = await redis.get<AlertRule[]>(key);
  if (!existing) return false;

  const rules: AlertRule[] = existing;
  const filtered = rules.filter((r) => r.id !== ruleId);
  if (filtered.length === rules.length) return false;

  await redis.set(key, JSON.stringify(filtered));
  // Clean up previous value key
  await redis.del(prevKey(userId, ruleId)).catch(() => {});

  return true;
}

/**
 * List all alert rules for a user.
 */
export async function listRules(userId: string): Promise<AlertRule[]> {
  const redis = getRedis();
  const key = rulesKey(userId);
  const existing = await redis.get<AlertRule[]>(key);
  return existing || [];
}

// ============ METRIC FETCHING ============

interface MetricValues {
  price: number;
  fees: number;
  whale_btc: number;
  whale_count: number;
  mvrv: number;
  sopr: number;
  mempool_size: number;
  block_time: number;
}

/**
 * Fetch all current metric values from Bitcoin data sources.
 */
async function fetchMetricValues(): Promise<MetricValues> {
  let price = 0;
  let fees = 0;
  let mempoolSize = 0;
  let blockTime = 0;
  let whaleBtc = 0;
  let whaleCount = 0;
  let mvrv = 0;
  let sopr = 0;

  // Fetch BTC price + fees + mempool + block height in parallel
  const [priceData, feeData, mempoolData, blockHeight] = await Promise.all([
    getBtcPrice().catch(() => ({ USD: 0 })),
    getRecommendedFees().catch(() => ({ fastestFee: 0 })),
    getMempoolSummary().catch(() => ({ vsize: 0, count: 0 })),
    getBlockHeight().catch(() => 0),
  ]);

  price = priceData.USD || 0;
  fees = (feeData as Record<string, number>).fastestFee || 0;
  mempoolSize = mempoolData.vsize ? mempoolData.vsize / 1_000_000 : 0; // convert to MB

  // Calculate approximate block time from block height (fetch last 2 blocks)
  if (blockHeight > 0) {
    try {
      const [block1, block2] = await Promise.all([
        fetch(`https://mempool.space/api/block/${blockHeight}`).then((r) => r.json()) as Promise<{ timestamp: number }>,
        fetch(`https://mempool.space/api/block/${blockHeight - 1}`).then((r) => r.json()) as Promise<{ timestamp: number }>,
      ]);
      blockTime = block1.timestamp - block2.timestamp;
    } catch {
      blockTime = 600; // default ~10min
    }
  }

  // Fetch whale data from internal API
  try {
    const whaleBase = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
    const internalKey = process.env.INTERNAL_API_KEY || '';
    const whaleHeaders: Record<string, string> = {};
    if (internalKey) whaleHeaders['X-Internal-Key'] = internalKey;

    const whaleRes = await fetch(`${whaleBase}/api/v1/intelligence/whales`, {
      headers: whaleHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (whaleRes.ok) {
      const whaleData = await whaleRes.json();
      const whales = whaleData?.data?.whales || whaleData?.data || [];
      whaleCount = whales.length || 0;
      if (whales.length > 0) {
        whaleBtc = Math.max(...whales.map((w: { value_btc?: number; amount_btc?: number }) => w.value_btc || w.amount_btc || 0));
      }
    }
  } catch {
    // Whale data unavailable — leave at 0
  }

  // Fetch MVRV from internal API
  try {
    const intBase = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
    const intHeaders: Record<string, string> = {};
    const internalKey = process.env.INTERNAL_API_KEY || '';
    if (internalKey) intHeaders['X-Internal-Key'] = internalKey;

    const mvrvRes = await fetch(`${intBase}/api/v1/intelligence/mvrv`, {
      headers: intHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (mvrvRes.ok) {
      const mvrvData = await mvrvRes.json();
      mvrv = mvrvData?.data?.mvrv || mvrvData?.mvrv || 0;
    }
  } catch {
    // MVRV unavailable
  }

  // Fetch SOPR from internal API
  try {
    const intBase = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
    const intHeaders: Record<string, string> = {};
    const internalKey = process.env.INTERNAL_API_KEY || '';
    if (internalKey) intHeaders['X-Internal-Key'] = internalKey;

    const soprRes = await fetch(`${intBase}/api/v1/intelligence/sopr`, {
      headers: intHeaders,
      signal: AbortSignal.timeout(10000),
    });
    if (soprRes.ok) {
      const soprData = await soprRes.json();
      sopr = soprData?.data?.sopr || soprData?.sopr || 0;
    }
  } catch {
    // SOPR unavailable
  }

  return { price, fees, whale_btc: whaleBtc, whale_count: whaleCount, mvrv, sopr, mempool_size: mempoolSize, block_time: blockTime };
}

// ============ ANOMALY DETECTION ============

const ANOMALY_WINDOW = 50; // rolling window size

interface AnomalyState {
  values: number[];
  avg: number;
  stddev: number;
}

/**
 * Update anomaly tracking for a metric and compute z-score of current value.
 */
async function updateAnomaly(
  redis: ReturnType<typeof getRedis>,
  metric: string,
  currentValue: number
): Promise<{ zscore: number; state: AnomalyState }> {
  const key = anomalyKey(metric);
  const raw = await redis.get<AnomalyState>(key);
  const state: AnomalyState = raw || { values: [], avg: 0, stddev: 0 };

  // Add new value to rolling window
  state.values.push(currentValue);
  if (state.values.length > ANOMALY_WINDOW) {
    state.values = state.values.slice(-ANOMALY_WINDOW);
  }

  // Compute mean and stddev
  const n = state.values.length;
  if (n < 2) {
    state.avg = currentValue;
    state.stddev = 0;
    await redis.set(key, JSON.stringify(state));
    return { zscore: 0, state };
  }

  const sum = state.values.reduce((a, b) => a + b, 0);
  state.avg = sum / n;

  const variance = state.values.reduce((acc, v) => acc + Math.pow(v - state.avg, 2), 0) / (n - 1);
  state.stddev = Math.sqrt(variance);

  // Z-score
  const zscore = state.stddev === 0 ? 0 : (currentValue - state.avg) / state.stddev;

  await redis.set(key, JSON.stringify(state));
  return { zscore, state };
}

// ============ RULE EVALUATION ============

/**
 * Evaluate a single condition against current metric values.
 * Returns true if the condition is met.
 */
function evaluateCondition(
  rule: AlertRule,
  metrics: MetricValues,
  prevValues: Record<string, number>
): boolean {
  const currentValue = metrics[rule.metric];

  switch (rule.op) {
    case '>':
      return currentValue > rule.value;
    case '<':
      return currentValue < rule.value;
    case '>=':
      return currentValue >= rule.value;
    case '<=':
      return currentValue <= rule.value;
    case '==':
      return Math.abs(currentValue - rule.value) < 0.0001;
    case 'crosses_above': {
      const prev = prevValues[`${rule.id}:${rule.metric}`] ?? currentValue;
      return prev <= rule.value && currentValue > rule.value;
    }
    case 'crosses_below': {
      const prev = prevValues[`${rule.id}:${rule.metric}`] ?? currentValue;
      return prev >= rule.value && currentValue < rule.value;
    }
    default:
      return false;
  }
}

/**
 * Evaluate all rules against current market conditions.
 * Returns summary of triggered alerts.
 */
export async function evaluateRules(): Promise<{
  evaluated: number;
  triggered: number;
  errors: string[];
  details: Array<{
    rule_id: string;
    userId: string;
    metric: string;
    triggered: boolean;
    delivered: boolean;
    error?: string;
  }>;
}> {
  const redis = getRedis();
  const errors: string[] = [];
  const details: Array<{
    rule_id: string;
    userId: string;
    metric: string;
    triggered: boolean;
    delivered: boolean;
    error?: string;
  }> = [];

  let totalEvaluated = 0;
  let totalTriggered = 0;

  try {
    // Fetch current metric values
    const metrics = await fetchMetricValues();

    // Get all user keys that have alert rules
    let userKeys: string[] = [];
    try {
      const cursor = await redis.scan(0, { match: `${RULES_KEY_PREFIX}*`, count: 100 });
      userKeys = cursor[1] || [];
    } catch {
      // scan not available, try alternative approach
      return { evaluated: 0, triggered: 0, errors: ['Redis scan unavailable'], details };
    }

    for (const userKey of userKeys) {
      const userId = userKey.replace(RULES_KEY_PREFIX, '');
      const rules = await listRules(userId);

      // Load previous values for crosses detection
      const prevValues: Record<string, number> = {};
      for (const rule of rules) {
        const prevRaw = await redis.get<string>(prevKey(userId, rule.id));
        if (prevRaw) {
          prevValues[`${rule.id}:${rule.metric}`] = parseFloat(prevRaw);
        }
      }

      for (const rule of rules) {
        if (!rule.enabled) continue;
        totalEvaluated++;

        let triggered = false;

        try {
          switch (rule.type) {
            case 'threshold':
              triggered = evaluateCondition(rule, metrics, prevValues);
              break;

            case 'compound':
              if (!rule.conditions || !rule.operator) break;
              {
                const results = rule.conditions.map((cond) =>
                  evaluateCondition(cond, metrics, prevValues)
                );
                triggered = rule.operator === 'and'
                  ? results.every(Boolean)
                  : results.some(Boolean);
              }
              break;

            case 'anomaly': {
              const currentVal = metrics[rule.metric];
              const threshold = rule.zscore_threshold || 2.0;
              const { zscore } = await updateAnomaly(redis, rule.metric, currentVal);
              triggered = Math.abs(zscore) > threshold;
              break;
            }

            case 'scheduled':
              // Scheduled rules: evaluate if cron matches current time
              if (rule.cron) {
                triggered = evaluateCron(rule.cron);
              }
              break;
          }

          if (triggered) {
            // Fire alert
            const delivered = await fireAlert(rule, {
              rule_id: rule.id,
              metric: rule.metric,
              value: metrics[rule.metric],
              threshold: rule.value,
              op: rule.op,
              timestamp: new Date().toISOString(),
              metrics_snapshot: metrics,
            });

            // Update last_triggered
            rule.last_triggered = new Date().toISOString();
            // Persist updated rule
            const updatedRules = rules.map((r) => (r.id === rule.id ? rule : r));
            await redis.set(rulesKey(userId), JSON.stringify(updatedRules));

            // Store history event
            await storeHistoryEvent(userId, {
              id: generateId(),
              rule_id: rule.id,
              rule_name: `${rule.type}:${rule.metric} ${rule.op} ${rule.value}`,
              userId,
              metric: rule.metric,
              value: metrics[rule.metric],
              threshold: rule.value,
              op: rule.op,
              message: `Alert triggered: ${rule.metric} = ${metrics[rule.metric]} (${rule.op} ${rule.value})`,
              delivered_via: rule.delivery.type,
              delivered_successfully: delivered,
              timestamp: new Date().toISOString(),
            });

            totalTriggered++;
          }

          // Update previous value for crosses detection
          await redis.set(
            prevKey(userId, rule.id),
            String(metrics[rule.metric])
          );
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          errors.push(`Rule ${rule.id}: ${errMsg}`);
          details.push({
            rule_id: rule.id,
            userId,
            metric: rule.metric,
            triggered: false,
            delivered: false,
            error: errMsg,
          });
        }

        details.push({
          rule_id: rule.id,
          userId,
          metric: rule.metric,
          triggered,
          delivered: triggered, // delivered is set in fireAlert
        });
      }
    }
  } catch (err) {
    errors.push(`Evaluation failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  return {
    evaluated: totalEvaluated,
    triggered: totalTriggered,
    errors,
    details,
  };
}

// ============ CRON PARSER ============

/**
 * Simple cron expression parser (supports: minute hour day-of-month month day-of-week)
 * Returns true if current time matches the cron expression.
 */
function evaluateCron(expr: string): boolean {
  const now = new Date();
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;

  const [minExpr, hourExpr, domExpr, monthExpr, dowExpr] = parts;

  const checkField = (field: string, value: number, min: number, max: number): boolean => {
    if (field === '*') return true;
    // Handle ranges like 1-5
    if (field.includes('-')) {
      const [a, b] = field.split('-').map(Number);
      return value >= a && value <= b;
    }
    // Handle step like */5
    if (field.startsWith('*/')) {
      const step = parseInt(field.slice(2));
      return value % step === 0;
    }
    // Handle comma-separated values
    if (field.includes(',')) {
      return field.split(',').map(Number).includes(value);
    }
    return parseInt(field) === value;
  };

  return (
    checkField(minExpr, now.getMinutes(), 0, 59) &&
    checkField(hourExpr, now.getHours(), 0, 23) &&
    checkField(domExpr, now.getDate(), 1, 31) &&
    checkField(monthExpr, now.getMonth() + 1, 1, 12) &&
    checkField(dowExpr, now.getDay(), 0, 6)
  );
}

// ============ DELIVERY ============

/**
 * Fire an alert — deliver via webhook or Telegram.
 */
export async function fireAlert(
  rule: AlertRule,
  event: Record<string, unknown>
): Promise<boolean> {
  try {
    if (rule.delivery.type === 'webhook') {
      return await deliverWebhook(rule, event);
    } else if (rule.delivery.type === 'telegram') {
      return await deliverTelegram(rule, event);
    }
  } catch (err) {
    console.error(`[AlertRules] Delivery failed for rule ${rule.id}:`, err);
  }
  return false;
}

/**
 * Deliver alert via webhook with HMAC signature.
 */
async function deliverWebhook(
  rule: AlertRule,
  event: Record<string, unknown>
): Promise<boolean> {
  const delivery = rule.delivery as AlertDeliveryWebhook;
  const MAX_ATTEMPTS = 3;
  const TIMEOUT_MS = 10_000;

  const payload = {
    event: 'alert_triggered',
    rule_id: rule.id,
    rule_type: rule.type,
    timestamp: new Date().toISOString(),
    data: event,
    signature: '',
  };

  const payloadJson = JSON.stringify(payload);
  payload.signature = signPayload(payloadJson, delivery.secret);
  const signedJson = JSON.stringify(payload);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(delivery.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Rule-Id': rule.id,
          'X-Alert-Signature': payload.signature,
          'X-Alert-Event': 'alert_triggered',
          'X-Alert-Delivery': `${rule.id}_${Date.now()}`,
        },
        body: signedJson,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) return true;
    } catch {
      // Retry with backoff
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  return false;
}

/**
 * Deliver alert via Telegram Bot API DM.
 */
async function deliverTelegram(
  rule: AlertRule,
  event: Record<string, unknown>
): Promise<boolean> {
  const delivery = rule.delivery as AlertDeliveryTelegram;
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    console.warn('[AlertRules] TELEGRAM_BOT_TOKEN not configured');
    return false;
  }

  const message = formatTelegramMessage(rule, event);

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: delivery.userId,
          text: message,
          parse_mode: 'Markdown',
        }),
        signal: AbortSignal.timeout(10_000),
      }
    );

    return res.ok;
  } catch (err) {
    console.error(`[AlertRules] Telegram DM failed:`, err);
    return false;
  }
}

/**
 * Format alert message for Telegram.
 */
function formatTelegramMessage(
  rule: AlertRule,
  event: Record<string, unknown>
): string {
  const lines = [
    `🔔 *BTCFi Alert*`,
    ``,
    `*Rule:* ${rule.type} — ${rule.metric}`,
    `*Condition:* ${rule.metric} ${rule.op} ${rule.value}`,
    `*Current Value:* ${(event.metrics_snapshot as Record<string, number>)?.[rule.metric] ?? event.value ?? 'N/A'}`,
    `*Timestamp:* ${event.timestamp || new Date().toISOString()}`,
  ];

  if (rule.type === 'anomaly') {
    lines.push(`*Type:* Anomaly (z-score > ${rule.zscore_threshold || 2.0})`);
  }

  return lines.join('\n');
}

// ============ HISTORY ============

/**
 * Store an alert event in the user's history (max 100 entries, sorted by timestamp).
 */
async function storeHistoryEvent(userId: string, event: AlertEvent): Promise<void> {
  const redis = getRedis();
  const key = historyKey(userId);

  const existing = await redis.get<AlertEvent[]>(key);
  const history: AlertEvent[] = existing || [];

  history.push(event);

  // Sort by timestamp descending (newest first) and cap at MAX_HISTORY
  history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  if (history.length > MAX_HISTORY) {
    history.length = MAX_HISTORY;
  }

  await redis.set(key, JSON.stringify(history));
}

/**
 * Get recent alert history for a user.
 */
export async function getAlertHistory(
  userId: string,
  limit = 50
): Promise<AlertEvent[]> {
  const redis = getRedis();
  const key = historyKey(userId);
  const existing = await redis.get<AlertEvent[]>(key);
  const history: AlertEvent[] = existing || [];
  return history.slice(0, limit);
}
