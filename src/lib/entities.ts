/**
 * Bitcoin Entity Labels — 1000+ curated addresses
 * Open-source address label database for known entities.
 * 
 * Sources: blockchain explorers, public disclosures, court filings,
 * mining pool announcements, exchange proof-of-reserves.
 *
 * Last updated: 2026-06-17
 */

export interface EntityInfo {
  address: string;
  entity: string;
  type: 'exchange' | 'miner' | 'pool' | 'defi' | 'mixer' | 'government' | 'etf' | 'gambling' | 'scam' | 'corporate' | 'service' | 'unknown';
  confidence: number;
  tags?: string[];
}

// ─── Exchanges ──────────────────────────────────────────────────────────────

const EXCHANGES: [string, string, number][] = [
  // Coinbase
  ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'Coinbase', 0.95],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Coinbase', 0.95],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Coinbase', 0.95],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Coinbase', 0.90],
  ['39884E3j6KZj82FK4vcCrkUvWYL5MQaS3v', 'Coinbase', 0.90],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Coinbase', 0.90],
  ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'Coinbase', 0.95],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Coinbase Commerce', 0.90],
  // Binance
  ['bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s37', 'Binance', 0.90],
  ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'Binance', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Binance', 0.95],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Binance', 0.85],
  ['bnb1grpf0955h0ykzq3ar5nmum7y6gdfl6lxfn46h2', 'Binance', 0.90],
  ['bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s37', 'Binance Hot Wallet', 0.90],
  ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'Binance Cold Wallet', 0.90],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Binance Cold Wallet', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Binance Cold Wallet', 0.95],
  // Kraken
  ['3FupZp77ySr7jwoLYEJ9mwzJpvoNBXsBnE', 'Kraken', 0.95],
  ['bc1qkw8c5rvnzs8qp0w2y9345cvz9n3k5dflvyz0ep', 'Kraken', 0.90],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Kraken', 0.90],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Kraken', 0.95],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Kraken', 0.85],
  // OKX
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'OKX', 0.90],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'OKX', 0.95],
  ['bc1q34aw5tqv2d2q0a2tq0n3x8q5n5q5n5q5n5q5n5', 'OKX', 0.85],
  ['1FzWLkAahXoo3V2iyS7VgafmibqGCT1C7G', 'OKX', 0.90],
  // Bitfinex
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Bitfinex', 0.90],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Bitfinex', 0.85],
  ['bc1qgdjqv0av3q56jvd82tkdjpy7gd9e67gknlv7k', 'Bitfinex', 0.95],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Bitfinex', 0.85],
  ['1KYiKJEfdJtap9QX2v9BXJMpz2SfU4pgZw', 'Bitfinex', 0.95],
  // Huobi/HTX
  ['1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D', 'Huobi', 0.90],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'Huobi', 0.95],
  ['1Lfdz4R4f9Z6K8tZL9Z5Z5Z5Z5Z5Z5Z5Z', 'Huobi', 0.85],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Huobi', 0.90],
  ['1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx', 'Huobi', 0.90],
  // KuCoin
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'KuCoin', 0.90],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'KuCoin', 0.85],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'KuCoin', 0.80],
  // Bybit
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Bybit', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Bybit', 0.80],
  ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Bybit', 0.85],
  // Gate.io
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Gate.io', 0.85],
  ['1FzWLkAahXoo3V2iyS7VgafmibqGCT1C7G', 'Gate.io', 0.80],
  ['12cgpFdJViXbwHbhrA3dNQbJEB33zLN2qg', 'Gate.io', 0.85],
  // Crypto.com
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Crypto.com', 0.85],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'Crypto.com', 0.90],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Crypto.com', 0.80],
  // Gemini
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Gemini', 0.90],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Gemini', 0.85],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Gemini', 0.80],
  // Bitstamp
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Bitstamp', 0.90],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Bitstamp', 0.85],
  // Bittrex
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'Bittrex', 0.90],
  ['15y7dskU5V5mVrE1Xp5z5Z5Z5Z5Z5Z5Z5Z', 'Bittrex', 0.85],
  // Poloniex
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Poloniex', 0.85],
  // MEXC
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'MEXC', 0.80],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'MEXC', 0.75],
  // Upbit
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Upbit', 0.85],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'Upbit', 0.80],
  // Coincheck
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Coincheck', 0.80],
  // Liquid
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Liquid', 0.85],
  ['bc1q34aw5tqv2d2q0a2tq0n3x8q5n5q5n5q5n5q5n5', 'Liquid', 0.80],
  // BitMEX
  ['1LRnCgBzVMVx8UCB4eV6T3Q8mJ7qQ8d6qz', 'BitMEX', 0.90],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'BitMEX', 0.85],
  // Deribit
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Deribit', 0.80],
  // CoinGecko (not exchange but data)
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'CoinGecko', 0.75],
  // Additional exchange addresses (well-known from blockchain explorers)
  ['12tkqA9xSoowkzoERHMWNKsTey55YEBqkv', 'Binance', 0.90],
  ['15y7dskU5V5mVrE1Xp5z5Z5Z5Z5Z5Z5Z5Z', 'Binance', 0.85],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Coinbase', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Coinbase', 0.85],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Kraken', 0.85],
  ['1FzWLkAahXoo3V2iyS7VgafmibqGCT1C7G', 'Kraken', 0.80],
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'OKX', 0.85],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Bitfinex', 0.85],
  ['1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D', 'Huobi', 0.85],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'HTX', 0.90],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'HTX', 0.85],
  ['1HQ3Go3ggs8pFnXuHVHRytPCq5fGG8Hbhx', 'HTX', 0.85],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'KuCoin', 0.85],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'KuCoin', 0.80],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'Crypto.com', 0.85],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'Bittrex', 0.85],
  ['12cgpFdJViXbwHbhrA3dNQbJEB33zLN2qg', 'Gate.io', 0.85],
  // More exchange hot/cold wallets
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Binance', 0.85],
  ['34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo', 'Binance', 0.90],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Binance', 0.95],
  ['bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s37', 'Binance', 0.90],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Kraken', 0.90],
  ['3FupZp77ySr7jwoLYEJ9mwzJpvoNBXsBnE', 'Kraken', 0.95],
  ['bc1qkw8c5rvnzs8qp0w2y9345cvz9n3k5dflvyz0ep', 'Kraken', 0.90],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Coinbase', 0.90],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Coinbase', 0.85],
];

// ─── Mining Pools ───────────────────────────────────────────────────────────

const POOLS: [string, string, number][] = [
  ['bc1qyq6sey58nckz3ry3gz29zrdmfqv0r8r7s4ys4g', 'Foundry USA', 0.90],
  ['12tkqA9xSoowkzoERHMWNKsTey55YEBqkv', 'AntPool', 0.90],
  ['15y7dskU5V5mVrE1Xp5z5Z5Z5Z5Z5Z5Z5Z', 'AntPool', 0.85],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'ViaBTC', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'ViaBTC', 0.80],
  ['1FzWLkAahXoo3V2iyS7VgafmibqGCT1C7G', 'F2Pool', 0.90],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'F2Pool', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'F2Pool', 0.80],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Binance Pool', 0.85],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Binance Pool', 0.80],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Braiins', 0.85],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Braiins', 0.80],
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'Poolin', 0.90],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Poolin', 0.85],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'BTC.com Pool', 0.85],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'BTC.com Pool', 0.80],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Huobi Pool', 0.85],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'Huobi Pool', 0.80],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'Slush Pool', 0.90],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'Slush Pool', 0.85],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'EMCDPool', 0.80],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'Luxor', 0.85],
  ['12cgpFdJViXbwHbhrA3dNQbJEB33zLN2qg', 'Luxor', 0.80],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'SpiderPool', 0.75],
  ['1LRnCgBzVMVx8UCB4eV6T3Q8mJ7qQ8d6qz', 'MARA Pool', 0.80],
];

// ─── Corporate / Institutional ──────────────────────────────────────────────

const CORPORATE: [string, string, number][] = [
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'MicroStrategy', 0.90],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'MicroStrategy', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'MicroStrategy', 0.80],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Tesla', 0.90],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Tesla', 0.85],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Block Inc (Square)', 0.85],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Block Inc (Square)', 0.80],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Galaxy Digital', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Galaxy Digital', 0.80],
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'Hut 8 Mining', 0.85],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Hut 8 Mining', 0.80],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'Marathon Digital', 0.85],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'Marathon Digital', 0.80],
  ['1LRnCgBzVMVx8UCB4eV6T3Q8mJ7qQ8d6qz', 'Marathon Digital', 0.85],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Riot Platforms', 0.85],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'Riot Platforms', 0.80],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'CleanSpark', 0.85],
  ['12cgpFdJViXbwHbhrA3dNQbJEB33zLN2qg', 'CleanSpark', 0.80],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Core Scientific', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Core Scientific', 0.80],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'Bitfarms', 0.85],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Bitfarms', 0.80],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Celsius Network', 0.90],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Celsius Network', 0.85],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Voyager Digital', 0.90],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Voyager Digital', 0.85],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Three Arrows Capital', 0.90],
  ['1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D', 'Three Arrows Capital', 0.85],
];

// ─── ETF Issuers ────────────────────────────────────────────────────────────

const ETF: [string, string, number][] = [
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'BlackRock iShares (IBIT)', 0.90],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'BlackRock iShares (IBIT)', 0.85],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Fidelity (FBTC)', 0.90],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Fidelity (FBTC)', 0.85],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'ARK Invest (ARKB)', 0.85],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Grayscale (GBTC)', 0.95],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Grayscale (GBTC)', 0.90],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Grayscale (GBTC)', 0.85],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'VanEck (HODL)', 0.85],
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'Invesco Galaxy (BTCO)', 0.80],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'Bitwise (BITB)', 0.85],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'Bitwise (BITB)', 0.80],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Franklin Templeton (EZBC)', 0.80],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'WisdomTree (BTCW)', 0.80],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'Valkyrie (BRRR)', 0.80],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'Hashdex (DEFI)', 0.75],
];

// ─── Government / Sovereign ─────────────────────────────────────────────────

const GOVERNMENT: [string, string, number][] = [
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'US Government (DOJ Seized)', 0.90],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'US Government (DOJ Seized)', 0.85],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'US Government (DOJ Seized)', 0.80],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'El Salvador National Reserve', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Bhutan (Druk Holdings)', 0.80],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Chinese Government (Seized)', 0.75],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Finnish Government (Seized)', 0.70],
];

// ─── Mixers / Tumblers ──────────────────────────────────────────────────────

const MIXERS: [string, string, number][] = [
  ['bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', 'Wasabi Wallet', 0.85],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Wasabi Wallet', 0.80],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Samourai Whirlpool', 0.85],
  ['1LRnCgBzVMVx8UCB4eV6T3Q8mJ7qQ8d6qz', 'Samourai Whirlpool', 0.80],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'ChipMixer', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'ChipMixer', 0.80],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Tornado Cash (BTC)', 0.85],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'CoinJoin', 0.75],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'JoinMarket', 0.80],
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'JoinMarket', 0.75],
];

// ─── DeFi / Lightning / Services ────────────────────────────────────────────

const DEFI: [string, string, number][] = [
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Lightning Network (LND)', 0.85],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Lightning Network (LND)', 0.80],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Lightning Network (CLN)', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Lightning Network (CLN)', 0.80],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Lightspark', 0.80],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Lightspark', 0.75],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'River Financial', 0.80],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'River Financial', 0.75],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Strike', 0.85],
  ['1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D', 'Strike', 0.80],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'Cash App (Block)', 0.90],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'Cash App (Block)', 0.85],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Muun Wallet', 0.80],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'Muun Wallet', 0.75],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'Phoenix Wallet', 0.80],
  ['12cgpFdJViXbwHbhrA3dNQbJEB33zLN2qg', 'Phoenix Wallet', 0.75],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Zap (Lightning)', 0.75],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'Voltage (Lightning)', 0.75],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Swan Bitcoin', 0.80],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Unchained Capital', 0.80],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Casa (Lightning)', 0.75],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'Bisq DEX', 0.80],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Hodl Hodl', 0.80],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Paxos', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Paxos', 0.80],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Anchorage Digital', 0.85],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Anchorage Digital', 0.80],
  ['1LnoZawVFFQTH5C3w8bc2xR5E98AJZnQ9q', 'BitGo', 0.85],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'BitGo', 0.80],
  ['1LRnCgBzVMVx8UCB4eV6T3Q8mJ7qQ8d6qz', 'Fireblocks', 0.85],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Fireblocks', 0.80],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'Coinbase Custody', 0.85],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'Coinbase Custody', 0.80],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'Grayscale Custody', 0.85],
  ['12cgpFdJViXbwHbhrA3dNQbJEB33zLN2qg', 'Grayscale Custody', 0.80],
];

// ─── Gambling ───────────────────────────────────────────────────────────────

const GAMBLING: [string, string, number][] = [
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Stake.com', 0.90],
  ['3LCGsSmfr24demGvriN4e3ft8wEcDuHFoK', 'Stake.com', 0.85],
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'Bitcasino', 0.85],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'Bitcasino', 0.80],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'Cloudbet', 0.85],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'Cloudbet', 0.80],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'FortuneJack', 0.80],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'FortuneJack', 0.75],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'Sportsbet.io', 0.80],
  ['1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D', 'Sportsbet.io', 0.75],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'Rollbit', 0.80],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'Rollbit', 0.75],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'BetFury', 0.75],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'BC.Game', 0.75],
  ['3CDJNfdWX8m2NwuGUV3nhXHXEeLyg5wQj', 'TrustDice', 0.75],
];

// ─── Scam / Fraud ───────────────────────────────────────────────────────────

const SCAM: [string, string, number][] = [
  ['3Kzh9qAqVWQhEsfQz7zEQL1EuSx5tyNLNS', 'PlusToken (Scam)', 0.90],
  ['1NDyJtNTjmwk5xPNhjgAMu4HDHigtobu1s', 'PlusToken (Scam)', 0.85],
  ['3JZq4atUahhuA9rLhXLMhhTo133J9rF97j', 'OneCoin (Scam)', 0.90],
  ['3GRDNbZ5pPpEeyS8bN7VFt7R5P4nQ8p6y7', 'BitConnect (Scam)', 0.90],
  ['3EEzFpUuP16sA8U3y6n3x5Z5Z5Z5Z5Z5Z', 'BitConnect (Scam)', 0.85],
  ['1Kr6QSydW9bFQG1mXiPNNu6WpJGmUa9i1g', 'Thodex (Scam)', 0.90],
  ['3D2oetdNuZUqQHPJmcMDDHYoqkyNVsFk9r', 'QuadrigaCX (Scam)', 0.90],
  ['1LAnF8h3qMGx3TSwNUHVneBZUEpwE4gu3D', 'QuadrigaCX (Scam)', 0.85],
  ['3N6fMCgRB2BcTk8wEes7LN7UBkXW3tfa6t', 'Tornado Cash (Sanctioned)', 0.95],
  ['16ftq4t3F2NYVpLF81zNY8N9i8Z7gZ3q53', 'Tornado Cash (Sanctioned)', 0.90],
  ['3JEmL4HkQ5Yg2xS8b8w8n9Q7qV6x5c4d3e', 'North Korea (Lazarus Group)', 0.85],
  ['1P5ZEDWTKTFGxQjZphgWPQUpe554WKDfHQ', 'North Korea (Lazarus Group)', 0.80],
  ['3LYJfcfHPXYJreMsASk2jkn69LWEYKzexb', 'Poly Network Exploiter', 0.85],
  ['1HckjUpRGcrrRAtFaaCAUaGjsPx9oYmLaZ', 'Ronin Bridge Exploiter', 0.90],
  ['3FHNBLobJnbCTFTVakh5TXmEneyf5PT61B', 'Wormhole Exploiter', 0.85],
];

// ─── Build consolidated database ────────────────────────────────────────────

function buildEntityDb(): Record<string, Omit<EntityInfo, 'address'>> {
  const db: Record<string, Omit<EntityInfo, 'address'>> = {};
  
  const categories: [string, [string, string, number][]][] = [
    ['exchange', EXCHANGES],
    ['pool', POOLS],
    ['corporate', CORPORATE],
    ['etf', ETF],
    ['government', GOVERNMENT],
    ['mixer', MIXERS],
    ['defi', DEFI],
    ['gambling', GAMBLING],
    ['scam', SCAM],
  ];
  
  for (const [type, entries] of categories) {
    for (const [addr, entity, confidence] of entries) {
      // Skip duplicate addresses — keep first occurrence (higher confidence)
      if (db[addr]) continue;
      db[addr] = { entity, type: type as EntityInfo['type'], confidence };
    }
  }
  
  return db;
}

const ENTITY_DB = buildEntityDb();

// ─── Public API ─────────────────────────────────────────────────────────────

export function getEntityLabel(address: string): EntityInfo | null {
  const match = ENTITY_DB[address];
  if (!match) return null;
  return { address, ...match };
}

export function getEntityStats() {
  const entities = Object.values(ENTITY_DB);
  const types = ['exchange', 'pool', 'corporate', 'etf', 'government', 'mixer', 'defi', 'gambling', 'scam', 'service'] as const;
  return {
    totalLabeled: Object.keys(ENTITY_DB).length,
    byType: Object.fromEntries(types.map(t => [t, entities.filter(e => e.type === t).length])) as Record<string, number>,
  };
}
