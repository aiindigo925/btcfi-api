export const metadata = {
  title: 'BTCFi API — Bitcoin + BTCFi Data for AI Agents',
  description: 'Agent-native Bitcoin data, intelligence, BTCFi, security, ZK proofs & real-time streams via x402 micropayments. 31 endpoints. No tokens. No subscriptions. Just ship.',
  openGraph: {
    title: 'BTCFi API',
    description: 'Bitcoin data, ZK proofs & real-time streams for AI agents via x402 micropayments',
    type: 'website',
  },
};

const structuredData = [
  // SoftwareApplication — describes the BTCFi API
  {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BTCFi API',
    description: 'Agent-native Bitcoin data, intelligence, BTCFi, security, ZK proofs & real-time streams via x402 micropayments. 45+ endpoints. No tokens. No subscriptions.',
    url: 'https://btcfi.aiindigo.com',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any (REST API)',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier available, micropayments per request',
    },
    provider: {
      '@type': 'Organization',
      name: 'AI Indigo',
      url: 'https://aiindigo.com',
    },
    featureList: [
      'Bitcoin fee estimation',
      'Mempool analysis',
      'Address intelligence',
      'Whale transaction alerts',
      'ZK proofs (Groth16)',
      'Real-time SSE streams',
      'Solv Protocol DeFi data',
      'MCP integration (27 tools)',
      'Multi-chain (Bitcoin, Ethereum, Solana)',
    ],
    softwareVersion: '3.0.0',
    screenshot: 'https://btcfi.aiindigo.com/safe',
    keywords: 'Bitcoin API, BTCFi, ZK proofs, Bitcoin intelligence, whale alerts, micropayments, x402, MCP, AI agents',
  },
  // WebSite + SearchAction — enables Google sitelinks search box
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'BTCFi API',
    url: 'https://btcfi.aiindigo.com',
    description: 'Bitcoin data, BTCFi intelligence, ZK proofs & real-time streams for AI agents via x402 micropayments',
    publisher: {
      '@type': 'Organization',
      name: 'AI Indigo',
      url: 'https://aiindigo.com',
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://btcfi.aiindigo.com/api/v1/address/{search_term_string}',
      },
      'query-input': 'required name=search_term_string',
      description: 'Search Bitcoin addresses, transactions, and blocks',
    },
  },
  // Organization — knowledge graph
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AI Indigo',
    url: 'https://aiindigo.com',
    logo: 'https://aiindigo.com/logo.png',
    sameAs: [
      'https://github.com/aiindigo925/btcfi-api',
      'https://www.npmjs.com/package/@aiindigo/btcfi',
      'https://www.npmjs.com/package/@aiindigo/btcfi-mcp',
      'https://t.me/BTC_Fi_Bot',
      'https://t.me/BTCFi_Whales',
    ],
  },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>₿</text></svg>" />
        {structuredData.map((data, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
          />
        ))}
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e0e0e0', fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace" }}>
        {children}
      </body>
    </html>
  );
}
