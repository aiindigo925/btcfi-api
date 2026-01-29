export const metadata = {
  title: 'BTCFi API',
  description: 'Bitcoin data for AI agents. No tokens. Just ship.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
