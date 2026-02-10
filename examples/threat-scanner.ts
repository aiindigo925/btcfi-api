/**
 * Threat Scanner — Example Agent
 *
 * Monitors a list of addresses for threat patterns using YARA analysis.
 * Alerts on high-risk findings.
 *
 * Usage:
 *   npx tsx examples/threat-scanner.ts
 */

import BTCFi from '../sdk/src/index';

const btcfi = new BTCFi({ baseUrl: 'https://btcfi.aiindigo.com' });

// Addresses to monitor (replace with your watchlist)
const WATCHLIST = [
  'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa', // Satoshi's address
  '3FZbgi29cpjq2GjdwV8eyHuJJnkLtktZc5',
];

async function scanAddress(address: string) {
  console.log(`\n🔍 Scanning: ${address}`);

  try {
    // Threat analysis
    const threat = await btcfi.getThreatAnalysis(address);
    if (!threat.success) {
      console.log(`  ❌ Scan failed`);
      return;
    }

    const { threatLevel, overallScore, matchedPatterns } = threat.data;
    const icon = overallScore > 70 ? '🔴' : overallScore > 40 ? '🟡' : '🟢';

    console.log(`  ${icon} Risk: ${threatLevel} (score: ${overallScore}/100)`);

    // Show matched patterns
    if (matchedPatterns.length > 0) {
      console.log(`  ⚠️  Matched patterns:`);
      matchedPatterns.forEach((p: any) => console.log(`     - ${p.pattern.name} (${p.pattern.severity})`));
    } else {
      console.log(`  ✅ No threat patterns detected`);
    }

    // Also check address risk
    const risk = await btcfi.getAddressRisk(address);
    if (risk.success && risk.data) {
      console.log(`  📊 Risk profile:`, JSON.stringify(risk.data).slice(0, 120) + '...');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('402')) {
      console.log(`  💰 Payment required — configure x402 payment headers`);
    } else {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
}

async function main() {
  console.log('🛡️  BTCFi Threat Scanner');
  console.log(`   Watchlist: ${WATCHLIST.length} addresses`);
  console.log('   Powered by YARA patterns + risk analysis');
  console.log('─'.repeat(50));

  for (const address of WATCHLIST) {
    await scanAddress(address);
  }

  console.log('\n' + '─'.repeat(50));
  console.log('✅ Scan complete');
}

main().catch(console.error);
