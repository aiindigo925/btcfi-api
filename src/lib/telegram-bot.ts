/**
 * BTCFi Telegram Bot — grammY
 *
 * Commands: /price, /fees, /mempool, /address, /tx, /whale, /risk, /network,
 *           /mining, /lightning, /signal, /l2, /block, /mvrv, /sopr, /nupl,
 *           /entity, /portfolio, /staking, /threat, /eth_addr, /sol_addr,
 *           /watch, /unwatch, /watchlist, /alerts, /help
 * Inline mode: @BTC_Fi_Bot <address>
 * Channel posting: @BTCFi_Whales whale alerts with buy/sell signals (MP5 Phase 1)
 *
 * Security: Redis-backed per-user rate limiting on all commands.
 * Lazy-initialized: grammY throws on empty token, so Bot is only
 * created when TELEGRAM_BOT_TOKEN is set and first update arrives.
 */

import { Bot, InlineKeyboard } from 'grammy';
import { addWatch, removeWatch, getWatchlist, setAlerts, getAlerts } from './watchlist';
import { getRedis } from './redis';
import {
  portfolioAdd,
  portfolioRemove,
  portfolioList,
  portfolioCount,
  isDigestEnabled,
  setDigestEnabled,
  getAlertList,
  addAlert,
  removeAlert,
  MAX_PORTFOLIO,
  MAX_ALERTS,
} from './telegram-premium';

const API = process.env.BTCFI_API_URL || 'https://btcfi.aiindigo.com';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';
const WHALE_CHANNEL_ID = process.env.WHALE_CHANNEL_ID || '';

// Footer for DM bot responses
const FOOTER =
  '\n\n\u2014\n'
  + '_\ud83d\udca1 Full API:_ [btcfi\\.aiindigo\\.com](https://btcfi.aiindigo.com) _\\|_ `npm i @aiindigo/btcfi`\n'
  + '[AI Indigo](https://aiindigo.com) _\\|_ [FutureTools AI](https://futuretoolsai.com) _\\|_ [OpenClaw Terrace](https://openclawterrace.com)';

// Plain footer for non-markdown responses
const PLAIN_FOOTER =
  '\n\n\u2014\n\ud83d\udca1 btcfi.aiindigo.com | @BTC_Fi_Bot | @BTCFi_Whales\nAI Indigo | FutureTools AI | OpenClaw Terrace';

// HTML footer for price responses (avoids MarkdownV2 escaping issues with URLs)
const HTML_PRICE_FOOTER =
  '\n\n\u2014\n'
  + '\ud83d\udca1 <i>Full API:</i> <a href="https://btcfi.aiindigo.com">btcfi.aiindigo.com</a> | <code>npm i @aiindigo/btcfi</code>\n'
  + '<a href="https://aiindigo.com">AI Indigo</a> | <a href="https://futuretoolsai.com">FutureTools AI</a> | <a href="https://openclawterrace.com">OpenClaw Terrace</a>';

// Footer for channel posts
const CH_FOOTER =
  '\n\n\u2014\n'
  + '\ud83d\udd17 <a href="https://btcfi.aiindigo.com">btcfi.aiindigo.com</a> | <a href="https://t.me/BTC_Fi_Bot">@BTC_Fi_Bot</a>\n'
  + '<a href="https://aiindigo.com">AI Indigo</a> | <a href="https://futuretoolsai.com">FutureTools AI</a> | <a href="https://openclawterrace.com">OpenClaw Terrace</a>\n'
  + '<i>Free for humans</i>';

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
    // Register commands with Telegram so they appear in the native / menu
    await _bot.api.setMyCommands([
      { command: 'price', description: 'Live BTC price' },
      { command: 'fees', description: 'Fee recommendations' },
      { command: 'mempool', description: 'Mempool summary' },
      { command: 'address', description: 'Balance & stats' },
      { command: 'tx', description: 'TX details' },
      { command: 'whale', description: 'Whale alert feed' },
      { command: 'risk', description: 'Risk analysis' },
      { command: 'network', description: 'Network health' },
      { command: 'mining', description: 'Mining analytics' },
      { command: 'lightning', description: 'Lightning Network stats' },
      { command: 'signal', description: 'Composite buy/sell signal' },
      { command: 'l2', description: 'Bitcoin L2 ecosystem' },
      { command: 'block', description: 'Latest blocks' },
      { command: 'mvrv', description: 'MVRV Z-Score' },
      { command: 'sopr', description: 'SOPR metric' },
      { command: 'nupl', description: 'Net Unrealized P/L' },
      { command: 'entity', description: 'Entity cluster lookup' },
      { command: 'portfolio', description: 'Portfolio management' },
      { command: 'staking', description: 'Staking status' },
      { command: 'threat', description: 'Security threat check' },
      { command: 'eth_addr', description: 'ETH address lookup' },
      { command: 'sol_addr', description: 'SOL address lookup' },
      { command: 'watch', description: 'Watch address' },
      { command: 'unwatch', description: 'Stop watching' },
      { command: 'watchlist', description: 'Your watched addresses' },
      { command: 'alerts', description: 'Advanced alerts' },
      { command: 'help', description: 'Show commands' },
      { command: 'digest', description: 'Daily BTC digest' },
      { command: 'eth_gas', description: 'ETH gas prices' },
      { command: 'sol_fees', description: 'SOL network fees' },
      { command: 'help', description: 'Show all commands' },
    ]).catch(() => { /* ignore if already set */ });
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

// ============ RATE LIMITING (Redis, per-user, tier-aware) ============

/**
 * Telegram bot is always free — no per-user rate limit.
 * Returns true (allowed) for all users.
 */
async function checkCommandRateLimit(_userId: number): Promise<boolean> {
  return true;
}

// ============ WHALE CHANNEL POSTING (MP5 Phase 1) =

/** Build a relatable comparison line for whale posts based on USD value. */
function buildWhaleComparison(usdFormatted: string): string {
  const raw = parseFloat(usdFormatted.replace(/,/g, '')) || 0;
  if (raw <= 0) return '';
  let line = '';
  if (raw < 500000) {
    line = '\u2615 \u2248 ' + Math.round(raw / 5) + ' premium coffees';
  } else if (raw < 2000000) {
    line = '\ud83d\ude97 \u2248 ' + Math.round(raw / 50000) + ' Tesla Model 3s';
  } else if (raw < 10000000) {
    line = '\ud83c\udfe0 \u2248 ' + Math.round(raw / 500000) + ' US homes';
  } else if (raw < 50000000) {
    line = '\ud83c\udfe2 \u2248 ' + Math.round(raw / 5000000) + ' commercial properties';
  } else {
    line = '\ud83c\udfd7\ufe0f \u2248 ' + Math.round(raw / 50000000) + ' skyscrapers';
  }
  return '\n' + line;
}

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

  try {
    const b = await getBot();

    const usdFormatted = parseFloat(whale.totalValueUsd).toLocaleString('en-US');
    const txShort = whale.txid.slice(0, 16);
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
      header = arrows + ' <b>WHALE BUY</b> ' + arrows;
    } else {
      const arrows = '\ud83d\udd34'.repeat(scale);
      header = arrows + ' <b>WHALE SELL</b> ' + arrows;
    }

    // Signal reason line
    let signalLine = '';
    if (sig !== 'transfer' && whale.signalReason) {
      signalLine = '\ud83d\udcca <i>' + escHtml(whale.signalReason) + '</i>\n';
    }

    // I/O line (only if we have data)
    let ioLine = '';
    if (whale.inputs > 0 || whale.outputs > 0) {
      ioLine = '\ud83d\udce5 Inputs: ' + whale.inputs + ' \u00b7 \ud83d\udce4 Outputs: ' + whale.outputs + '\n';
    }

    const msg = header + '\n\n'
      + '\ud83d\udcb0 ' + escHtml(whale.totalValueBtc) + ' BTC (<code>$' + escHtml(usdFormatted) + '</code>)\n'
      + '\ud83d\udcc4 TX: <code>' + escHtml(txShort) + '...</code>\n'
      + '\u26fd Fee: ' + escHtml(whale.feeRate) + '\n'
      + ioLine
      + signalLine
      + buildWhaleComparison(usdFormatted)
      + CH_FOOTER;

    await b.api.sendMessage(WHALE_CHANNEL_ID, msg, {
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error('[Telegram] postWhaleToChannel failed:', err);
  }
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
  return String(s).replace(/[_*\[\]()~`>#+\-=|{}.!\\]/g, '\\$&');
}

/** Escape text for HTML parse_mode. */
function escHtml(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function looksLikeBtcAddress(s: string): boolean {
  return /^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(s);
}

function looksLikeTxid(s: string): boolean {
  return /^[a-fA-F0-9]{64}$/.test(s);
}

function maxLen(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) : s;
}

// ============ PRICE HELPERS ============

const SIMPLE_CURRENCIES = [
  { key: 'usd',  flag: '\ud83c\uddfa\ud83c\uddf8', symbol: '$',   prefix: '' },
  { key: 'eur',  flag: '\ud83c\uddea\ud83c\uddfa', symbol: '\u20ac', prefix: '' },
  { key: 'gbp',  flag: '\ud83c\uddec\ud83c\udde7', symbol: '\u00a3', prefix: '' },
  { key: 'jpy',  flag: '\ud83c\uddef\ud83c\uddf5', symbol: '\u00a5', prefix: '' },
  { key: 'aud',  flag: '\ud83c\udde6\ud83c\uddfa', symbol: 'A$',  prefix: 'A$' },
  { key: 'cad',  flag: '\ud83c\udde8\ud83c\udde6', symbol: 'C$',  prefix: 'C$' },
  { key: 'chf',  flag: '\ud83c\udde8\ud83c\udded', symbol: 'CHF', prefix: 'CHF ' },
] as const;

const REGION_CURRENCIES = {
  'Americas': ['usd', 'cad', 'brl', 'mxn', 'ars', 'clp', 'cop'],
  'Europe': ['eur', 'gbp', 'sek', 'nok', 'dkk', 'pln', 'czk', 'uah', 'ils', 'chf'],
  'Asia-Pacific': ['jpy', 'cny', 'inr', 'kwd', 'hkd', 'sgd', 'twd', 'thb', 'myr', 'idr', 'php', 'vnd', 'pkr', 'bdt'],
  'Middle East & Africa': ['sar', 'aed', 'egp', 'zar', 'ngn', 'gel'],
};

const REGION_FLAGS: Record<string, string> = {
  usd: '\ud83c\uddfa\ud83c\uddf8', cad: '\ud83c\udde8\ud83c\udde6', brl: '\ud83c\udde7\ud83c\uddf7', mxn: '\ud83c\uddf2\ud83c\uddfd', ars: '\ud83c\udde6\ud83c\uddf7', clp: '\ud83c\udde8\ud83c\uddf1', cop: '\ud83c\udde8\ud83c\uddf4',
  eur: '\ud83c\uddea\ud83c\uddfa', gbp: '\ud83c\uddec\ud83c\udde7', sek: '\ud83c\uddf8\ud83c\uddea', nok: '\ud83c\uddf3\ud83c\uddf4', dkk: '\ud83c\udde9\ud83c\uddf0', pln: '\ud83c\uddf5\ud83c\uddf1', czk: '\ud83c\udde8\ud83c\uddff', uah: '\ud83c\uddfa\ud83c\udde6', ils: '\ud83c\uddee\ud83c\uddf1', chf: '\ud83c\udde8\ud83c\udded',
  jpy: '\ud83c\uddef\ud83c\uddf5', cny: '\ud83c\udde8\ud83c\uddf3', inr: '\ud83c\uddee\ud83c\uddf3', kwd: '\ud83c\uddf0\ud83c\uddfc', hkd: '\ud83c\udded\ud83c\uddf0', sgd: '\ud83c\uddf8\ud83c\uddec', twd: '\ud83c\uddf9\ud83c\uddfc', thb: '\ud83c\uddf9\ud83c\udded', myr: '\ud83c\uddf2\ud83c\uddfe', idr: '\ud83c\uddee\ud83c\udde9', php: '\ud83c\uddf5\ud83c\udded', vnd: '\ud83c\uddfb\ud83c\uddf3', pkr: '\ud83c\uddf5\ud83c\uddf0', bdt: '\ud83c\udde7\ud83c\udde9',
  sar: '\ud83c\uddf8\ud83c\udde6', aed: '\ud83c\udde6\ud83c\uddea', egp: '\ud83c\uddea\ud83c\uddec', zar: '\ud83c\uddff\ud83c\udde6', ngn: '\ud83c\uddf3\ud83c\uddec', gel: '\ud83c\uddec\ud83c\uddea',
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  usd: '$', eur: '\u20ac', gbp: '\u00a3', jpy: '\u00a5', aud: 'A$', cad: 'C$', chf: 'CHF ',
  brl: 'R$', mxn: 'MX$', ars: 'AR$', clp: 'CL$', cop: 'COP',
  sek: 'SEK', nok: 'NOK', dkk: 'DKK', pln: 'PLN', czk: 'CZK', uah: 'UAH', ils: 'ILS',
  cny: '\u00a5', inr: '\u20b9', kwd: 'KWD', hkd: 'HK$', sgd: 'S$', twd: 'NT$', thb: '\u0e3f', myr: 'RM', idr: 'Rp', php: '\u20b1', vnd: '\u20ab', pkr: 'PKR', bdt: '\u09f3',
  sar: 'SAR', aed: 'AED', egp: 'EGP', zar: 'ZAR', ngn: 'NGN', gel: 'GEL',
};

const CURRENCY_NAMES: Record<string, string> = {
  usd: 'US Dollar', eur: 'Euro', gbp: 'British Pound', jpy: 'Japanese Yen',
  aud: 'Australian Dollar', cad: 'Canadian Dollar', chf: 'Swiss Franc',
  brl: 'Brazilian Real', mxn: 'Mexican Peso', ars: 'Argentine Peso',
  clp: 'Chilean Peso', cop: 'Colombian Peso', sek: 'Swedish Krona',
  nok: 'Norwegian Krone', dkk: 'Danish Krone', pln: 'Polish Zloty',
  czk: 'Czech Koruna', uah: 'Ukrainian Hryvnia', ils: 'Israeli Shekel',
  cny: 'Chinese Yuan', inr: 'Indian Rupee', kwd: 'Kuwaiti Dinar',
  hkd: 'Hong Kong Dollar', sgd: 'Singapore Dollar', twd: 'Taiwan Dollar',
  thb: 'Thai Baht', myr: 'Malaysian Ringgit', idr: 'Indonesian Rupiah',
  php: 'Philippine Peso', vnd: 'Vietnamese Dong', pkr: 'Pakistani Rupee',
  bdt: 'Bangladeshi Taka', sar: 'Saudi Riyal', aed: 'UAE Dirham',
  egyptian: 'Egyptian Pound', zar: 'South African Rand', ngn: 'Nigerian Naira',
  gel: 'Georgian Lari', egp: 'Egyptian Pound',
};

/**
 * Format a numeric price value for display. Returns HTML-safe text.
 * No MarkdownV2 escaping needed — dots/commas are safe in HTML mode.
 */
function formatPriceValue(val: number, currency: string): string {
  const symbol = CURRENCY_SYMBOLS[currency] || currency.toUpperCase();
  // For JPY and similar low-value currencies, use no decimals
  const decimals = ['jpy', 'clp', 'cop', 'ars', 'vnd', 'idr', 'pkr', 'bdt', 'sek', 'nok', 'dkk', 'pln', 'czk', 'uah', 'thb', 'myr', 'php'].includes(currency) ? 0 : 2;
  const formatted = val.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return escHtml(symbol + formatted);
}

/**
 * Build simple price view (7 currencies). Returns HTML text.
 */
function buildSimplePriceText(btcData: Record<string, number>): string {
  let text = '📈 <b>BTC Price</b>\n\n';
  for (const c of SIMPLE_CURRENCIES) {
    const val = btcData[c.key];
    if (val === undefined || val === null) continue;
    text += c.flag + ' <b>' + escHtml(c.key.toUpperCase()) + '</b> ' + formatPriceValue(val, c.key) + '\n';
  }
  return text + '💡 <i>Tap buttons below for more currencies</i>';
}

/**
 * Build expanded price view (all currencies by region). Returns HTML text.
 */
function buildExpandedPriceText(btcData: Record<string, number>): string {
  let text = '📈 <b>BTC Price — All Currencies</b>\n\n';
  for (const [region, currencies] of Object.entries(REGION_CURRENCIES)) {
    text += '<b>' + escHtml(region) + '</b>\n';
    for (const cur of currencies) {
      const val = btcData[cur];
      if (val === undefined || val === null) continue;
      const flag = REGION_FLAGS[cur] || '';
      text += flag + ' <b>' + escHtml(cur.toUpperCase()) + '</b> ' + formatPriceValue(val, cur) + '\n';
    }
    text += '\n';
  }
  return text.trimEnd();
}

/**
 * Fetch BTC prices from CoinGecko. Returns { btc: Record<string, number> }.
 */
async function fetchCoinGeckoPrices(): Promise<Record<string, number>> {
  const data = await api('/api/v1/price?source=coingecko');
  // Handle different response shapes
  if (data.data?.btc) return data.data.btc;
  if (data.price) return data.price;
  if (data.btc) return data.btc;
  return data as Record<string, number>;
}

const PRICE_SIMPLE_KB = new InlineKeyboard()
  .text('\ud83c\udf0d 40+ Currencies', 'price_expand')
  .text('\ud83d\udd04 Refresh', 'price_refresh');

const PRICE_EXPANDED_KB = new InlineKeyboard()
  .text('\ud83d\udd19 Simple View', 'price_simple')
  .text('\ud83d\udd04 Refresh', 'price_refresh');

// ============ COMMAND REGISTRATION ============

function registerCommands(b: Bot): void {
  b.command('start', (ctx) => ctx.reply(
    '\u20bf *BTCFi Bot* \u2014 Bitcoin Intelligence\n\n'
    + '/price \u2014 BTC price\n'
    + '/fees \u2014 Fee estimates\n'
    + '/mempool \u2014 Mempool status\n'
    + '/address \u2014 Address info\n'
    + '/tx \u2014 Transaction details\n'
    + '/whale \u2014 Recent whale movements\n'
    + '/risk \u2014 Address risk score\n'
    + '/network \u2014 Network health\n'
    + '/mining \u2014 Mining analytics\n'
    + '/lightning \u2014 Lightning Network\n'
    + '/signal \u2014 Cycle signal\n'
    + '/l2 \u2014 Bitcoin L2 ecosystem\n'
    + '/block \u2014 Latest blocks\n'
    + '/entity \u2014 Entity cluster\n'
    + '/portfolio \u2014 Portfolio management\n'
    + '/watch \u2014 Watch an address\n'
    + '/unwatch \u2014 Stop watching\n'
    + '/watchlist \u2014 Your watched addresses\n'
    + '/alerts \u2014 Advanced alerts\n'
    + '/digest \u2014 Daily BTC digest\n'
    + '/help \u2014 This message'
    + '/help \u2014 This message'
    + FOOTER,
    { parse_mode: 'MarkdownV2' }
  ));

  b.command('help', (ctx) => ctx.reply(
    '\u20bf *BTCFi Commands*\n\n'
    + '*Price & Fees*\n'
    + '/price \u2014 Live BTC price\n'
    + '/fees \u2014 Fee recommendations\n\n'
    + '*Blockchain*\n'
    + '/mempool \u2014 Mempool summary\n'
    + '/address \u2014 Balance & stats\n'
    + '/tx \u2014 TX details\n'
    + '/block \u2014 Latest blocks\n\n'
    + '*Intelligence*\n'
    + '/whale \u2014 Whale alert feed\n'
    + '/risk \u2014 Risk analysis\n'
    + '/network \u2014 Network health\n'
    + '/mining \u2014 Mining analytics\n'
    + '/lightning \u2014 Lightning Network\n'
    + '/signal \u2014 Composite cycle signal\n'
    + '/l2 \u2014 Bitcoin L2 ecosystem\n'
    + '/entity \u2014 Entity cluster lookup\n\n'
    + '*On-Chain Metrics*\n'
    + '/mvrv \u2014 MVRV Z-Score\n'
    + '/sopr \u2014 SOPR metric\n'
    + '/nupl \u2014 Net Unrealized P/L\n\n'
    + '*Multi-Chain*\n'
    + '/eth_addr \u2014 ETH address lookup\n'
    + '/sol_addr \u2014 SOL address lookup\n'
    + '/staking \u2014 Staking status\n\n'
    + '*Watchlist*\n'
    + '/watch \u2014 Watch address\n'
    + '/unwatch \u2014 Stop watching\n'
    + '/watchlist \u2014 Your watched addresses\n'
    + '/alerts \u2014 Advanced alerts \\(whale/price/fee\\)\n\n'
    
    
    + '/portfolio \u2014 Multi-address portfolio\n'
    + '/digest \u2014 Daily BTC digest \\(Pro\\)'
    + FOOTER,
    { parse_mode: 'MarkdownV2' }
  ));

  // ---- PRICE & FEES ----

  b.command('price', async (ctx) => {
    // Rate limit check
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const arg = (ctx.match || '').trim().toLowerCase();
    if (arg && /^[a-z]{3}$/.test(arg)) {
      // Single-currency shortcut: /price eur
      try {
        const data = await api('/api/v1/price?source=coingecko&currency=' + arg);
        const btc = data.data?.btc || data.price || data.btc || {};
        const val = btc[arg];
        if (val === undefined || val === null) {
          return ctx.reply('\u274c Currency <b>' + escHtml(arg.toUpperCase()) + '</b> not supported. Try: usd, eur, gbp, jpy, aud, cad, chf...', { parse_mode: 'HTML' });
        }
        const symbol = CURRENCY_SYMBOLS[arg] || arg.toUpperCase() + ' ';
        return ctx.reply(
          '📈 <b>BTC Price</b>\n\n'
          + '\ud83d\udcb0 BTC = <b>' + escHtml(symbol + Number(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
          + '</b> (' + escHtml(arg.toUpperCase()) + ')',
          { parse_mode: 'HTML' }
        );
      } catch (err) {
        console.error('[Telegram] /price single-currency failed:', err);
        return ctx.reply('\u274c Failed to fetch price for ' + escHtml(arg.toUpperCase()), { parse_mode: 'HTML' });
      }
    }
    try {
      const btcData = await fetchCoinGeckoPrices();
      await ctx.reply(
        buildSimplePriceText(btcData) + HTML_PRICE_FOOTER,
        { parse_mode: 'HTML', reply_markup: PRICE_SIMPLE_KB }
      );
    } catch (err) {
      console.error('[Telegram] /price failed:', err);
      await ctx.reply('\u274c Failed to fetch price');
    }
  });

  b.command('fees', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
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
    } catch (err) {
      console.error('[Telegram] /fees failed:', err);
      await ctx.reply('\u274c Failed to fetch fees');
    }
  });

  // ---- BLOCKCHAIN ----

  b.command('mempool', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
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
    } catch (err) {
      console.error('[Telegram] /mempool failed:', err);
      await ctx.reply('\u274c Failed to fetch mempool');
    }
  });

  b.command('address', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('\u274c Invalid Bitcoin address.\nExpected format:\n\u2022 bc1q... (Bech32)\n\u2022 1... (Legacy)\n\u2022 3... (P2SH)');
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
    } catch (err) {
      console.error('[Telegram] /address failed:', err);
      if (err instanceof TypeError || (err as any)?.code === 'ECONNREFUSED' || (err as any)?.name === 'AbortError') {
        await ctx.reply('\u26a0\ufe0f Network error \u2014 try again in a moment.');
      } else {
        await ctx.reply('\u274c Address not found on blockchain.\nCheck the address and try again.');
      }
    }
  });

  b.command('tx', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
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
    } catch (err) {
      console.error('[Telegram] /tx failed:', err);
      await ctx.reply('\u274c Transaction not found');
    }
  });

  b.command('block', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/block/latest');
      const blocks = (data.blocks || []).slice(0, 5);
      if (!blocks.length) return ctx.reply('\u274c No blocks available');
      const lines = blocks.map((bl: any) => {
        const time = new Date(bl.time || bl.timestamp * 1000);
        const ago = Math.round((Date.now() - time.getTime()) / 60000);
        return '\ud83d\udce6 #' + bl.height + ' \u2014 ' + bl.txCount + ' txs \u2014 ' + ago + 'm ago';
      });
      await ctx.reply(
        '\ud83d\udce6 *Latest Blocks*\n\n'
        + lines.join('\n') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /block failed:', err);
      await ctx.reply('\u274c Failed to fetch blocks');
    }
  });

  // ---- INTELLIGENCE ----

  b.command('whale', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/whales');
      const whales = data.data?.transactions || [];
      if (!whales.length) return ctx.reply('\ud83d\udc0b No recent whale activity');
      const lines = whales.slice(0, 5).map((w: any) => {
        const sigEmoji = w.signal === 'buy' ? '\ud83d\udfe2' : w.signal === 'sell' ? '\ud83d\udd34' : '\ud83d\udfe1';
        const btcVal = w.totalValueBtc || '?';
        const usdVal = w.totalValueUsd ? '$' + parseFloat(w.totalValueUsd).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '';
        let timeAgo = '';
        if (w.timestamp) {
          const diff = Date.now() - new Date(w.timestamp).getTime();
          const mins = Math.floor(diff / 60000);
          if (mins < 1) timeAgo = 'just now';
          else if (mins < 60) timeAgo = mins + 'm ago';
          else if (mins < 1440) timeAgo = Math.floor(mins / 60) + 'h ago';
          else timeAgo = Math.floor(mins / 1440) + 'd ago';
        }
        return sigEmoji + ' ' + esc(btcVal) + ' BTC'
          + (usdVal ? ' (' + esc(usdVal) + ')' : '')
          + (timeAgo ? ' \u2014 ' + esc(timeAgo) : '');
      });
      await ctx.reply('\ud83d\udc0b *Recent Whales*\n\n' + lines.join('\n') + FOOTER, { parse_mode: 'MarkdownV2' });
    } catch (err) {
      console.error('[Telegram] /whale failed:', err);
      await ctx.reply('\u274c Failed to fetch whale data');
    }
  });

  b.command('risk', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
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
    } catch (err) {
      console.error('[Telegram] /risk failed:', err);
      await ctx.reply('\u274c Risk analysis failed');
    }
  });

  b.command('network', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
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
    } catch (err) {
      console.error('[Telegram] /network failed:', err);
      await ctx.reply('\u274c Network health unavailable');
    }
  });

  b.command('mining', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/mining');
      const d = data.data || {};
      const h = d.hashrate || {};
      const diff = d.difficulty || {};
      const bs = d.blockStats || {};
      const pools = (d.poolDistribution || []).slice(0, 5).map((p: any) =>
        '  ' + esc(p.name) + ': ' + p.sharePercent + '%'
      );
      await ctx.reply(
        '\u26cf\ufe0f *Mining Analytics*\n\n'
        + '\u26a1 Hashrate: ' + esc(h.hashrate || '\u2014') + '\n'
        + '\ud83d\udd22 Difficulty: ' + esc(diff.adjusted || '\u2014') + '\n'
        + '\ud83d\udce6 Blocks 24h: ' + (bs.blocksLast24h || '\u2014') + '\n'
        + '\u23f1 Avg block: ' + esc(bs.avgBlockTime || '\u2014') + '\n\n'
        + '*Top Pools:*\n'
        + (pools.length ? pools.join('\n') : '\u2014') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /mining failed:', err);
      await ctx.reply('\u274c Mining analytics unavailable');
    }
  });

  b.command('lightning', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/lightning');
      const d = data.data || {};
      const topNodes = (d.topNodes || []).slice(0, 5).map((n: any) =>
        '  ' + esc(n.alias) + ': ' + n.capacity.toLocaleString() + ' sats'
      );
      await ctx.reply(
        '\u26a1 *Lightning Network*\n\n'
        + '\ud83c\udfe1 Capacity: ' + esc((d.totalCapacity || 0).toLocaleString()) + ' sats\n'
        + '\ud83d\udd17 Channels: ' + esc((d.channelCount || 0).toLocaleString()) + '\n'
        + '\ud83d\udcaa Avg channel: ' + esc((d.avgChannelSize || 0).toLocaleString()) + ' sats\n\n'
        + '*Top Nodes:*\n'
        + (topNodes.length ? topNodes.join('\n') : '\u2014') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /lightning failed:', err);
      await ctx.reply('\u274c Lightning data unavailable');
    }
  });

  b.command('signal', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/signal');
      const d = data.data || {};
      const sig = d.signal || 'neutral';
      const confidence = d.confidence || 0;
      const score = d.score || 0;
      const sigEmoji = sig.includes('buy') ? '\ud83d\udfe2' : sig.includes('sell') ? '\ud83d\udd34' : '\ud83d\udfe0';
      const sigLabel = sig.replace(/_/g, ' ').toUpperCase();
      const bar = '\u2588'.repeat(Math.round(Math.abs(score) * 10)) + '\u2591'.repeat(10 - Math.round(Math.abs(score) * 10));
      const components = (d.components || []).map((c: any) =>
        '  ' + (c.score > 0.2 ? '\ud83d\udfe2' : c.score < -0.2 ? '\ud83d\udd34' : '\ud83d\udfe0') + ' ' + esc(c.name) + ': ' + c.score.toFixed(2)
      );
      await ctx.reply(
        sigEmoji + ' *Cycle Signal: ' + sigLabel + '*\n\n'
        + 'Confidence: ' + confidence + '%\n'
        + 'Score: ' + score.toFixed(3) + ' ' + bar + '\n\n'
        + '*Components:*\n'
        + (components.length ? components.join('\n') : '\u2014') + '\n\n'
        + '_' + esc(d.reasoning || '') + '_' + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /signal failed:', err);
      await ctx.reply('\u274c Signal data unavailable');
    }
  });

  b.command('l2', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/l2');
      const d = data.data || {};
      const chains = (d.chains || []).slice(0, 6).map((c: any) => {
        const arrow = c.change24h >= 0 ? '\ud83d\udcc8' : '\ud83d\udcc9';
        return '  ' + esc(c.name) + ': $' + esc((c.tvl / 1e6).toFixed(1)) + 'M ' + arrow + ' ' + c.change24h.toFixed(1) + '%';
      });
      await ctx.reply(
        '\u26c1\ufe0f *Bitcoin L2 Ecosystem*\n\n'
        + '\ud83d\udcb0 Total TVL: $' + esc(((d.totalTVL || 0) / 1e6).toFixed(1)) + 'M\n\n'
        + '*Chains:*\n'
        + (chains.length ? chains.join('\n') : '\u2014') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /l2 failed:', err);
      await ctx.reply('\u274c L2 data unavailable');
    }
  });

  b.command('entity', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /entity <bitcoin_address>');
    }
    try {
      const data = await api('/api/v1/intelligence/entity/' + encodeURIComponent(addr));
      const d = data.data || {};
      const tags = (d.tags || []).map((t: string) => '#' + esc(t)).join(' ');
      await ctx.reply(
        '\ud83c\udfe2 *Entity Lookup*\n\n'
        + '`' + esc(addr.slice(0, 12)) + '\\.\\.\\.' + '`\n\n'
        + 'Entity: ' + esc(d.entity || 'Unknown') + '\n'
        + 'Type: ' + esc(d.entityType || '\u2014') + '\n'
        + (tags ? 'Tags: ' + tags + '\n' : '')
        + '\ud83d\udcb0 Balance: ' + esc(d.balance?.btc || '0') + ' BTC\n'
        + '\ud83d\udcca Transactions: ' + (d.txCount || 0) + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /entity failed:', err);
      await ctx.reply('\u274c Entity lookup failed');
    }
  });

  // ---- PORTFOLIO MANAGEMENT ----

  b.command('portfolio', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const userId = ctx.from?.id || 0;
    const sub = (ctx.match?.trim() || '').toLowerCase();
    const parts = (ctx.match?.trim() || '').split(/\s+/);

    if (!sub || sub === 'help') {
      const max = MAX_PORTFOLIO;
      const count = await portfolioCount(userId);
      return ctx.reply(
        '\ud83d\udcca *Portfolio Management*\n\n'
        + '\ud83d\udccc ' + count + '/' + max + ' addresses\\n\\n'
        + '*Commands:*\n'
        + '/portfolio add <address> <label> \u2014 Add address\n'
        + '/portfolio list \u2014 Show saved addresses\n'
        + '/portfolio remove <address> \u2014 Remove address\n'
        + '/portfolio summary \u2014 Aggregate stats\n\n'
        + '_Or pass a BTC address directly for single-address analysis_'
        + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    }

    // /portfolio add <address> <label>
    if (parts[0] === 'add') {
      const addr = parts[1];
      const label = parts.slice(2).join(' ') || '';
      if (!addr || !looksLikeBtcAddress(addr)) {
        return ctx.reply('Usage: /portfolio add <bitcoin_address> <label>');
      }
      const result = await portfolioAdd(userId, addr, label);
      return ctx.reply((result.ok ? '\u2705 ' : '\u274c ') + result.message + PLAIN_FOOTER);
    }

    // /portfolio list
    if (parts[0] === 'list') {
      const items = await portfolioList(userId);
      if (!items.length) {
        return ctx.reply('\ud83d\udccd No addresses in portfolio. Use /portfolio add <address> <label>' + PLAIN_FOOTER);
      }
      const lines = items.map((item, i) =>
        (i + 1) + '\\. `' + esc(item.address.slice(0, 12)) + '\\\\.\\\\.\\\\.` \u2014 ' + esc(item.label)
      );
      const max = MAX_PORTFOLIO;
      return ctx.reply(
        '\ud83d\udcca *Your Portfolio* \\\\( ' + items.length + '/' + max + ' \\\)\n\n'
        + lines.join('\n') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    }

    // /portfolio remove <address>
    if (parts[0] === 'remove') {
      const addr = parts[1];
      if (!addr) {
        return ctx.reply('Usage: /portfolio remove <address>');
      }
      const result = await portfolioRemove(userId, addr);
      return ctx.reply((result.ok ? '\u2705 ' : '\u274c ') + result.message + PLAIN_FOOTER);
    }

    // /portfolio summary
    if (parts[0] === 'summary') {
      const items = await portfolioList(userId);
      if (!items.length) {
        return ctx.reply('\ud83d\udccd No addresses in portfolio.' + PLAIN_FOOTER);
      }
      try {
        let totalBtc = 0;
        let totalUsd = 0;
        const addressData: { label: string; address: string; btc: number; usd: number }[] = [];

        // Fetch balances for all addresses
        for (const item of items) {
          try {
            const data = await api('/api/v1/address/' + encodeURIComponent(item.address));
            const bal = data.balance?.confirmed || {};
            const btc = parseFloat(bal.btc) || 0;
            const usd = parseFloat(bal.usd) || 0;
            totalBtc += btc;
            totalUsd += usd;
            addressData.push({ label: item.label, address: item.address, btc, usd });
          } catch {
            addressData.push({ label: item.label, address: item.address, btc: 0, usd: 0 });
          }
        }

        const lines = addressData.map((a) => {
          const pct = totalBtc > 0 ? ((a.btc / totalBtc) * 100).toFixed(1) : '0.0';
          return esc(a.label) + ': ' + a.btc.toFixed(8) + ' BTC \\\\( ' + pct + '% \\\)';
        });

        return ctx.reply(
          '\ud83d\udcca *Portfolio Summary*\n\n'
          + '\ud83d\udcb0 *Total:* ' + totalBtc.toFixed(8) + ' BTC\n'
          + '\ud83d\udcb5 *USD:* \\\\$' + esc(Math.round(totalUsd).toLocaleString()) + '\n'
          + '\ud83d\udcce *Addresses:* ' + items.length + '\n\n'
          + '*Allocation:*\n'
          + lines.join('\n') + FOOTER,
          { parse_mode: 'MarkdownV2' }
        );
      } catch (err) {
        console.error('[Telegram] /portfolio summary failed:', err);
        return ctx.reply('\u274c Failed to compute summary');
      }
    }

    // Fallback: treat as single-address analysis (backward compat)
    const addr = sub;
    if (looksLikeBtcAddress(addr)) {
      try {
        const data = await api('/api/v1/intelligence/portfolio/' + encodeURIComponent(addr));
        const d = data.data || {};
        const assets = (d.assets || []).slice(0, 5).map((a: any) =>
          '  ' + esc(a.name || a.symbol || '?') + ': $' + esc((a.valueUsd || 0).toLocaleString())
        );
        await ctx.reply(
          '\ud83d\udcca *Portfolio*\n\n'
          + '`' + esc(addr.slice(0, 12)) + '\\\\.\\\\.\\\\.' + '`\n\n'
          + '\ud83d\udcb0 Total: $' + esc((d.totalValueUsd || 0).toLocaleString()) + '\n'
          + '\ud83d\udcc4 BTC: ' + esc(d.totalBtc || '0') + '\n\n'
          + '*Assets:*\n'
          + (assets.length ? assets.join('\n') : '\u2014') + FOOTER,
          { parse_mode: 'MarkdownV2' }
        );
      } catch (err) {
        console.error('[Telegram] /portfolio failed:', err);
        await ctx.reply('\u274c Portfolio lookup failed');
      }
    } else {
      await ctx.reply('Usage: /portfolio <address> or /portfolio add|list|remove|summary');
    }
  });

  // ---- ON-CHAIN METRICS ----

  b.command('mvrv', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/mvrv');
      const d = data.data || {};
      const zscore = d.zscore ?? '\u2014';
      const mvrv = d.mvrv ?? '\u2014';
      const zone = d.zone || '\u2014';
      await ctx.reply(
        '\ud83d\udcc8 *MVRV Z-Score*\n\n'
        + 'Z-Score: ' + esc(String(zscore)) + '\n'
        + 'MVRV Ratio: ' + esc(String(mvrv)) + '\n'
        + 'Zone: ' + esc(zone) + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /mvrv failed:', err);
      await ctx.reply('\u274c MVRV data unavailable');
    }
  });

  b.command('sopr', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/sopr');
      const d = data.data || {};
      const sopr = d.sopr ?? '\u2014';
      const window = d.window || '\u2014';
      const emoji = typeof sopr === 'number' ? (sopr < 1 ? '\ud83d\udfe2' : sopr > 1.15 ? '\ud83d\udd34' : '\ud83d\udfe0') : '';
      await ctx.reply(
        emoji + ' *SOPR*\n\n'
        + 'Value: ' + esc(String(sopr)) + '\n'
        + 'Window: ' + esc(window) + '\n\n'
        + '< 1 = loss selling \\(buy signal\\)\n'
        + '> 1\\.15 = profit taking \\(sell signal\\)' + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /sopr failed:', err);
      await ctx.reply('\u274c SOPR data unavailable');
    }
  });

  b.command('nupl', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/intelligence/nupl');
      const d = data.data || {};
      const nupl = d.nupl ?? '\u2014';
      const zone = d.zone || '\u2014';
      const emoji = typeof nupl === 'number' ? (nupl < 0.25 ? '\ud83d\udfe2' : nupl > 0.75 ? '\ud83d\udd34' : '\ud83d\udfe0') : '';
      await ctx.reply(
        emoji + ' *Net Unrealized P/L*\n\n'
        + 'NUPL: ' + esc(String(nupl)) + '\n'
        + 'Zone: ' + esc(zone) + '\n\n'
        + '< 0\\.25 = capitulation \\(buy\\)\n'
        + '> 0\\.75 = euphoria \\(sell\\)' + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /nupl failed:', err);
      await ctx.reply('\u274c NUPL data unavailable');
    }
  });

  // ---- MULTI-CHAIN ----

  b.command('eth_addr', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || !/^0x[a-fA-F0-9]{40}$/.test(addr)) {
      return ctx.reply('Usage: /eth_addr <0x... address>');
    }
    try {
      const data = await api('/api/v1/eth/address/' + encodeURIComponent(addr));
      const d = data.data || data.balance || {};
      await ctx.reply(
        '\u26a1 *ETH Address*\n\n'
        + '`' + esc(addr.slice(0, 10)) + '\\.\\.\\.' + esc(addr.slice(-8)) + '`\n\n'
        + '\ud83d\udcb0 Balance: ' + esc(d.balance || d.eth || '0') + ' ETH\n'
        + '\ud83d\udcb5 USD: \\$' + esc(d.usd || '0') + '\n'
        + '\ud83d\udcca Transactions: ' + (d.txCount || d.nonce || 0) + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /eth_addr failed:', err);
      await ctx.reply('\u274c ETH address lookup failed');
    }
  });

  b.command('sol_addr', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || addr.length < 32 || addr.length > 44) {
      return ctx.reply('Usage: /sol_addr <Solana address>');
    }
    try {
      const data = await api('/api/v1/sol/address/' + encodeURIComponent(addr));
      const d = data.data || {};
      await ctx.reply(
        '\u26a1 *SOL Address*\n\n'
        + '`' + esc(addr.slice(0, 8)) + '\\.\\.\\.' + esc(addr.slice(-8)) + '`\n\n'
        + '\ud83d\udcb0 SOL: ' + esc(d.sol || d.balance || '0') + '\n'
        + '\ud83d\udcb5 USD: \\$' + esc(d.usd || '0') + '\n'
        + '\ud83d\udcca Transactions: ' + (d.txCount || 0) + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /sol_addr failed:', err);
      await ctx.reply('\u274c SOL address lookup failed');
    }
  });

  b.command('staking', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/staking/status');
      const d = data.data || data;
      await ctx.reply(
        '\ud83d\udcb0 *Staking Status*\n\n'
        + esc(d.status || '\u2014') + '\n'
        + (d.apy ? 'APY: ' + esc(String(d.apy)) + '%\n' : '')
        + (d.tvl ? 'TVL: $' + esc(d.tvl) + '\n' : '')
        + (d.detail ? '\n' + esc(d.detail) : '') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /staking failed:', err);
      await ctx.reply('\u274c Staking data unavailable');
    }
  });

  b.command('threat', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /threat <bitcoin_address>');
    }
    try {
      const data = await api('/api/v1/security/threat/' + encodeURIComponent(addr));
      const d = data.data || {};
      const level = d.threatLevel || d.level || 'unknown';
      const emoji = level === 'low' ? '\ud83d\udfe2' : level === 'medium' ? '\ud83d\udfe1' : level === 'high' ? '\ud83d\udd34' : '\ud83d\udfe0';
      await ctx.reply(
        emoji + ' *Security Threat*\n\n'
        + '`' + esc(addr.slice(0, 12)) + '\\.\\.\\.' + '`\n\n'
        + 'Level: ' + esc(String(level).toUpperCase()) + '\n'
        + (d.indicators ? 'Indicators: ' + esc(d.indicators) + '\n' : '')
        + (d.recommendation ? '\n' + esc(d.recommendation) : '') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /threat failed:', err);
      await ctx.reply('\u274c Threat analysis failed');
    }
  });

  // ---- LEGACY MULTI-CHAIN ----

  b.command('eth_gas', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/eth/gas');
      const d = data.data || {};
      await ctx.reply(
        '\u26fd *ETH Gas*\n\n'
        + '\ud83d\udcb0 Gas Price: ' + esc(d.gasPrice?.gwei || '\u2014') + ' gwei\n'
        + '\ud83c\udfe0 Base Fee: ' + esc(d.baseFee?.gwei || '\u2014') + ' gwei\n'
        + '\ud83d\ude80 Max Fee: ' + esc(d.maxFeePerGas?.gwei || '\u2014') + ' gwei\n'
        + '\u2699\ufe0f Priority: ' + esc(d.maxPriorityFeePerGas?.gwei || '\u2014') + ' gwei\n'
        + '\ud83d\udce6 Block: ' + (d.blockNumber || '\u2014') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /eth_gas failed:', err);
      await ctx.reply('\u274c Failed to fetch ETH gas');
    }
  });

  b.command('sol_fees', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const data = await api('/api/v1/sol/fees');
      const d = data.data || {};
      const pf = d.priorityFees || {};
      await ctx.reply(
        '\u26a1 *SOL Fees*\n\n'
        + '\ud83d\udcca Median Priority: ' + esc(pf.median || '\u2014') + '\n'
        + '\ud83d\udcc8 P75 Priority: ' + esc(pf.p75 || '\u2014') + '\n'
        + '\ud83c\udfaf Base Fee: ' + esc(d.baseFee || '\u2014') + '\n'
        + '\ud83d\ude80 TPS: ' + (d.tps || '\u2014') + '\n'
        + '\ud83d\udce6 Slot: ' + (d.slot || '\u2014') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /sol_fees failed:', err);
      await ctx.reply('\u274c Failed to fetch SOL fees');
    }
  });

  // ---- PREMIUM SUBSCRIPTION ----

  b.command('premium', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const userId = ctx.from?.id || 0;

    await ctx.reply(
      '\u2b50 *BTCFi \u2014 Everything is Free\!*\n\n'
      + 'All features are available to everyone:\\n\n'
      + '\u2022 Unlimited commands\\n'
      + '\u2022 Portfolio tracking \\\\(50 addresses\\\\)\\n'
      + '\u2022 Daily BTC digest\\n'
      + '\u2022 20 advanced alerts\\n'
      + '\u2022 Whale channel alerts\\n\n'
      + '_Direct API access (developers/AI agents) is paid via micropayments._'
      + FOOTER,
      { parse_mode: 'MarkdownV2' }
    );
  });

  // ---- DIGEST (Pro only) ----

  b.command('digest', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const userId = ctx.from?.id || 0;
    
    const sub = (ctx.match?.trim() || '').toLowerCase();

    // /digest enable or /digest disable
    if (sub === 'enable' || sub === 'disable') {
      const enabled = sub === 'enable';
      await setDigestEnabled(userId, enabled);
      return ctx.reply(
        (enabled ? '\u2705' : '\u274c') + ' Daily digest ' + (enabled ? 'enabled' : 'disabled')
        + ' \\(9am UTC\\)' + PLAIN_FOOTER
      );
    }

    // /digest — fetch digest data for everyone
    try {
      const [whaleData, priceData, feeData] = await Promise.all([
        api('/api/v1/intelligence/whales').catch(() => null),
        api('/api/v1/price').catch(() => null),
        api('/api/v1/fees').catch(() => null),
      ]);

      const whales = whaleData?.data?.transactions || [];
      const whaleCount = whales.length;
      const price = priceData?.data?.btc || priceData?.price || {};
      const btcUsd = Math.round(price.usd || price.btcUsd || 0).toLocaleString();
      const fees = feeData?.fees?.recommended || {};
      const enabled = await isDigestEnabled(userId);

      await ctx.reply(
        '\ud83d\udcca *24h BTC Digest*\n\n'
        + '\ud83d\udc0b Whale transactions: ' + whaleCount + '\n'
        + '\ud83d\udcb5 BTC/USD: \\\\$' + esc(btcUsd) + '\n'
        + '\u26fd Fast fee: ' + (fees.fastestFee || '\u2014') + ' sat/vB\n'
        + '\u23f1 Medium fee: ' + (fees.halfHourFee || '\u2014') + ' sat/vB\n\n'
        + '*Recent Whales:*\n'
        + whales.slice(0, 3).map((w: any) =>
          '  \u2022 ' + esc(w.totalValueBtc || '?') + ' BTC \u2014 `' + esc((w.txid || '').slice(0, 10)) + '\\\\.\\\\.\\\\.`'
        ).join('\n') + '\n\n'
        + 'Scheduled digest: ' + (enabled ? '\u2705 ON' : '\u274c OFF') + '\n'
        + '_Use /digest enable to schedule daily at 9am UTC_'
        + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /digest failed:', err);
      await ctx.reply('\u274c Failed to fetch digest data');
    }
  });

  // ---- WATCHLIST COMMANDS (MP5 Phase 5) ----

  b.command('watch', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /watch <bitcoin_address>');
    }
    try {
      const chatId = String(ctx.chat.id);
      const result = await addWatch(chatId, addr);
      await ctx.reply((result.ok ? '\u2705 ' + result.message : '\u274c ' + result.message) + PLAIN_FOOTER);
    } catch (err) {
      console.error('[Telegram] /watch failed:', err);
      await ctx.reply('\u274c Failed to add watch');
    }
  });

  b.command('unwatch', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const addr = ctx.match?.trim();
    if (!addr || !looksLikeBtcAddress(addr)) {
      return ctx.reply('Usage: /unwatch <bitcoin_address>');
    }
    try {
      const chatId = String(ctx.chat.id);
      const result = await removeWatch(chatId, addr);
      await ctx.reply('\u2705 ' + result.message + PLAIN_FOOTER);
    } catch (err) {
      console.error('[Telegram] /unwatch failed:', err);
      await ctx.reply('\u274c Failed to remove watch');
    }
  });

  b.command('watchlist', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    try {
      const chatId = String(ctx.chat.id);
      const addresses = await getWatchlist(chatId);
      if (!addresses.length) {
        return ctx.reply('\ud83d\udccd No watched addresses\\. Use /watch to add one\\.', { parse_mode: 'MarkdownV2' });
      }
      const alertsOn = await getAlerts(chatId);
      const lines = addresses.map((a, i) => i + 1 + '\\. \\`' + esc(a.slice(0, 16)) + '\\.\\.\\.\\`');
      await ctx.reply(
        '\ud83d\udccd *Your Watchlist* \\(' + addresses.length + '/5\\)\n\n'
        + lines.join('\n') + '\n\n'
        + 'Alerts: ' + (alertsOn ? '\u2705 ON' : '\u274c OFF')
        + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    } catch (err) {
      console.error('[Telegram] /watchlist failed:', err);
      await ctx.reply('\u274c Failed to fetch watchlist');
    }
  });

  b.command('alerts', async (ctx) => {
    if (!await checkCommandRateLimit(ctx.from?.id || 0)) {
      return ctx.reply('\u23f0 Rate limit exceeded. Try again in a minute.');
    }
    const userId = ctx.from?.id || 0;
    const raw = (ctx.match?.trim() || '').toLowerCase();
    const parts = (ctx.match?.trim() || '').split(/\s+/);

    // /alerts on or /alerts off — legacy toggle
    if (raw === 'on' || raw === 'off') {
      try {
        const chatId = String(ctx.chat.id);
        await setAlerts(chatId, raw === 'on');
        await ctx.reply((raw === 'on'
          ? "\u2705 Alerts enabled \u2014 you'll get DMs when watched balances change"
          : "\u274c Alerts disabled") + PLAIN_FOOTER);
      } catch (err) {
        console.error('[Telegram] /alerts failed:', err);
        await ctx.reply('\u274c Failed to update alerts');
      }
      return;
    }

    // /alerts list — show active alerts
    if (parts[0] === 'list') {
      const alerts = await getAlertList(userId);
      if (!alerts.length) {
        return ctx.reply(
          '\ud83d\udce1 *No active alerts*\n\n'
          + 'Create alerts with:\n'
          + '/alerts whale <min\\_btc>\n'
          + '/alerts price <above|below> <price>\n'
          + '/alerts fee <above> <sat\\_vb>'
          + PLAIN_FOOTER,
          { parse_mode: 'MarkdownV2' }
        );
      }
      const lines = alerts.map((a) => {
        let desc = '';
        if (a.type === 'whale') desc = 'Whale tx >= ' + a.threshold + ' BTC';
        else if (a.type === 'price') desc = 'Price ' + a.threshold;
        else if (a.type === 'fee') desc = 'Fee ' + a.threshold + ' sat/vB';
        return '`' + esc(a.id) + '` \u2014 ' + esc(desc);
      });
      
      const max = MAX_ALERTS;
      return ctx.reply(
        '\ud83d\udce1 *Your Alerts* \\\\( ' + alerts.length + '/' + max + ' \\\)\n\n'
        + lines.join('\n') + FOOTER,
        { parse_mode: 'MarkdownV2' }
      );
    }

    // /alerts remove <id>
    if (parts[0] === 'remove') {
      const alertId = parts[1];
      if (!alertId) {
        return ctx.reply('Usage: /alerts remove <alert_id>');
      }
      const result = await removeAlert(userId, alertId);
      return ctx.reply((result.ok ? '\u2705 ' : '\u274c ') + result.message + PLAIN_FOOTER);
    }

    // /alerts whale <min_btc>
    if (parts[0] === 'whale') {
      const minBtc = parts[1];
      if (!minBtc || isNaN(parseFloat(minBtc))) {
        return ctx.reply('Usage: /alerts whale <min_btc>\nExample: /alerts whale 100');
      }
      const result = await addAlert(userId, 'whale', minBtc);
      return ctx.reply((result.ok ? '\u2705 ' : '\u274c ') + result.message + PLAIN_FOOTER);
    }

    // /alerts price <above|below> <price>
    if (parts[0] === 'price') {
      const direction = parts[1];
      const price = parts[2];
      if (!direction || !price || (direction !== 'above' && direction !== 'below')) {
        return ctx.reply('Usage: /alerts price <above|below> <price>\nExample: /alerts price above 100000');
      }
      const result = await addAlert(userId, 'price', direction + ' ' + price);
      return ctx.reply((result.ok ? '\u2705 ' : '\u274c ') + result.message + PLAIN_FOOTER);
    }

    // /alerts fee <above> <sat_vb>
    if (parts[0] === 'fee') {
      const direction = parts[1];
      const satVb = parts[2];
      if (!direction || !satVb || direction !== 'above') {
        return ctx.reply('Usage: /alerts fee <above> <sat_vb>\nExample: /alerts fee above 50');
      }
      const result = await addAlert(userId, 'fee', satVb + ' sat/vB');
      return ctx.reply((result.ok ? '\u2705 ' : '\u274c ') + result.message + PLAIN_FOOTER);
    }

    // Default: show help
    
    const max = MAX_ALERTS;
    const alerts = await getAlertList(userId);
    await ctx.reply(
      '\ud83d\udce1 *Advanced Alerts*\n\n'
      + 'Active: ' + alerts.length + '/' + max + '\n\n'
      + '*Create:*\n'
      + '/alerts whale <min\\_btc> \u2014 Whale tx threshold\n'
      + '/alerts price <above|below> <usd> \u2014 Price crossing\n'
      + '/alerts fee <above> <sat\\_vb> \u2014 Fee spike\n\n'
      + '*Manage:*\n'
      + '/alerts list \u2014 Show active alerts\n'
      + '/alerts remove <id> \u2014 Remove alert\n\n'
      + '*Legacy:*\n'
      + '/alerts on \u2014 Enable watch alerts\n'
      + '/alerts off \u2014 Disable watch alerts'
      + FOOTER,
      { parse_mode: 'MarkdownV2' }
    );
  });

  // ---- CALLBACK QUERY HANDLERS ----

  b.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;

    // Price-related callbacks
    if (data === 'price_expand' || data === 'price_simple' || data === 'price_refresh') {
      try {
        await ctx.answerCallbackQuery(); // acknowledge the callback immediately

        const btcData = await fetchCoinGeckoPrices();
        // Determine current view from existing message buttons
        const currentButtons = ctx.callbackQuery.message?.reply_markup?.inline_keyboard as { callback_data?: string }[][] | undefined;
        const currentView = currentButtons?.[0]?.[0]?.callback_data === 'price_simple' ? 'expanded' : 'simple';
        const showExpanded = data === 'price_expand' || (data === 'price_refresh' && currentView === 'expanded');

        const text = showExpanded
          ? buildExpandedPriceText(btcData) + HTML_PRICE_FOOTER
          : buildSimplePriceText(btcData) + HTML_PRICE_FOOTER;
        const keyboard = showExpanded ? PRICE_EXPANDED_KB : PRICE_SIMPLE_KB;

        if (ctx.callbackQuery.message) {
          await ctx.api.editMessageText(
            ctx.callbackQuery.message.chat.id,
            ctx.callbackQuery.message.message_id,
            text,
            { parse_mode: 'HTML', reply_markup: keyboard }
          );
        }
      } catch (err) {
        console.error('[Telegram] price callback failed:', err);
        await ctx.answerCallbackQuery({ text: 'Failed to refresh price', show_alert: true }).catch(() => {});
      }
      return;
    }
  });

  // ---- INLINE QUERY ----

  b.on('inline_query', async (ctx) => {
    // Rate limit: 10 inline queries per minute per user
    try {
      const redis = getRedis();
      const rlKey = `tg:inline:${ctx.from?.id}`;
      const count = await redis.incr(rlKey);
      if (count === 1) await redis.expire(rlKey, 60);
      if (count > 10) return;
    } catch { /* fail open — skip rate limit on Redis error */ }

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
    } catch {
      console.error('[Telegram] Inline query failed');
      /* ignore inline failures */
    }
  });
}
