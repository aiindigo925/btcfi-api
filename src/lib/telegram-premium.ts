/**
 * Telegram Bot Premium Features
 *
 * Subscription management, portfolio tracking, digest, alerts, and tier-aware
 * rate limiting — all backed by Upstash Redis.
 *
 * Redis schema:
 *   tg:user:{userId}        → hash: tier, expires_at, payment_ref
 *   tg:portfolio:{userId}   → hash: address → label
 *   tg:digest:{userId}      → "on" | "off"
 *   tg:alerts:{userId}      → JSON array of alert objects
 *   tg:cmd:{userId}         → rate-limit counter (existing, tier-aware window)
 */

import { getRedis } from './redis';

// ── Constants ──────────────────────────────────────────────────────────────

export const FREE_MAX_PORTFOLIO = 10;
export const PRO_MAX_PORTFOLIO = 50;
export const FREE_MAX_ALERTS = 3;
export const PRO_MAX_ALERTS = 20;
export const FREE_RATE_LIMIT = 10;   // per hour
export const PRO_RATE_LIMIT = 50;    // per hour
export const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

export type Tier = 'free' | 'pro';

export interface UserSubscription {
  tier: Tier;
  expires_at: string; // ISO date or empty
  payment_ref: string;
}

export interface Alert {
  id: string;
  type: 'whale' | 'price' | 'fee';
  threshold: string;
  created: number; // epoch ms
}

// ── Subscription Management ────────────────────────────────────────────────

export async function getUserTier(userId: number): Promise<Tier> {
  try {
    const redis = getRedis();
    const tier = (await redis.hget(`tg:user:${userId}`, 'tier')) as string | null;
    if (tier === 'pro') {
      // Check expiry
      const expiresAt = (await redis.hget(`tg:user:${userId}`, 'expires_at')) as string | null;
      if (expiresAt && new Date(expiresAt).getTime() > Date.now()) {
        return 'pro';
      }
      // Expired — downgrade
      await redis.hset(`tg:user:${userId}`, { tier: 'free' });
      return 'free';
    }
    return 'free';
  } catch {
    return 'free'; // fail open
  }
}

export async function getUserSubscription(userId: number): Promise<UserSubscription> {
  try {
    const redis = getRedis();
    const data = (await redis.hgetall(`tg:user:${userId}`)) as Record<string, string>;
    return {
      tier: (data?.tier as Tier) || 'free',
      expires_at: data?.expires_at || '',
      payment_ref: data?.payment_ref || '',
    };
  } catch {
    return { tier: 'free', expires_at: '', payment_ref: '' };
  }
}

export async function setUserTier(
  userId: number,
  tier: Tier,
  expiresAt?: string,
  paymentRef?: string,
): Promise<void> {
  const redis = getRedis();
  const fields: Record<string, string> = { tier };
  if (expiresAt) fields.expires_at = expiresAt;
  if (paymentRef) fields.payment_ref = paymentRef;
  await redis.hset(`tg:user:${userId}`, fields);
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
  const tier = await getUserTier(userId);
  const max = tier === 'pro' ? PRO_MAX_PORTFOLIO : FREE_MAX_PORTFOLIO;
  const count = await portfolioCount(userId);

  if (count >= max) {
    return {
      ok: false,
      message: `Portfolio full (${count}/${max}). ${tier === 'free' ? 'Upgrade to Pro for 50 addresses.' : ''}`,
    };
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
    if (existed) {
      return { ok: true, message: `Removed ${address.slice(0, 12)}...` };
    }
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
    return Object.entries(entries).map(([address, label]) => ({
      address,
      label: String(label),
    }));
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

// ── Advanced Alerts ────────────────────────────────────────────────────────

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
  const tier = await getUserTier(userId);
  const max = tier === 'pro' ? PRO_MAX_ALERTS : FREE_MAX_ALERTS;
  const alerts = await getAlertList(userId);

  if (alerts.length >= max) {
    return {
      ok: false,
      message: `Alert limit reached (${alerts.length}/${max}). ${tier === 'free' ? 'Upgrade to Pro for 20 alerts.' : ''}`,
    };
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
  if (idx === -1) {
    return { ok: false, message: `Alert ${alertId} not found.` };
  }
  alerts.splice(idx, 1);
  const redis = getRedis();
  await redis.set(`tg:user_alerts:${userId}`, JSON.stringify(alerts), { ex: 7_776_000 });
  return { ok: true, message: `Removed alert ${alertId}.` };
}

// ── Tier-Aware Rate Limiting ───────────────────────────────────────────────

/**
 * Check per-user rate limit. Free: 10/hour, Pro: 50/hour.
 * Returns { allowed, remaining }.
 */
export async function checkPremiumRateLimit(
  userId: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const tier = await getUserTier(userId);
    const max = tier === 'pro' ? PRO_RATE_LIMIT : FREE_RATE_LIMIT;
    const redis = getRedis();
    const key = `tg:cmd:${userId}`;
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_LIMIT_WINDOW);
    }
    const remaining = Math.max(0, max - count);
    return { allowed: count <= max, remaining };
  } catch {
    // Fail open
    return { allowed: true, remaining: 50 };
  }
}
