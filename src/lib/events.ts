/**
 * BTCFi Event System — MP3 Task 20.1
 * Server-Sent Events for real-time Bitcoin data.
 * Polls mempool.space and emits typed events.
 */

import { getRecommendedFees, getMempoolSummary, getMempoolRecent, getBlockHeight } from './bitcoin';

// ============ TYPES ============

export type EventType = 'new_block' | 'whale_tx' | 'fee_change' | 'mempool_surge' | 'heartbeat';

export interface BTCFiEvent {
  type: EventType;
  data: Record<string, unknown>;
  timestamp: string;
}

// ============ STATE ============

let lastBlockHeight = 0;
let lastFastFee = 0;
let lastMempoolCount = 0;

// ============ EVENT GENERATORS ============

/**
 * Poll for new events. Returns array of events since last poll.
 */
export async function pollEvents(): Promise<BTCFiEvent[]> {
  const events: BTCFiEvent[] = [];
  const now = new Date().toISOString();

  try {
    const [height, fees, mempool] = await Promise.all([
      getBlockHeight(),
      getRecommendedFees(),
      getMempoolSummary(),
    ]);

    // New block detected
    if (lastBlockHeight > 0 && height > lastBlockHeight) {
      events.push({
        type: 'new_block',
        data: { height, previousHeight: lastBlockHeight, blocksSkipped: height - lastBlockHeight },
        timestamp: now,
      });
    }
    lastBlockHeight = height;

    // Fee change > 20%
    if (lastFastFee > 0) {
      const change = Math.abs(fees.fastestFee - lastFastFee) / lastFastFee;
      if (change > 0.2) {
        events.push({
          type: 'fee_change',
          data: {
            previous: lastFastFee,
            current: fees.fastestFee,
            changePercent: (change * 100).toFixed(1),
            direction: fees.fastestFee > lastFastFee ? 'up' : 'down',
            allFees: fees,
          },
          timestamp: now,
        });
      }
    }
    lastFastFee = fees.fastestFee;

    // Mempool surge (>20% increase)
    if (lastMempoolCount > 0) {
      const change = (mempool.count - lastMempoolCount) / lastMempoolCount;
      if (change > 0.2) {
        events.push({
          type: 'mempool_surge',
          data: {
            previous: lastMempoolCount,
            current: mempool.count,
            changePercent: (change * 100).toFixed(1),
            vsizeMB: (mempool.vsize / 1_000_000).toFixed(2),
          },
          timestamp: now,
        });
      }
    }
    lastMempoolCount = mempool.count;
  } catch (error) {
    // Silent — don't crash stream on poll failure
  }

  return events;
}

/**
 * Poll for whale transactions above a BTC threshold.
 */
export async function pollWhaleEvents(minBtc: number = 100): Promise<BTCFiEvent[]> {
  const events: BTCFiEvent[] = [];
  const now = new Date().toISOString();

  try {
    const recent = await getMempoolRecent();
    const minSats = minBtc * 1e8;

    for (const tx of recent.slice(0, 20)) {
      const totalOut = ((tx as any).vout || []).reduce((s: number, v: any) => s + (v.value || 0), 0);
      if (totalOut >= minSats) {
        events.push({
          type: 'whale_tx',
          data: {
            txid: tx.txid,
            valueSats: totalOut,
            valueBtc: (totalOut / 1e8).toFixed(8),
            fee: tx.fee,
            size: tx.size,
          },
          timestamp: now,
        });
      }
    }
  } catch {
    // Silent
  }

  return events;
}

/**
 * Format event as SSE string.
 */
export function formatSSE(event: BTCFiEvent): string {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

/**
 * Format heartbeat as SSE string.
 */
export function formatHeartbeat(): string {
  return `: heartbeat ${Date.now()}\n\n`;
}
