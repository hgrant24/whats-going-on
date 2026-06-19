import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "What's Going On | Bristol & East Bay RI Events",
  description:
    'A community-powered local guide to trivia, live music, markets, food events, and things happening around Bristol and the East Bay of Rhode Island.',
  openGraph: {
    title: "What's Going On",
    description: 'Local events in Bristol & East Bay, Rhode Island.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-50">{children}</body>
    </html>
  );
}
