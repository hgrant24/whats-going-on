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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">What&apos;s Going On</h1>
          <p className="mt-2 text-stone-500 leading-relaxed max-w-xl">
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
          <a href="/submit" className="text-teal-600 hover:text-teal-800 font-medium transition-colors">
            Submit an event →
          </a>
        </div>
      </footer>
    </>
  );
}
