/**
 * BTCFi Telegram Bot — grammY
 *
 * Commands: /price, /fees, /mempool, /address, /tx, /whale, /risk, /network, /help
 * Inline mode: @BTCFiBot <address>
 *
 * Lazy-initialized: grammY throws on empty token, so Bot is only
 * created when TELEGRAM_BOT_TOKEN is set and first update arrives.
 */

import { Bot } from 'grammy';

const API = process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Lazy singleton — only created when token is set
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

// ============ HELPERS ============

async function api(path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

function esc(s: string): string {
  return String(s).replace(/[_*[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Basic Bitcoin address format check (bot-side, before hitting API) */
function looksLikeBtcAddress(s: string): boolean {
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(s);
}

/** Basic txid format check */
function looksLikeTxid(s: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(s);
}

// ============ COMMAND REGISTRATION ============

function registerCommands(b: Bot): void {
  b.command('start', (ctx) => ctx.reply(
    '₿ *BTCFi Bot* — Bitcoin Intelligence\n\n' +
    '/price — BTC price\n' +
    '/fees — Fee estimates\n' +
    '/mempool — Mempool status\n' +
    '/address `<addr>` — Address info\n' +
    '/tx `<txid>` — Transaction details\n' +
    '/whale — Recent whale movements\n' +
    '/risk `<addr>` — Address risk score\n' +
    '/network — Network health\n' +
    '/help — This message\n\n' +
    '_Powered by_ [btcfi\\.aiindigo\\.com](https://btcfi.aiindigo.com)',
    { parse_mode: 'MarkdownV2' }
  ));

  b.command('help', (ctx) => ctx.reply(
    '₿ *BTCFi Commands*\n\n' +
    '`/price` — Live BTC price\n' +
    '`/fees` — Fee recommendations\n' +
    '`/mempool` — Mempool summary\n' +
    '`/address bc1q...` — Balance & stats\n' +
    '`/tx abc123...` — TX details\n' +
    '`/whale` — Whale alert feed\n' +
    '`/risk bc1q...` — Risk analysis\n' +
    '`/network` — Network health',
    { parse_mode: 'MarkdownV2' }
  ));

  b.command('price', async (ctx) => {
    try {
      const data = await api('/api/v1/fees');
      const p = data.price || {};
      await ctx.reply(
        `₿ *Bitcoin Price*\n\n` +
        `💵 USD: \\$${esc(Math.round(p.btcUsd || 0).toLocaleString())}\n` +
        `💶 EUR: €${esc(Math.round(p.btcEur || 0).toLocaleString())}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Failed to fetch price'); }
  });

  b.command('fees', async (ctx) => {
    try {
      const data = await api('/api/v1/fees');
      const r = data.fees?.recommended || {};
      const e = data.estimate || {};
      await ctx.reply(
        `⛽ *Fee Estimates*\n\n` +
        `🚀 Fast: ${r.fastestFee || '—'} sat/vB ${e.fastest?.usd ? `\\(${esc(e.fastest.usd)}\\)` : ''}\n` +
        `⏱ Medium: ${r.halfHourFee || '—'} sat/vB ${e.medium?.usd ? `\\(${esc(e.medium.usd)}\\)` : ''}\n` +
        `🐌 Slow: ${r.hourFee || '—'} sat/vB ${e.slow?.usd ? `\\(${esc(e.slow.usd)}\\)` : ''}\n` +
        `📏 Economy: ${r.economyFee || '—'} sat/vB`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Failed to fetch fees'); }
  });

  b.command('mempool', async (ctx) => {
    try {
      const data = await api('/api/v1/mempool');
      const m = data.mempool || {};
      await ctx.reply(
        `🏊 *Mempool*\n\n` +
        `📊 Transactions: ${esc((m.count || 0).toLocaleString())}\n` +
        `💾 Size: ${esc(m.vsizeMB || '—')} MB\n` +
        `💰 Total fees: ${esc(m.totalFeeBTC || '—')} BTC`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Failed to fetch mempool'); }
  });

  b.command('address', async (ctx) => {
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /address <bitcoin_address>\nExample: /address bc1q...');
    }
    try {
      const data = await api(`/api/v1/address/${encodeURIComponent(addr)}`);
      const bal = data.balance?.confirmed || {};
      const s = data.stats || {};
      await ctx.reply(
        `📍 *Address*\n\n` +
        `\`${esc(addr.slice(0, 12))}...${esc(addr.slice(-6))}\`\n\n` +
        `💰 Balance: ${esc(bal.btc || '0')} BTC \\(\\$${esc(bal.usd || '0')}\\)\n` +
        `📊 Transactions: ${s.txCount || 0}\n` +
        `📥 Funded: ${s.fundedTxos || 0} · 📤 Spent: ${s.spentTxos || 0}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Address not found or invalid'); }
  });

  b.command('tx', async (ctx) => {
    const txid = ctx.match?.trim();
    if (!txid || !looksLikeTxid(txid)) {
      return ctx.reply('Usage: /tx <transaction_id>\n(64 hex characters)');
    }
    try {
      const data = await api(`/api/v1/tx/${encodeURIComponent(txid)}`);
      const tx = data.transaction || {};
      const st = tx.status || {};
      const confirmed = st.confirmed ? '✅ Confirmed' : '⏳ Pending';
      await ctx.reply(
        `📄 *Transaction*\n\n` +
        `\`${esc(txid.slice(0, 16))}...\`\n\n` +
        `${esc(confirmed)}\n` +
        `${st.blockHeight ? `📦 Block: ${st.blockHeight}\n` : ''}` +
        `${st.confirmations ? `🔢 Confirmations: ${st.confirmations}\n` : ''}` +
        `📏 Size: ${tx.size || '—'} bytes\n` +
        `⚖️ Weight: ${tx.weight || '—'}\n` +
        `💰 Fee: ${esc(tx.fee?.sats ? `${tx.fee.sats} sats (${tx.fee.rate || '—'})` : '—')}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Transaction not found'); }
  });

  b.command('whale', async (ctx) => {
    try {
      const data = await api('/api/v1/intelligence/whales');
      // API returns { data: { transactions: [...] } }
      const whales = data.data?.transactions || [];
      if (!whales.length) return ctx.reply('🐋 No recent whale activity');
      const lines = whales.slice(0, 5).map((w: any) =>
        `🐋 ${esc(w.totalValueBtc || '?')} BTC — \`${esc((w.txid || '').slice(0, 12))}...\``
      );
      await ctx.reply(`🐋 *Recent Whales*\n\n${lines.join('\n')}`, { parse_mode: 'MarkdownV2' });
    } catch { await ctx.reply('❌ Failed to fetch whale data'); }
  });

  b.command('risk', async (ctx) => {
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /risk <bitcoin_address>');
    }
    try {
      const data = await api(`/api/v1/intelligence/risk/${encodeURIComponent(addr)}`);
      const d = data.data || {};
      const score = d.riskScore || 0;
      const grade = d.riskGrade || '?';
      const emoji = score < 30 ? '🟢' : score < 50 ? '🟡' : '🔴';
      await ctx.reply(
        `${emoji} *Risk Analysis*\n\n` +
        `\`${esc(addr.slice(0, 12))}...\`\n\n` +
        `Score: ${score}/100 \\(Grade ${esc(grade)}\\)\n` +
        `${'█'.repeat(Math.round(score / 10))}${'░'.repeat(10 - Math.round(score / 10))}\n\n` +
        `${esc(d.summary || '')}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Risk analysis failed'); }
  });

  b.command('network', async (ctx) => {
    try {
      const data = await api('/api/v1/intelligence/network');
      const d = data.data || {};
      const c = d.congestion || {};
      const bp = d.blockProduction || {};
      const fm = d.feeMarket || {};
      await ctx.reply(
        `🌐 *Network Health*\n\n` +
        `🏊 Congestion: ${esc(c.label || '—')} \\(${c.level || 0}/10\\)\n` +
        `⚡ Hashrate trend: ${esc(d.hashrateTrend || '—')}\n` +
        `📦 Blocks/hour: ${esc(bp.blocksPerHour || '—')}\n` +
        `⏱ Avg interval: ${bp.avgIntervalSec || '—'}s\n` +
        `🚀 Fast fee: ${fm.fastestFee || '—'} sat/vB\n` +
        `💵 BTC: \\$${esc(Math.round(d.price?.usd || 0).toLocaleString())}`,
        { parse_mode: 'MarkdownV2' }
      );
    } catch { await ctx.reply('❌ Network health unavailable'); }
  });

  b.on('inline_query', async (ctx) => {
    const query = ctx.inlineQuery.query.trim();
    if (!query || !looksLikeBtcAddress(query)) return;
    try {
      const data = await api(`/api/v1/address/${encodeURIComponent(query)}`);
      const bal = data.balance?.confirmed || {};
      await ctx.answerInlineQuery([{
        type: 'article',
        id: `addr-${query.slice(0, 8)}`,
        title: `${bal.btc || '0'} BTC`,
        description: `${query.slice(0, 20)}... — $${bal.usd || '0'}`,
        input_message_content: {
          message_text: `₿ ${query}\nBalance: ${bal.btc || '0'} BTC ($${bal.usd || '0'})\nTxs: ${data.stats?.txCount || 0}`,
        },
      }]);
    } catch { /* ignore inline failures */ }
  });
}
