/**
 * Portfolio Risk Agent — Example
 *
 * Analyzes risk for a Bitcoin address: UTXOs, risk score, threat analysis.
 * Run: npx tsx examples/portfolio-risk.ts <address>
 */
import BTCFi from '@aiindigo/btcfi';

const btcfi = new BTCFi();
const address = process.argv[2] || '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa'; // Satoshi's address

async function main() {
  console.log(`🔍 Portfolio Risk Analysis: ${address}\n`);

  // Parallel fetch
  const [addrInfo, risk, threat, utxos] = await Promise.allSettled([
    btcfi.getAddress(address),
    btcfi.getAddressRisk(address),
    btcfi.getThreatAnalysis(address),
    btcfi.getUtxos(address),
  ]);

  if (addrInfo.status === 'fulfilled' && addrInfo.value.success) {
    const info = addrInfo.value;
    console.log('📊 Address Info:');
    console.log(`  Balance: ${JSON.stringify(info.balance)}`);
  }

  if (utxos.status === 'fulfilled' && utxos.value.success) {
    const u = utxos.value.utxos;
    console.log(`\n💎 UTXOs: ${u.length}`);
    const dust = u.filter((x: any) => x.value < 10000);
    if (dust.length > 0) {
      console.log(`  ⚠️  ${dust.length} dust UTXOs (<10k sats) — consider consolidation`);
    }
  }

  if (risk.status === 'fulfilled' && risk.value.success) {
    console.log('\n🎯 Risk Assessment:');
    console.log(JSON.stringify(risk.value.data, null, 2));
  }

  if (threat.status === 'fulfilled' && threat.value.success) {
    console.log('\n🛡️ Threat Analysis:');
    console.log(JSON.stringify(threat.value.data, null, 2));
  }
}

main().catch(console.error);
