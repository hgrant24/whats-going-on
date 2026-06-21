import { fetchEvents, groupEvents } from '@/lib/events';
import { buildEventsJsonLd } from '@/lib/seo';
import { LocationDef, eventInLocation, locationPath } from '@/lib/locations';
import Header from '@/components/Header';
import EventsClient from '@/components/EventsClient';
import SubscribeForm from '@/components/SubscribeForm';

const REPORT_EMAIL = 'hansongrant1@gmail.com';

export default async function LocationHome({ location }: { location: LocationDef }) {
  const { events, rawSubmissions, hasApprovedTab, error } = await fetchEvents();

  // Only this hub's events — no overlap between locations
  const locEvents = events.filter(e => eventInLocation(e.location, location));
  const grouped = groupEvents(locEvents);
  const jsonLd = buildEventsJsonLd(locEvents);

  const submitHref =
    locationPath(location) === '/' ? '/submit' : `/submit?loc=${location.slug}`;
  const subscribeEndpoint = process.env.NEXT_PUBLIC_SUBMIT_ENDPOINT;

  return (
    <>
      {locEvents.length > 0 && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      )}
      <Header currentSlug={location.slug} />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: '#5B9BAE' }}>
            <span>{location.region}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: '#1C3D55' }}>
            What&apos;s Going On in {location.name}
          </h1>
          <p className="mt-2 text-stone-500 leading-relaxed max-w-xl">{location.blurb}</p>
        </div>

        {/* Top subscribe prompt */}
        {subscribeEndpoint && (
          <a
            href="#subscribe"
            className="mb-8 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:opacity-90"
            style={{ borderColor: '#A8C8D4', backgroundColor: 'rgba(168,200,212,0.14)' }}
          >
            <span className="text-sm text-stone-600">
              📬 Get {location.name}&apos;s events in your inbox{' '}
              <span className="font-semibold" style={{ color: '#1C3D55' }}>every Wednesday morning</span> — free.
            </span>
            <span
              className="shrink-0 text-sm font-semibold text-white px-3.5 py-1.5 rounded-full"
              style={{ backgroundColor: '#1C3D55' }}
            >
              Subscribe
            </span>
          </a>
        )}

        {/* Error state */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <EventsClient
          grouped={grouped}
          rawSubmissions={rawSubmissions}
          hasApprovedTab={hasApprovedTab || locEvents.length > 0}
          submitHref={submitHref}
          areaName={location.name}
        />

        {/* Weekly email signup */}
        {subscribeEndpoint && (
          <div id="subscribe" className="mt-10 scroll-mt-24">
            <SubscribeForm endpoint={subscribeEndpoint} defaultTown={location.name} />
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-stone-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-400">
          <span>What&apos;s Going On · {location.name}, {location.region}</span>
          <div className="flex items-center gap-4">
            <a
              href={`mailto:${REPORT_EMAIL}?subject=${encodeURIComponent("What's Going On — event correction")}`}
              className="hover:text-stone-600 transition-colors"
            >
              Spotted an error?
            </a>
            <a href={submitHref} className="font-medium transition-colors" style={{ color: '#5B9BAE' }}>
              Submit an event →
            </a>
          </div>
        </div>
      </footer>
    </>
  );
}
