const API = 'https://btcfi.aiindigo.com';
const content = document.getElementById('content');

async function load() {
  try {
    const [feesRes, mempoolRes] = await Promise.all([
      fetch(`${API}/api/v1/fees`).then(r => r.json()),
      fetch(`${API}/api/v1/mempool`).then(r => r.json()),
    ]);

    const price = feesRes?.price?.btcUsd || 0;
    const eur = feesRes?.price?.btcEur || 0;
    const fees = feesRes?.fees?.recommended || {};
    const mempool = mempoolRes?.mempool || {};

    content.innerHTML = `
      <div class="card">
        <div class="row">
          <div>
            <div class="label">BTC Price</div>
            <div class="value orange">$${price.toLocaleString()}</div>
            <div class="sub">€${eur.toLocaleString()}</div>
          </div>
          <div style="text-align: right">
            <div class="label">Mempool</div>
            <div class="value" style="font-size: 14px">${(mempool.count || 0).toLocaleString()}</div>
            <div class="sub">${mempool.vsizeMB || '—'} MB</div>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="label" style="margin-bottom: 8px">Fee Estimates (sat/vB)</div>
        <div class="fees">
          <div class="fee-item">
            <div class="fee-rate">${fees.fastestFee || '—'}</div>
            <div class="fee-label">Fast</div>
          </div>
          <div class="fee-item">
            <div class="fee-rate">${fees.halfHourFee || '—'}</div>
            <div class="fee-label">30 min</div>
          </div>
          <div class="fee-item">
            <div class="fee-rate">${fees.hourFee || '—'}</div>
            <div class="fee-label">1 hour</div>
          </div>
        </div>
      </div>
    `;
  } catch {
    content.innerHTML = '<div class="loading">Failed to load data</div>';
  }
}

load();
