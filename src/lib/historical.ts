/**
 * Historical Data Replay — Time-series of cycle metrics.
 * Stores daily snapshots in Redis (auto-computed on first query).
 */
import { safeGet, safeSet } from './redis';
import { getMvrvMetrics, getSoprMetrics, getNuplMetrics } from './cycle-metrics';

const HISTORY_PREFIX = 'history:';
const SNAPSHOT_TTL = 2592000; // 30 days

export type MetricName = 'mvrv' | 'sopr' | 'nupl';

export interface HistoryPoint {
  date: string;
  value: number;
}

export interface HistoryResult {
  metric: MetricName;
  points: HistoryPoint[];
  days: number;
  timestamp: string;
}

/**
 * Take a snapshot of all metrics and store in Redis.
 */
async function takeSnapshot(): Promise<void> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    const [mvrv, sopr, nupl] = await Promise.all([
      getMvrvMetrics(),
      getSoprMetrics(),
      getNuplMetrics(),
    ]);

    const snapshot = {
      date: today,
      mvrv: mvrv.data.mvrv,
      zscore: mvrv.data.zscore,
      sopr: sopr.data.sopr,
      nupl: nupl.data.nupl,
    };

    // Store today's snapshot
    await safeSet(`${HISTORY_PREFIX}snapshot:${today}`, JSON.stringify(snapshot), SNAPSHOT_TTL);

    // Also maintain an index of all dates
    const indexRaw = await safeGet(`${HISTORY_PREFIX}dates`);
    const dates: string[] = indexRaw ? JSON.parse(indexRaw) : [];
    if (!dates.includes(today)) {
      dates.push(today);
      dates.sort();
      await safeSet(`${HISTORY_PREFIX}dates`, JSON.stringify(dates), SNAPSHOT_TTL);
    }
  } catch {
    // Snapshot failed — non-critical
  }
}

export async function getHistory(
  metric: MetricName,
  days: number = 90,
): Promise<HistoryResult> {
  // Check if today's snapshot exists, take one if not
  const today = new Date().toISOString().split('T')[0];
  const todayKey = `${HISTORY_PREFIX}snapshot:${today}`;
  const todayExists = await safeGet(todayKey);
  if (!todayExists) {
    await takeSnapshot();
  }

  // Get date index
  const indexRaw = await safeGet(`${HISTORY_PREFIX}dates`);
  const allDates: string[] = indexRaw ? JSON.parse(indexRaw) : [];

  // Filter to requested window
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const relevantDates = allDates.filter((d) => d >= cutoffStr);

  // Fetch snapshots for each date
  const points: HistoryPoint[] = [];
  for (const date of relevantDates) {
    try {
      const raw = await safeGet(`${HISTORY_PREFIX}snapshot:${date}`);
      if (raw) {
        const snapshot = JSON.parse(raw);
        let value = 0;
        switch (metric) {
          case 'mvrv':
            value = snapshot.mvrv;
            break;
          case 'sopr':
            value = snapshot.sopr;
            break;
          case 'nupl':
            value = snapshot.nupl;
            break;
          default:
            continue;
        }
        if (typeof value === 'number') {
          points.push({ date, value });
        }
      }
    } catch {
      // skip failed snapshot
    }
  }

  // If no historical data yet, create current point
  if (points.length === 0) {
    const [mvrv, sopr, nupl] = await Promise.all([
      getMvrvMetrics(),
      getSoprMetrics(),
      getNuplMetrics(),
    ]);

    let currentValue = 0;
    switch (metric) {
      case 'mvrv':
        currentValue = mvrv.data.mvrv;
        break;
      case 'sopr':
        currentValue = sopr.data.sopr;
        break;
      case 'nupl':
        currentValue = nupl.data.nupl;
        break;
    }
    points.push({ date: today, value: currentValue });
  }

  return {
    metric,
    points,
    days,
    timestamp: new Date().toISOString(),
  };
}
