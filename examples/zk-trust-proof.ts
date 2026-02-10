/**
 * ZK Trust Proof Example — BTCFi SDK
 *
 * Agent A proves to Agent B that a Bitcoin address has balance >= threshold
 * without revealing the exact balance. Agent B verifies the proof independently.
 */

import BTCFi from '@aiindigo/btcfi';

const btcfi = new BTCFi({
  paymentNetwork: 'base',
  evmPrivateKey: process.env.EVM_PRIVATE_KEY,
});

async function main() {
  const address = 'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq';

  // Agent A: Generate balance proof
  console.log('Generating balance proof...');
  const proof = await btcfi.generateBalanceProof(address, 100000, 'sats');
  console.log(`Proof type: ${proof.proofType}`);
  console.log(`Meets threshold: ${proof.verified}`);
  console.log(`Proof time: ${proof.proofTimeMs}ms`);

  // Agent A sends { proof, publicInputs, proofType } to Agent B
  const payload = {
    proofType: proof.proofType,
    proof: proof.proof,
    publicInputs: proof.publicInputs,
  };

  // Agent B: Verify the proof (no need to access the address)
  console.log('\nVerifying proof...');
  const verification = await btcfi.verifyProof(
    payload.proofType,
    payload.proof as any,
    payload.publicInputs
  );
  console.log(`Verified: ${verification.verified}`);
  console.log(`Checks: ${verification.checks.join(', ')}`);

  // UTXO age proof — prove address has old coins
  console.log('\nGenerating UTXO age proof...');
  const ageProof = await btcfi.generateAgeProof(address, 1000);
  console.log(`Has UTXOs >= 1000 blocks old: ${ageProof.verified}`);
  console.log(`Qualifying UTXOs: ${(ageProof.metadata as any).qualifyingCount}`);
}

main().catch(console.error);
