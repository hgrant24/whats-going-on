import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const SITE_URL = 'https://www.hansonsguide.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "What's Going On | Events in Bristol & East Bay, RI",
    template: "%s | What's Going On",
  },
  description:
    'A community-powered local guide to trivia, live music, markets, food events, and things happening around Bristol and the East Bay of Rhode Island.',
  keywords: [
    'Bristol RI events', 'East Bay Rhode Island events', 'things to do Bristol RI',
    'live music Bristol', 'trivia night Bristol', 'Warren RI events', 'local events Rhode Island',
  ],
  alternates: { canonical: '/' },
  openGraph: {
    title: "What's Going On — Bristol & East Bay, RI",
    description: 'Trivia, live music, markets, and local events around Bristol and the East Bay of Rhode Island.',
    url: SITE_URL,
    siteName: "What's Going On",
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "What's Going On — Bristol & East Bay, RI",
    description: 'Trivia, live music, markets, and local events around Bristol and the East Bay of Rhode Island.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: '#F4EFE9' }}>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
