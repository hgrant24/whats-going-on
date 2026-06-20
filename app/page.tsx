import { fetchEvents, groupEvents } from '@/lib/events';
import { buildEventsJsonLd } from '@/lib/seo';
import Header from '@/components/Header';
import EventsClient from '@/components/EventsClient';

const REPORT_EMAIL = 'hansongrant1@gmail.com';

export default async function HomePage() {
  const { events, rawSubmissions, hasApprovedTab, error } = await fetchEvents();
  const grouped = groupEvents(events);
  const jsonLd = buildEventsJsonLd(events);

  return (
    <>
      {events.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      )}
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1C3D55' }}>
            What&apos;s Going On
          </h1>
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
          <div className="flex items-center gap-4">
            <a
              href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent("What's Going On — event correction")}`}
              className="hover:text-stone-600 transition-colors"
            >
              Spotted an error?
            </a>
            <a href="/submit" className="font-medium transition-colors" style={{ color: '#5B9BAE' }}>
              Submit an event →
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
