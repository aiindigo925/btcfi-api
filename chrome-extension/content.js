/**
 * BTCFi Content Script — detects BTC addresses on pages
 * Adds hover tooltip with balance on detected addresses.
 */

const BTC_REGEX = /\b(bc1[a-zA-HJ-NP-Z0-9]{39,62}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})\b/g;
const API = 'https://btcfi.aiindigo.com';
const cache = new Map();

function createTooltip() {
  const tip = document.createElement('div');
  tip.id = 'btcfi-tooltip';
  tip.style.cssText = 'position:fixed;background:#111;color:#e0e0e0;border:1px solid #f7931a;border-radius:6px;padding:8px 12px;font-family:monospace;font-size:12px;z-index:999999;pointer-events:none;display:none;max-width:300px;box-shadow:0 4px 12px rgba(0,0,0,0.5)';
  document.body.appendChild(tip);
  return tip;
}

let tooltip = null;

async function showBalance(addr, x, y) {
  if (!tooltip) tooltip = createTooltip();

  // Position
  tooltip.style.left = Math.min(x, window.innerWidth - 310) + 'px';
  tooltip.style.top = (y + 20) + 'px';
  tooltip.style.display = 'block';

  if (cache.has(addr)) {
    tooltip.innerHTML = cache.get(addr);
    return;
  }

  tooltip.textContent = 'Loading...';

  try {
    const res = await fetch(`${API}/api/v1/safe?addr=${encodeURIComponent(addr)}`);
    const data = await res.json();
    const risk = data?.data;
    const html = risk
      ? `<div style="color:#f7931a;margin-bottom:4px">₿ ${addr.slice(0, 12)}...</div>`
        + `<div>Risk: <span style="color:${risk.overallScore <= 30 ? '#4ade80' : '#ef4444'}">${risk.overallScore}/100 (${risk.threatLevel})</span></div>`
        + `<div style="color:#888;font-size:10px;margin-top:4px">Click for full report</div>`
      : `<div style="color:#888">No data</div>`;
    tooltip.innerHTML = html;
    cache.set(addr, html);
  } catch {
    tooltip.textContent = 'Failed to load';
  }
}

// Scan page for BTC addresses
function scanPage() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const matches = new Set();

  while (walker.nextNode()) {
    const text = walker.currentNode.textContent || '';
    let match;
    BTC_REGEX.lastIndex = 0;
    while ((match = BTC_REGEX.exec(text)) !== null) {
      matches.add(match[0]);
    }
  }

  if (matches.size === 0) return;

  // Add hover listeners to elements containing BTC addresses
  matches.forEach(addr => {
    const elements = document.querySelectorAll('*');
    for (const el of elements) {
      if (el.childNodes.length === 1 && el.childNodes[0].nodeType === 3 && el.textContent?.includes(addr)) {
        el.style.cursor = 'help';
        el.style.borderBottom = '1px dashed #f7931a33';
        el.addEventListener('mouseenter', (e) => showBalance(addr, e.clientX, e.clientY));
        el.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.display = 'none'; });
        el.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(`${API}/safe?addr=${encodeURIComponent(addr)}`, '_blank');
        });
        break; // Only first match per address
      }
    }
  });
}

// Run after page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(scanPage, 1000));
} else {
  setTimeout(scanPage, 1000);
}
