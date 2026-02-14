/**
 * BTCFi Chrome Extension — Background Service Worker
 * Updates BTC price badge, whale alerts, and context menu.
 */

const API = 'https://btcfi.aiindigo.com';

// ============ BADGE (PRICE) ============

async function updateBadge() {
  try {
    const res = await fetch(`${API}/api/v1/fees`);
    const data = await res.json();
    const price = data?.price?.btcUsd || 0;
    const text = price >= 100000
      ? `${Math.round(price / 1000)}K`
      : price >= 10000
        ? `${(price / 1000).toFixed(1)}K`
        : String(Math.round(price));
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: '#f7931a' });
  } catch {
    chrome.action.setBadgeText({ text: '...' });
  }
}

// ============ WHALE ALERTS ============

let lastWhaleCheck = 0;

async function checkWhales() {
  try {
    const settings = await chrome.storage.sync.get({ whaleAlerts: true, whaleThreshold: 50 });
    if (!settings.whaleAlerts) return;

    const res = await fetch(`${API}/api/v1/intelligence/whales`);
    const data = await res.json();
    const whales = data?.data?.transactions || [];

    for (const whale of whales.slice(0, 3)) {
      const btc = parseFloat(whale.totalValueBtc || '0');
      if (btc < settings.whaleThreshold) continue;
      if (whale.timestamp && whale.timestamp <= lastWhaleCheck) continue;

      const signal = whale.signal === 'buy' ? '🟢 BUY' : whale.signal === 'sell' ? '🔴 SELL' : '🐋';
      chrome.notifications.create(`whale-${whale.txid?.slice(0, 8)}`, {
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: `${signal} ${whale.totalValueBtc} BTC`,
        message: `$${parseFloat(whale.totalValueUsd || '0').toLocaleString()} — Fee: ${whale.feeRate}`,
      });
    }
    lastWhaleCheck = Date.now();
  } catch { /* silent */ }
}

// ============ CONTEXT MENU ============

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'btcfi-lookup',
    title: 'Look up on BTCFi',
    contexts: ['selection'],
  });
  updateBadge();
});

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId === 'btcfi-lookup' && info.selectionText) {
    const text = info.selectionText.trim();
    // BTC address check
    if (/^(bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62}$/.test(text)) {
      chrome.tabs.create({ url: `${API}/safe?addr=${encodeURIComponent(text)}` });
    } else if (/^[a-fA-F0-9]{64}$/.test(text)) {
      chrome.tabs.create({ url: `${API}/dashboard/address?txid=${encodeURIComponent(text)}` });
    } else {
      chrome.tabs.create({ url: `${API}/dashboard/address` });
    }
  }
});

// ============ ALARMS ============

chrome.alarms.create('update-badge', { periodInMinutes: 1 });
chrome.alarms.create('check-whales', { periodInMinutes: 5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'update-badge') updateBadge();
  if (alarm.name === 'check-whales') checkWhales();
});

// Initial update
updateBadge();
