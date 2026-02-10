export const metadata = {
  title: 'BTCFi API — Bitcoin + BTCFi Data for AI Agents',
  description: 'Agent-native Bitcoin data, intelligence, BTCFi, security, ZK proofs & real-time streams via x402 micropayments. 31 endpoints. No tokens. No subscriptions. Just ship.',
  openGraph: {
    title: 'BTCFi API',
    description: 'Bitcoin data, ZK proofs & real-time streams for AI agents via x402 micropayments',
    type: 'website',
  },
};

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
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', color: '#e0e0e0', fontFamily: "'SF Mono', 'Fira Code', 'JetBrains Mono', monospace" }}>
        {children}
      </body>
    </html>
  );
}
