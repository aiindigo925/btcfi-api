/**
 * Telegram Bot Features (All Free)
 *
 * Portfolio tracking, digest, alerts — all backed by Upstash Redis.
 * No tier restrictions. Rate limit set to generous default.
 *
 * Redis schema:
 *   tg:portfolio:{userId}   → hash: address → label
 *   tg:digest:{userId}      → "on" | "off"
 *   tg:alerts:{userId}      → JSON array of alert objects
 */

import { getRedis } from './redis';

// ── Constants ──────────────────────────────────────────────────────────────

export const MAX_PORTFOLIO = 50;
export const MAX_ALERTS = 20;
export const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

export type Tier = 'free' | 'pro'; // kept for backwards compat, unused

export interface UserSubscription {
  tier: Tier;
  expires_at: string;
  payment_ref: string;
}

export interface Alert {
  id: string;
  type: 'whale' | 'price' | 'fee';
  threshold: string;
  created: number;
}

// ── Subscription Management (stub — always free) ───────────────────────────

export async function getUserTier(_userId: number): Promise<Tier> {
  return 'free';
}

export async function getUserSubscription(_userId: number): Promise<UserSubscription> {
  return { tier: 'free', expires_at: '', payment_ref: '' };
}

export async function setUserTier(
  _userId: number,
  _tier: Tier,
  _expiresAt?: string,
  _paymentRef?: string,
): Promise<void> {
  // No-op — everything is free
}

// ── Portfolio Management ───────────────────────────────────────────────────

export async function portfolioCount(userId: number): Promise<number> {
  try {
    const redis = getRedis();
    const entries = (await redis.hgetall(`tg:portfolio:${userId}`)) as Record<string, string>;
    return entries ? Object.keys(entries).length : 0;
  } catch {
    return 0;
  }
}

export async function portfolioAdd(
  userId: number,
  address: string,
  label: string,
): Promise<{ ok: boolean; message: string }> {
  const count = await portfolioCount(userId);
  if (count >= MAX_PORTFOLIO) {
    return { ok: false, message: `Portfolio full (${count}/${MAX_PORTFOLIO}).` };
  }
  try {
    const redis = getRedis();
    await redis.hset(`tg:portfolio:${userId}`, { [address]: label || address.slice(0, 8) });
    return { ok: true, message: `Added ${address.slice(0, 12)}... as "${label || address.slice(0, 8)}"` };
  } catch {
    return { ok: false, message: 'Failed to save address.' };
  }
}

export async function portfolioRemove(
  userId: number,
  address: string,
): Promise<{ ok: boolean; message: string }> {
  try {
    const redis = getRedis();
    const existed = await redis.hdel(`tg:portfolio:${userId}`, address);
    if (existed) return { ok: true, message: `Removed ${address.slice(0, 12)}...` };
    return { ok: false, message: 'Address not found in portfolio.' };
  } catch {
    return { ok: false, message: 'Failed to remove address.' };
  }
}

export async function portfolioList(
  userId: number,
): Promise<{ address: string; label: string }[]> {
  try {
    const redis = getRedis();
    const entries = (await redis.hgetall(`tg:portfolio:${userId}`)) as Record<string, string>;
    if (!entries) return [];
    return Object.entries(entries).map(([address, label]) => ({ address, label: String(label) }));
  } catch {
    return [];
  }
}

// ── Digest ─────────────────────────────────────────────────────────────────

export async function isDigestEnabled(userId: number): Promise<boolean> {
  try {
    const redis = getRedis();
    const val = await redis.get(`tg:digest:${userId}`);
    return val === 'on';
  } catch {
    return false;
  }
}

export async function setDigestEnabled(userId: number, enabled: boolean): Promise<void> {
  const redis = getRedis();
  await redis.set(`tg:digest:${userId}`, enabled ? 'on' : 'off', { ex: 7_776_000 });
}

// ── Alerts ─────────────────────────────────────────────────────────────────

export async function getAlertList(userId: number): Promise<Alert[]> {
  try {
    const redis = getRedis();
    const raw = await redis.get(`tg:user_alerts:${userId}`);
    if (!raw) return [];
    return JSON.parse(String(raw));
  } catch {
    return [];
  }
}

export async function addAlert(
  userId: number,
  type: Alert['type'],
  threshold: string,
): Promise<{ ok: boolean; message: string }> {
  const alerts = await getAlertList(userId);
  if (alerts.length >= MAX_ALERTS) {
    return { ok: false, message: `Alert limit reached (${alerts.length}/${MAX_ALERTS}).` };
  }
  const id = `${type}_${Date.now().toString(36)}`;
  const alert: Alert = { id, type, threshold, created: Date.now() };
  alerts.push(alert);
  const redis = getRedis();
  await redis.set(`tg:user_alerts:${userId}`, JSON.stringify(alerts), { ex: 7_776_000 });
  return { ok: true, message: `Alert created: ${id}` };
}

export async function removeAlert(
  userId: number,
  alertId: string,
): Promise<{ ok: boolean; message: string }> {
  const alerts = await getAlertList(userId);
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx === -1) return { ok: false, message: `Alert ${alertId} not found.` };
  alerts.splice(idx, 1);
  const redis = getRedis();
  await redis.set(`tg:user_alerts:${userId}`, JSON.stringify(alerts), { ex: 7_776_000 });
  return { ok: true, message: `Removed alert ${alertId}.` };
}

// ── Rate Limiting ──────────────────────────────────────────────────────────

/**
 * Per-user rate limit. Generous: 50 commands/hour for everyone.
 * Returns { allowed, remaining }.
 */
export async function checkPremiumRateLimit(
  userId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const max = 50;
    const redis = getRedis();
    const key = `tg:cmd:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    const remaining = Math.max(0, max - count);
    return { allowed: count <= max, remaining };
  } catch {
    return { allowed: true, remaining: 50 };
  }
}
