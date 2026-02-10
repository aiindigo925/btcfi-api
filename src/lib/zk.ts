/**
 * BTCFi ZK Proof Library — MP3 Phase 19
 *
 * Privacy-preserving verification for agent-to-agent trust.
 * Simulated Groth16 proofs — production needs compiled circom circuits.
 *
 * Proof types:
 *   - Balance range: prove balance > threshold without revealing exact balance
 *   - UTXO age: prove UTXOs older than N blocks without revealing which
 *   - Set membership: prove address in set without revealing which address
 */

import { getAddressInfo, getAddressUtxos, getBlockHeight, fetchBitcoinData } from './bitcoin';

// ============ TYPES ============

export interface ZKProof {
  pi_a: string[];
  pi_b: string[][];
  pi_c: string[];
  protocol: string;
  curve: string;
}

export interface ProofResult {
  proof: ZKProof;
  publicInputs: string[];
  verified: boolean;
  proofType: string;
  proofTimeMs: number;
  metadata: Record<string, unknown>;
}

export interface BalanceProofRequest {
  address: string;
  threshold: number;
  unit: 'btc' | 'sats';
}

export interface AgeProofRequest {
  address: string;
  minBlocks: number;
}

export interface MembershipProofRequest {
  address: string;
  setRoot: string;
  merkleProof: string[];
}

// ============ CRYPTO PRIMITIVES ============

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function fieldHash(...inputs: string[]): Promise<string> {
  return sha256(inputs.join(':'));
}

function fieldElement(seed: string, index: number): string {
  const chars = '0123456789';
  let result = '';
  let hash = 0;
  const seedStr = `${seed}:${index}`;
  for (let i = 0; i < seedStr.length; i++) {
    hash = ((hash << 5) - hash + seedStr.charCodeAt(i)) | 0;
  }
  for (let i = 0; i < 76; i++) {
    hash = ((hash << 5) - hash + i) | 0;
    result += chars[Math.abs(hash) % 10];
  }
  return result.replace(/^0+/, '') || '1';
}

function buildProof(proofType: string, privateSeed: string): ZKProof {
  const seed = `${proofType}:${privateSeed}:${Date.now()}`;
  return {
    pi_a: [fieldElement(seed, 0), fieldElement(seed, 1), '1'],
    pi_b: [
      [fieldElement(seed, 2), fieldElement(seed, 3)],
      [fieldElement(seed, 4), fieldElement(seed, 5)],
      ['1', '0'],
    ],
    pi_c: [fieldElement(seed, 6), fieldElement(seed, 7), '1'],
    protocol: 'groth16',
    curve: 'bn128',
  };
}

export function verifyProofStructure(proof: ZKProof): boolean {
  if (proof.protocol !== 'groth16' || proof.curve !== 'bn128') return false;
  if (!Array.isArray(proof.pi_a) || proof.pi_a.length !== 3) return false;
  if (!Array.isArray(proof.pi_b) || proof.pi_b.length !== 3) return false;
  if (!Array.isArray(proof.pi_c) || proof.pi_c.length !== 3) return false;
  const allA = proof.pi_a.every(e => typeof e === 'string' && e.length > 0);
  const allB = proof.pi_b.every(row => Array.isArray(row) && row.every(e => typeof e === 'string' && e.length > 0));
  const allC = proof.pi_c.every(e => typeof e === 'string' && e.length > 0);
  return allA && allB && allC;
}

// ============ MERKLE TREE ============

async function computeMerkleRoot(leaves: string[]): Promise<string> {
  if (leaves.length === 0) return await sha256('empty');
  let layer = [...leaves];
  while (layer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < layer.length; i += 2) {
      const left = layer[i];
      const right = layer[i + 1] || left;
      nextLayer.push(await sha256(left + right));
    }
    layer = nextLayer;
  }
  return layer[0];
}

async function verifyMerkleProof(leaf: string, proof: string[], root: string): Promise<boolean> {
  let current = leaf;
  for (const sibling of proof) {
    current = await sha256(current + sibling);
  }
  return current === root;
}

// ============ PROOF GENERATORS ============

export async function generateBalanceProof(req: BalanceProofRequest): Promise<ProofResult> {
  const start = Date.now();

  const addressData = await getAddressInfo(req.address);
  if (!addressData) throw new Error('Failed to fetch address data');

  const stats = addressData.chain_stats;
  const balanceSats = (stats.funded_txo_sum || 0) - (stats.spent_txo_sum || 0);
  const thresholdSats = req.unit === 'btc' ? Math.floor(req.threshold * 1e8) : req.threshold;
  const meetsThreshold = balanceSats >= thresholdSats;

  const salt = crypto.randomUUID();
  const commitment = await fieldHash(req.address, balanceSats.toString(), salt);

  const publicInputs = [thresholdSats.toString(), commitment, meetsThreshold ? '1' : '0'];
  const proof = buildProof('balance', `${req.address}:${balanceSats}:${salt}`);

  return {
    proof, publicInputs, verified: meetsThreshold,
    proofType: 'balance_range', proofTimeMs: Date.now() - start,
    metadata: { address: req.address, threshold: req.threshold, unit: req.unit, meetsThreshold, commitment },
  };
}

export async function generateAgeProof(req: AgeProofRequest): Promise<ProofResult> {
  const start = Date.now();

  const utxos = await fetchBitcoinData(`/address/${req.address}/utxo`);
  if (!utxos || !Array.isArray(utxos)) throw new Error('Failed to fetch UTXOs');

  const tipHeight = await fetchBitcoinData('/blocks/tip/height');
  const currentHeight = typeof tipHeight === 'number' ? tipHeight : parseInt(String(tipHeight), 10) || 880000;

  const confirmedUtxos = utxos.filter((u: any) => u.status?.confirmed && u.status?.block_height);
  const qualifyingUtxos = confirmedUtxos.filter((u: any) => (currentHeight - u.status.block_height) >= req.minBlocks);
  const hasOldUtxos = qualifyingUtxos.length > 0;
  const oldestAge = qualifyingUtxos.length > 0
    ? Math.max(...qualifyingUtxos.map((u: any) => currentHeight - u.status.block_height))
    : 0;

  const utxoLeaves = confirmedUtxos.map((u: any) => `${u.txid}:${u.vout}:${u.status.block_height}`);
  const merkleRoot = utxoLeaves.length > 0 ? await computeMerkleRoot(utxoLeaves) : 'empty';

  const publicInputs = [req.minBlocks.toString(), currentHeight.toString(), hasOldUtxos ? '1' : '0', merkleRoot];
  const proof = buildProof('age', `${req.address}:${JSON.stringify(utxoLeaves)}`);

  return {
    proof, publicInputs, verified: hasOldUtxos,
    proofType: 'utxo_age', proofTimeMs: Date.now() - start,
    metadata: {
      address: req.address, minBlocks: req.minBlocks, currentHeight,
      qualifyingCount: qualifyingUtxos.length, totalUtxos: confirmedUtxos.length,
      oldestQualifyingAge: oldestAge, utxoMerkleRoot: merkleRoot,
    },
  };
}

export async function generateMembershipProof(req: MembershipProofRequest): Promise<ProofResult> {
  const start = Date.now();

  const addressHash = await sha256(req.address);
  const isMember = await verifyMerkleProof(addressHash, req.merkleProof, req.setRoot);
  const nullifier = await fieldHash(req.address, req.setRoot, 'nullifier');

  const publicInputs = [req.setRoot, nullifier, isMember ? '1' : '0'];
  const proof = buildProof('membership', `${req.address}:${req.setRoot}`);

  return {
    proof, publicInputs, verified: isMember,
    proofType: 'set_membership', proofTimeMs: Date.now() - start,
    metadata: { setRoot: req.setRoot, nullifier, isMember, proofDepth: req.merkleProof.length },
  };
}

// ============ VERIFIER ============

export async function verifyProof(
  proofType: string, proof: ZKProof, publicInputs: string[]
): Promise<{ verified: boolean; proofType: string; checks: string[] }> {
  const checks: string[] = [];

  if (!verifyProofStructure(proof)) return { verified: false, proofType, checks: ['FAIL: Invalid proof structure'] };
  checks.push('PASS: Valid Groth16 structure');

  if (proof.protocol !== 'groth16') return { verified: false, proofType, checks: [...checks, 'FAIL: Unsupported protocol'] };
  checks.push('PASS: Groth16 protocol');

  if (proof.curve !== 'bn128') return { verified: false, proofType, checks: [...checks, 'FAIL: Unsupported curve'] };
  checks.push('PASS: BN128 curve');

  if (!Array.isArray(publicInputs) || publicInputs.length === 0)
    return { verified: false, proofType, checks: [...checks, 'FAIL: Missing public inputs'] };
  checks.push(`PASS: ${publicInputs.length} public inputs`);

  const expectedLengths: Record<string, number> = { balance_range: 3, utxo_age: 4, set_membership: 3 };
  if (expectedLengths[proofType] && publicInputs.length !== expectedLengths[proofType]) {
    checks.push(`FAIL: ${proofType} requires ${expectedLengths[proofType]} public inputs`);
    return { verified: false, proofType, checks };
  }
  checks.push(`PASS: ${proofType} format valid`);

  const resultInput = publicInputs[publicInputs.length - 1];
  checks.push(`PASS: Claimed result: ${resultInput === '1'}`);

  return { verified: true, proofType, checks };
}

// ============ UTILITY ============

export async function buildAddressSet(addresses: string[]): Promise<{
  root: string;
  proofs: Map<string, string[]>;
}> {
  const leaves = await Promise.all(addresses.map(a => sha256(a)));
  const layers: string[][] = [leaves];
  let currentLayer = leaves;

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1] || left;
      nextLayer.push(await sha256(left + right));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  const root = currentLayer[0];
  const proofs = new Map<string, string[]>();

  for (let i = 0; i < addresses.length; i++) {
    const proof: string[] = [];
    let idx = i;
    for (let layer = 0; layer < layers.length - 1; layer++) {
      const siblingIdx = idx % 2 === 0 ? idx + 1 : idx - 1;
      proof.push(layers[layer][siblingIdx] || layers[layer][idx]);
      idx = Math.floor(idx / 2);
    }
    proofs.set(addresses[i], proof);
  }

  return { root, proofs };
}
