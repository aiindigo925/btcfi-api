/**
 * Alerts System — Price alerts, whale alerts, fee spike alerts.
 * Stored in Redis as JSON hash per user IP.
 */
import { getRedis, safeGet, safeSet } from './redis';
import { getBtcPrice } from './bitcoin';

export type AlertType = 'price_above' | 'price_below' | 'whale' | 'fee_spike';

export interface Alert {
  id: string;
  type: AlertType;
  threshold: number;
  target?: string; // address for whale alerts
  ip: string;
  createdAt: string;
  triggered: boolean;
  triggeredAt?: string;
}

export interface AlertConfig {
  type: AlertType;
  threshold: number;
  target?: string;
}

function getAlertKey(ip: string): string {
  return `alerts:${ip}`;
}

export async function createAlert(ip: string, config: AlertConfig): Promise<Alert> {
  const redis = getRedis();
  const key = getAlertKey(ip);

  const alert: Alert = {
    id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: config.type,
    threshold: config.threshold,
    target: config.target,
    ip,
    createdAt: new Date().toISOString(),
    triggered: false,
  };

  // Get existing alerts for this IP
  const existing = await safeGet(key);
  const alerts: Alert[] = existing ? JSON.parse(existing) : [];
  alerts.push(alert);

  // Store as JSON string in Redis (TTL: 24 hours)
  await safeSet(key, JSON.stringify(alerts), 86400);

  return alert;
}

export async function listAlerts(ip: string): Promise<Alert[]> {
  const existing = await safeGet(getAlertKey(ip));
  return existing ? JSON.parse(existing) : [];
}

export async function deleteAlert(ip: string, alertId: string): Promise<boolean> {
  const key = getAlertKey(ip);
  const existing = await safeGet(key);
  if (!existing) return false;

  const alerts: Alert[] = JSON.parse(existing);
  const filtered = alerts.filter((a) => a.id !== alertId);
  if (filtered.length === alerts.length) return false; // nothing removed

  await safeSet(key, JSON.stringify(filtered), 86400);
  return true;
}

export interface TriggeredAlert {
  alert: Alert;
  currentValue: number;
  message: string;
}

/**
 * Check all alerts for an IP against current conditions.
 * Returns list of newly triggered alerts.
 */
export async function checkAlerts(ip: string): Promise<TriggeredAlert[]> {
  const alerts = await listAlerts(ip);
  const triggered: TriggeredAlert[] = [];

  // Get current conditions
  const price = await getBtcPrice();
  const currentUsd = price.USD;

  for (const alert of alerts) {
    if (alert.triggered) continue; // already triggered

    let shouldTrigger = false;
    let message = '';

    switch (alert.type) {
      case 'price_above':
        if (currentUsd >= alert.threshold) {
          shouldTrigger = true;
          message = `BTC price $${currentUsd.toFixed(2)} crossed above $${alert.threshold}`;
        }
        break;
      case 'price_below':
        if (currentUsd <= alert.threshold) {
          shouldTrigger = true;
          message = `BTC price $${currentUsd.toFixed(2)} dropped below $${alert.threshold}`;
        }
        break;
      case 'whale':
        // Whale alerts are checked via cron, threshold = min BTC value
        // For now, return alert config for the cron to process
        shouldTrigger = false; // whale alerts trigger from mempool data
        break;
      case 'fee_spike':
        // Fee spike alerts checked against current fee rate
        // threshold = fee rate in sat/vB
        shouldTrigger = false; // fee alerts trigger from mempool data
        break;
    }

    if (shouldTrigger) {
      alert.triggered = true;
      alert.triggeredAt = new Date().toISOString();
      triggered.push({ alert, currentValue: currentUsd, message });
    }
  }

  // Update triggered state in Redis
  if (triggered.length > 0) {
    await safeSet(getAlertKey(ip), JSON.stringify(alerts), 86400);
  }

  return triggered;
}
