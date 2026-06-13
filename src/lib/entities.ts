/**
 * Bitcoin Entity Labels
 * Open-source address label database for known entities.
 */

export interface EntityInfo {
  address: string;
  entity: string;
  type: 'exchange' | 'miner' | 'pool' | 'service' | 'unknown';
  confidence: number;
}

// Curated from public blockchain explorers
const ENTITY_DB: Record<string, Omit<EntityInfo, 'address'>> = {
  '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo': { entity: 'Coinbase', type: 'exchange', confidence: 0.95 },
  '3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS': { entity: 'Coinbase', type: 'exchange', confidence: 0.95 },
  'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s37': { entity: 'Binance', type: 'exchange', confidence: 0.90 },
  'bc1qyq6sey58nckz3ry3gz29zrdmfqv0r8r7s4ys4g': { entity: 'Foundry', type: 'pool', confidence: 0.90 },
  '12tkqA9xSoowkzoERHMWNKsTey55YEBqkv': { entity: 'AntPool', type: 'pool', confidence: 0.90 },
  '1LRnCgBzVMVx8UCB4eV6T3Q8mJ7qQ8d6qz': { entity: 'BitMEX', type: 'exchange', confidence: 0.90 },
};

export function getEntityLabel(address: string): EntityInfo | null {
  const match = ENTITY_DB[address];
  if (!match) return null;
  return { address, ...match };
}

export function getEntityStats() {
  const entities = Object.values(ENTITY_DB);
  return {
    totalLabeled: Object.keys(ENTITY_DB).length,
    byType: {
      exchange: entities.filter(e => e.type === 'exchange').length,
      miner: entities.filter(e => e.type === 'miner').length,
      pool: entities.filter(e => e.type === 'pool').length,
      service: entities.filter(e => e.type === 'service').length,
    },
  };
}
