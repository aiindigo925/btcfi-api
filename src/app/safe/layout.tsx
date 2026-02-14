import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Is My Bitcoin Safe? — Free Address Safety Checker | BTCFi',
  description: 'Paste any Bitcoin address and get a free threat analysis. 8 YARA-pattern checks, risk score, and actionable recommendations. No signup required.',
  openGraph: {
    title: 'Is My Bitcoin Safe? — Free Address Safety Checker',
    description: 'Free Bitcoin address safety checker. 8 YARA threat patterns, risk scoring, zero signup.',
    type: 'website',
    url: 'https://btcfi.aiindigo.com/safe',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Is My Bitcoin Safe? — Free Address Safety Checker',
    description: 'Paste any Bitcoin address → get a free threat analysis. No signup required.',
  },
};

export default function SafeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
