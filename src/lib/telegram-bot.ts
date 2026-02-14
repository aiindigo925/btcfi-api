/**
 * BTCFi Telegram Bot — grammY
 *
 * Commands: /price, /fees, /mempool, /address, /tx, /whale, /risk, /network, /help
 * Inline mode: @BTC_Fi_Bot <address>
 * Channel posting: @BTCFi_Whales whale alerts with buy/sell signals (MP5 Phase 1)
 *
 * Lazy-initialized: grammY throws on empty token, so Bot is only
 * created when TELEGRAM_BOT_TOKEN is set and first update arrives.
 */

import { Bot } from 'grammy';

const API = process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';
const WHALE_CHANNEL_ID = process.env.WHALE_CHANNEL_ID || '';

// Footer for DM bot responses
const FOOTER =
  '\n\n\u2014\n' +
  '_\ud83d\udca1 Full API:_ [btcfi\\.aiindigo\\.com](https://btcfi.aiindigo.com) _\\|_ `npm i @aiindigo/btcfi`\n' +
  '[AI Indigo](https://aiindigo.com) _\\|_ [FutureTools AI](https://futuretoolsai.com) _\\|_ [OpenClaw Terrace](https://openclawterrace.com)';

// Footer for channel posts
const CH_FOOTER =
  '\n\n\u2014\n' +
  '\ud83d\udd17 [btcfi\\.aiindigo\\.com](https://btcfi.aiindigo.com) _\\|_ [@BTC\\_Fi\\_Bot](https://t.me/BTC_Fi_Bot) _\\|_ Free for humans';

// Lazy singleton
let _bot: Bot | null = null;
let _initialized = false;

async function getBot(): Promise<Bot> {
  if (!_bot) {
    if (!TOKEN) throw new Error('TELEGRAM_BOT_TOKEN not set');
    _bot = new Bot(TOKEN);
    registerCommands(_bot);
  }
  if (!_initialized) {
    await _bot.init();
    _initialized = true;
  }
  return _bot;
}

/** Export for webhook route */
export const bot = {
  handleUpdate: async (update: any) => {
    const b = await getBot();
    return b.handleUpdate(update);
  },
};

// ============ WHALE CHANNEL POSTING (MP5 Phase 1) ============

export async function postWhaleToChannel(whale: {
  txid: string;
  totalValueBtc: string;
  totalValueUsd: string;
  fee: number;
  feeRate: string;
  inputs: number;
  outputs: number;
  signal?: 'buy' | 'sell' | 'transfer';
  signalReason?: string;
}): Promise<void> {
  if (!WHALE_CHANNEL_ID || !TOKEN) return;
  const b = await getBot();

  const btc = esc(whale.totalValueBtc);
  const usd = esc(parseFloat(whale.totalValueUsd).toLocaleString());
  const txShort = esc(whale.txid.slice(0, 16));
  const fr = esc(whale.feeRate);
  const sig = whale.signal || 'transfer';

  // Scale emoji count by BTC value:
  // 10-50 BTC = 1, 50-100 = 2, 100-250 = 3, 250-500 = 4, 500-1000 = 5,
  // 1000-2500 = 6, 2500-5000 = 7, 5000-10000 = 8, 10000-25000 = 9, 25000+ = 10
  const btcVal = parseFloat(whale.totalValueBtc) || 0;
  const scale = btcVal >= 25000 ? 10 : btcVal >= 10000 ? 9 : btcVal >= 5000 ? 8
    : btcVal >= 2500 ? 7 : btcVal >= 1000 ? 6 : btcVal >= 500 ? 5
    : btcVal >= 250 ? 4 : btcVal >= 100 ? 3 : btcVal >= 50 ? 2 : 1;

  // Signal-based header with scaled emojis
  let header: string;
  if (sig === 'buy') {
    const arrows = '\ud83d\udfe2'.repeat(scale);
    header = arrows + ' *WHALE BUY* ' + arrows;
  } else {
    const arrows = '\ud83d\udd34'.repeat(scale);
    header = arrows + ' *WHALE SELL* ' + arrows;
  }

  // Signal reason line
  let signalLine = '';
  if (sig !== 'transfer' && whale.signalReason) {
    signalLine = '\ud83d\udcca _' + esc(whale.signalReason) + '_\n';
  }

  // I/O line (only if we have data)
  let ioLine = '';
  if (whale.inputs > 0 || whale.outputs > 0) {
    ioLine = '\ud83d\udce5 Inputs: ' + whale.inputs + ' \u00b7 \ud83d\udce4 Outputs: ' + whale.outputs + '\n';
  }

  const msg = header + '\n\n'
    + '\ud83d\udcb0 ' + btc + ' BTC \\(\\$' + usd + '\\)\n'
    + '\ud83d\udcc4 TX: `' + txShort + '\\.\\.\\.' + '`\n'
    + '\u26fd Fee: ' + fr + '\n'
    + ioLine
    + signalLine
    + CH_FOOTER;

  await b.api.sendMessage(WHALE_CHANNEL_ID, msg, {
    parse_mode: 'MarkdownV2',
    link_preview_options: { is_disabled: true },
  });
}

// ============ HELPERS ============

async function api(path: string): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (INTERNAL_KEY) headers['X-Internal-Key'] = INTERNAL_KEY;
  const res = await fetch(`${API}${path}`, {
    headers,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function esc(s: string): string {
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

function looksLikeBtcAddress(s: string): boolean {
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(s);
}

function looksLikeTxid(s: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(s);
}

// ============ COMMAND REGISTRATION ============

function registerCommands(b: Bot): void {
  b.command('start', (ctx) => ctx.reply(
    '\u20bf *BTCFi Bot* \u2014 Bitcoin Intelligence\n\n'
    + '/price \u2014 BTC price\n'
    + '/fees \u2014 Fee estimates\n'
    + '/mempool \u2014 Mempool status\n'
    + '/address `<addr>` \u2014 Address info\n'
    + '/tx `<txid>` \u2014 Transaction details\n'
    + '/whale \u2014 Recent whale movements\n'
    + '/risk `<addr>` \u2014 Address risk score\n'
    + '/network \u2014 Network health\n'
    + '/help \u2014 This message\n\n'
    + '_Powered by_ [btcfi\\.aiindigo\\.com](https://btcfi.aiindigo.com)',
    { parse_mode: 'MarkdownV2' }
  ));

  b.command('help', (ctx) => ctx.reply(
    '\u20bf *BTCFi Commands*\n\n'
    + '`/price` \u2014 Live BTC price\n'
    + '`/fees` \u2014 Fee recommendations\n'
    + '`/mempool` \u2014 Mempool summary\n'
    + '`/address bc1q...` \u2014 Balance & stats\n'
    + '`/tx abc123...` \u2014 TX details\n'
    + '`/whale` \u2014 Whale alert feed\n'
    + '`/risk bc1q...` \u2014 Risk analysis\n'
    + '`/network` \u2014 Network health',
    { parse_mode: 'MarkdownV2' }
  ));

  b.command('price', async (ctx) => {
    try {
      const data = await api('/api/v1/fees');
      const p = data.price || {};
      const usd = esc(Math.round(p.btcUsd || 0).toLocaleString());
      const eur = esc(Math.round(p.btcEur || 0).toLocaleString());
      await ctx.reply(
        '\u20bf *Bitcoin Price*\n\n'
        + '\ud83d\udcb5 USD: \\$' + usd + '\n'
        + '\ud83d\udcb6 EUR: \u20ac' + eur + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('\u274c Failed to fetch price'); }
  });

  b.command('fees', async (ctx) => {
    try {
      const data = await api('/api/v1/fees');
      const r = data.fees?.recommended || {};
      const e = data.estimate || {};
      const fast = e.fastest?.usd ? ' \\(' + esc(e.fastest.usd) + '\\)' : '';
      const med = e.medium?.usd ? ' \\(' + esc(e.medium.usd) + '\\)' : '';
      const slow = e.slow?.usd ? ' \\(' + esc(e.slow.usd) + '\\)' : '';
      await ctx.reply(
        '\u26fd *Fee Estimates*\n\n'
        + '\ud83d\ude80 Fast: ' + (r.fastestFee || '\u2014') + ' sat/vB' + fast + '\n'
        + '\u23f1 Medium: ' + (r.halfHourFee || '\u2014') + ' sat/vB' + med + '\n'
        + '\ud83d\udc0c Slow: ' + (r.hourFee || '\u2014') + ' sat/vB' + slow + '\n'
        + '\ud83d\udccf Economy: ' + (r.economyFee || '\u2014') + ' sat/vB' + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('\u274c Failed to fetch fees'); }
  });

  b.command('mempool', async (ctx) => {
    try {
      const data = await api('/api/v1/mempool');
      const m = data.mempool || {};
      await ctx.reply(
        '\ud83c\udfca *Mempool*\n\n'
        + '\ud83d\udcca Transactions: ' + esc((m.count || 0).toLocaleString()) + '\n'
        + '\ud83d\udcbe Size: ' + esc(m.vsizeMB || '\u2014') + ' MB\n'
        + '\ud83d\udcb0 Total fees: ' + esc(m.totalFeeBTC || '\u2014') + ' BTC' + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('\u274c Failed to fetch mempool'); }
  });

  b.command('address', async (ctx) => {
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /address <bitcoin_address>\nExample: /address bc1q...');
    }
    try {
      const data = await api('/api/v1/address/' + encodeURIComponent(addr));
      const bal = data.balance?.confirmed || {};
      const s = data.stats || {};
      await ctx.reply(
        '\ud83d\udccd *Address*\n\n'
        + '`' + esc(addr.slice(0, 12)) + '\\.\\.\\.' + esc(addr.slice(-6)) + '`\n\n'
        + '\ud83d\udcb0 Balance: ' + esc(bal.btc || '0') + ' BTC \\(\\$' + esc(bal.usd || '0') + '\\)\n'
        + '\ud83d\udcca Transactions: ' + (s.txCount || 0) + '\n'
        + '\ud83d\udce5 Funded: ' + (s.fundedTxos || 0) + ' \u00b7 \ud83d\udce4 Spent: ' + (s.spentTxos || 0) + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('\u274c Address not found or invalid'); }
  });

  b.command('tx', async (ctx) => {
    const txid = ctx.match?.trim();
    if (!txid || !looksLikeTxid(txid)) {
      return ctx.reply('Usage: /tx <transaction_id>\n(64 hex characters)');
    }
    try {
      const data = await api('/api/v1/tx/' + encodeURIComponent(txid));
      const tx = data.transaction || {};
      const st = tx.status || {};
      const confirmed = st.confirmed ? '\u2705 Confirmed' : '\u23f3 Pending';
      let msg = '\ud83d\udcc4 *Transaction*\n\n'
        + '`' + esc(txid.slice(0, 16)) + '\\.\\.\\.' + '`\n\n'
        + esc(confirmed) + '\n';
      if (st.blockHeight) msg += '\ud83d\udce6 Block: ' + st.blockHeight + '\n';
      if (st.confirmations) msg += '\ud83d\udd22 Confirmations: ' + st.confirmations + '\n';
      msg += '\ud83d\udccf Size: ' + (tx.size || '\u2014') + ' bytes\n'
        + '\u2696\ufe0f Weight: ' + (tx.weight || '\u2014') + '\n'
        + '\ud83d\udcb0 Fee: ' + esc(tx.fee?.sats ? tx.fee.sats + ' sats (' + (tx.fee.rate || '\u2014') + ')' : '\u2014') + FOOTER;
      await ctx.reply(msg, { parse_mode: 'MarkdownV2' });
    } catch { await ctx.reply('\u274c Transaction not found'); }
  });

  b.command('whale', async (ctx) => {
    try {
      const data = await api('/api/v1/intelligence/whales');
      const whales = data.data?.transactions || [];
      if (!whales.length) return ctx.reply('\ud83d\udc0b No recent whale activity');
      const lines = whales.slice(0, 5).map((w: any) => {
        const sigEmoji = w.signal === 'buy' ? '\ud83d\udfe2' : w.signal === 'sell' ? '\ud83d\udd34' : '\ud83d\udc0b';
        return sigEmoji + ' ' + esc(w.totalValueBtc || '?') + ' BTC \u2014 `' + esc((w.txid || '').slice(0, 12)) + '\\.\\.\\.' + '`';
      });
      await ctx.reply('\ud83d\udc0b *Recent Whales*\n\n' + lines.join('\n') + FOOTER, { parse_mode: 'MarkdownV2' });
    } catch { await ctx.reply('\u274c Failed to fetch whale data'); }
  });

  b.command('risk', async (ctx) => {
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /risk <bitcoin_address>');
    }
    try {
      const data = await api('/api/v1/intelligence/risk/' + encodeURIComponent(addr));
      const d = data.data || {};
      const score = d.riskScore || 0;
      const grade = d.riskGrade || '?';
      const emoji = score < 30 ? '\ud83d\udfe2' : score < 50 ? '\ud83d\udfe1' : '\ud83d\udd34';
      const bar = '\u2588'.repeat(Math.round(score / 10)) + '\u2591'.repeat(10 - Math.round(score / 10));
      await ctx.reply(
        emoji + ' *Risk Analysis*\n\n'
        + '`' + esc(addr.slice(0, 12)) + '\\.\\.\\.' + '`\n\n'
        + 'Score: ' + score + '/100 \\(Grade ' + esc(grade) + '\\)\n'
        + bar + '\n\n'
        + esc(d.summary || '') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('\u274c Risk analysis failed'); }
  });

  b.command('network', async (ctx) => {
    try {
      const data = await api('/api/v1/intelligence/network');
      const d = data.data || {};
      const c = d.congestion || {};
      const bp = d.blockProduction || {};
      const fm = d.feeMarket || {};
      const price = esc(Math.round(d.price?.usd || 0).toLocaleString());
      await ctx.reply(
        '\ud83c\udf10 *Network Health*\n\n'
        + '\ud83c\udfca Congestion: ' + esc(c.label || '\u2014') + ' \\(' + (c.level || 0) + '/10\\)\n'
        + '\u26a1 Hashrate trend: ' + esc(d.hashrateTrend || '\u2014') + '\n'
        + '\ud83d\udce6 Blocks/hour: ' + esc(bp.blocksPerHour || '\u2014') + '\n'
        + '\u23f1 Avg interval: ' + (bp.avgIntervalSec || '\u2014') + 's\n'
        + '\ud83d\ude80 Fast fee: ' + (fm.fastestFee || '\u2014') + ' sat/vB\n'
        + '\ud83d\udcb5 BTC: \\$' + price + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('\u274c Network health unavailable'); }
  });

  b.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    if (!query || !looksLikeBtcAddress(query)) return;
    try {
      const data = await api('/api/v1/address/' + encodeURIComponent(query));
      const bal = data.balance?.confirmed || {};
      await ctx.answerInlineQuery([{
        type: 'article',
        id: 'addr-' + query.slice(0, 8),
        title: (bal.btc || '0') + ' BTC',
        description: query.slice(0, 20) + '... \u2014 $' + (bal.usd || '0'),
        input_message_content: {
          message_text: '\u20bf ' + query
            + '\nBalance: ' + (bal.btc || '0') + ' BTC ($' + (bal.usd || '0') + ')'
            + '\nTxs: ' + (data.stats?.txCount || 0)
            + '\n\n\ud83d\udca1 btcfi.aiindigo.com | aiindigo.com | futuretoolsai.com | openclawterrace.com',
        },
      }]);
    } catch { /* ignore inline failures */ }
  });
}
