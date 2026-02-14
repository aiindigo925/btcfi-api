/**
 * Watchlist Balance Check Cron — MP5 Phase 5
 * Runs every 10 min via Vercel Cron.
 * Checks balances for all watched addresses, DMs users on change.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAddressInfo } from '@/lib/bitcoin';
import {
  getAllWatchedAddresses,
  getWatchers,
  getStoredBalance,
  setStoredBalance,
  getAlerts,
} from '@/lib/watchlist';

const CRON_SECRET = process.env.CRON_SECRET || '';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

async function sendTelegramDM(chatId: string, text: string) {
  if (!TOKEN) return;
  await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'MarkdownV2',
      link_preview_options: { is_disabled: true },
    }),
  });
}

function esc(s: string): string {
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const addresses = await getAllWatchedAddresses();
    if (!addresses.length) {
      return NextResponse.json({ success: true, checked: 0, alerts: 0 });
    }

    let checked = 0;
    let alerts = 0;

    for (const addr of addresses.slice(0, 50)) { // Cap at 50 per run
      try {
        const info = await getAddressInfo(addr);
        const currentSats = String(info?.chain_stats?.funded_txo_sum - info?.chain_stats?.spent_txo_sum || 0);
        const previousSats = await getStoredBalance(addr);

        await setStoredBalance(addr, currentSats);
        checked++;

        // Skip if first check (no previous balance) or no change
        if (!previousSats || currentSats === previousSats) continue;

        // Balance changed — notify watchers
        const diff = BigInt(currentSats) - BigInt(previousSats);
        const diffBtc = Number(diff) / 1e8;
        const sign = diffBtc >= 0 ? '+' : '';
        const emoji = diffBtc >= 0 ? '📈' : '📉';

        const watchers = await getWatchers(addr);
        for (const chatId of watchers) {
          const enabled = await getAlerts(chatId);
          if (!enabled) continue;

          const short = esc(addr.slice(0, 12));
          const msg = `${emoji} *Balance Changed*\n\n`
            + `\`${short}\\.\\.\\.\`\n`
            + `${sign}${esc(diffBtc.toFixed(8))} BTC\n`
            + `New: ${esc((Number(currentSats) / 1e8).toFixed(8))} BTC\n\n`
            + `_Use /watchlist to see all_`;

          try {
            await sendTelegramDM(chatId, msg);
            alerts++;
          } catch {}
        }

        // Small delay between addresses
        await new Promise(r => setTimeout(r, 200));
      } catch {
        // Skip individual address errors
      }
    }

    return NextResponse.json({ success: true, checked, alerts });
  } catch (err) {
    console.error('Watchlist cron error:', err);
    return NextResponse.json({ success: false, error: 'Watchlist cron failed' }, { status: 500 });
  }
}
