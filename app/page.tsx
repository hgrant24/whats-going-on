import Image from 'next/image';
import { fetchEvents, groupEvents } from '@/lib/events';
import Header from '@/components/Header';
import EventsClient from '@/components/EventsClient';

export default async function HomePage() {
  const { events, rawSubmissions, hasApprovedTab, error } = await fetchEvents();
  const grouped = groupEvents(events);

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-10 flex flex-col items-center text-center">
          <Image
            src="/logo.png"
            alt="What's Going On – Bristol, RI"
            width={300}
            height={300}
            className="object-contain"
            style={{ mixBlendMode: 'multiply' }}
            priority
          />
          <p className="mt-4 text-stone-500 leading-relaxed max-w-md text-sm">
            A simple local guide to trivia, live music, markets, food events, and things happening
            around Bristol and the East Bay.
          </p>
        </div>

        {/* Error state */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <EventsClient
          grouped={grouped}
          rawSubmissions={rawSubmissions}
          hasApprovedTab={hasApprovedTab || events.length > 0}
        />
      </main>

      <footer className="mt-16 border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
          <span>What&apos;s Going On · Bristol &amp; East Bay, RI</span>
          <a href="/submit" className="font-medium transition-colors" style={{ color: '#5B9BAE' }}>
            Submit an event →
          </a>
        </div>
      </footer>
    </>
  );
}
