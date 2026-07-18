import type { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import { fetchEvents } from '@/lib/events';
import { LOCATIONS, eventInLocation, locationPath } from '@/lib/locations';

const REQUEST_EMAIL = 'hansongrant1@gmail.com';

function joinTowns(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export const metadata: Metadata = {
  title: 'All areas',
  description: `Every area covered by What's Going On — local event guides for ${joinTowns(
    LOCATIONS.map(l => l.name)
  )}.`,
  alternates: { canonical: '/locations' },
  openGraph: {
    title: "What's Going On — All areas",
    description: 'Pick your town and see what’s happening locally this week.',
  },
};

export default async function LocationsPage() {
  const { events } = await fetchEvents();

  // Upcoming-event count per hub, using the same matching rule the hub pages use
  const counts = new Map<string, number>(
    LOCATIONS.map(l => [l.slug, events.filter(e => eventInLocation(e.location, l)).length])
  );

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#5B9BAE' }}>
            All areas
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: '#1C3D55' }}>
            Where are you looking?
          </h1>
          <p className="mt-2 text-stone-500 leading-relaxed max-w-xl">
            Pick a town to see what&apos;s happening there — trivia, live music, markets,
            food events, and more, all in one simple list.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {LOCATIONS.map(l => {
            const count = counts.get(l.slug) ?? 0;
            return (
              <Link
                key={l.slug}
                href={locationPath(l)}
                className="group block rounded-xl border border-stone-200 bg-white p-5 transition-colors hover:border-[#5B9BAE]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2
                      className="text-lg font-bold tracking-tight truncate"
                      style={{ color: '#1C3D55' }}
                    >
                      {l.name}
                    </h2>
                    <p className="text-xs font-semibold uppercase tracking-widest mt-0.5" style={{ color: '#5B9BAE' }}>
                      {l.region}
                    </p>
                  </div>
                  <span
                    className="shrink-0 text-lg transition-transform group-hover:translate-x-0.5"
                    style={{ color: '#5B9BAE' }}
                    aria-hidden="true"
                  >
                    →
                  </span>
                </div>

                <p className="mt-3 text-sm text-stone-500 leading-relaxed line-clamp-2">{l.blurb}</p>

                <p className="mt-3 text-sm font-semibold" style={{ color: count > 0 ? '#1C3D55' : '#a8a29e' }}>
                  {count > 0
                    ? `${count} upcoming event${count === 1 ? '' : 's'}`
                    : 'Nothing listed yet — add the first'}
                </p>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 rounded-xl border border-stone-200 bg-white p-5 text-center">
          <p className="text-sm text-stone-500">
            Don&apos;t see your town?{' '}
            <a
              href={`mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent(
                "What's Going On — new town request"
              )}&body=${encodeURIComponent('Which town would you like to see added?\n\nTown:\nWhy:')}`}
              className="font-semibold hover:underline"
              style={{ color: '#5B9BAE' }}
            >
              Request it here →
            </a>
          </p>
        </div>
      </main>
    </>
  );
}
