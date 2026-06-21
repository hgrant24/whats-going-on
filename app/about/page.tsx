import Header from '@/components/Header';
import Link from 'next/link';
import { fetchEvents } from '@/lib/events';
import { LOCATIONS, eventInLocation } from '@/lib/locations';

export const metadata = {
  title: 'About',
};

// Show host + path so generic domains (facebook.com/PortsideTavern) are identifiable
function displayUrl(url: string): string {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '');
    const path = u.pathname.replace(/\/+$/, ''); // strip trailing slash(es)
    return path ? host + path : host;
  } catch {
    return url;
  }
}

function joinTowns(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

export default async function AboutPage() {
  const { events } = await fetchEvents();

  // Group the source links by hub so each town has its own list
  const sourcesByTown = LOCATIONS.map(loc => {
    const seen = new Set<string>();
    const urls: { href: string; label: string }[] = [];
    for (const e of events) {
      if (!e.sourceLink || !/^https?:\/\//i.test(e.sourceLink)) continue;
      if (!eventInLocation(e.location, loc)) continue;
      const label = displayUrl(e.sourceLink);
      if (seen.has(label)) continue;
      seen.add(label);
      urls.push({ href: e.sourceLink, label });
    }
    urls.sort((a, b) => a.label.localeCompare(b.label));
    return { loc, urls };
  }).filter(t => t.urls.length > 0);

  const townList = joinTowns(LOCATIONS.map(l => l.name));

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-stone-400 hover:text-[#5B9BAE] transition-colors mb-6 inline-block">
          ← Back to events
        </Link>

        <h1 className="text-2xl font-bold text-stone-900 mb-6">About</h1>

        <div className="prose prose-stone max-w-none text-stone-600 leading-relaxed space-y-4">
          <p>
            <strong className="text-stone-800">What&apos;s Going On</strong> is a community-powered
            guide to local events — currently covering {townList}, with more towns on the way.
            Pick your area from the menu at the top and you&apos;ll only see what&apos;s happening
            near you.
          </p>
          <p>
            The idea is simple: one place to see what&apos;s happening locally, whether that&apos;s
            trivia night at your favorite bar, a farmers market, live music, a family event, a
            5K, or a waterfront festival.
          </p>
          <p>
            Events are gathered from venue and community listings and submitted by people in each
            town. If you know something happening locally, please share it — this site is only as
            good as what the community puts into it.
          </p>

          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 mt-6">
            <p className="text-sm text-stone-500">
              Have an event to share?{' '}
              <Link href="/submit" className="font-medium hover:underline" style={{ color: '#5B9BAE' }}>
                Submit it here.
              </Link>
            </p>
          </div>
        </div>

        {/* Sources — grouped by town */}
        {sourcesByTown.length > 0 && (
          <section className="mt-10 pt-6 border-t border-stone-200">
            <h2 className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-4">
              Where this info comes from
            </h2>
            <div className="space-y-5">
              {sourcesByTown.map(({ loc, urls }) => (
                <div key={loc.slug}>
                  <h3 className="text-sm font-bold mb-1.5" style={{ color: '#1C3D55' }}>
                    {loc.name}{' '}
                    <span className="font-normal text-xs text-stone-400">· {loc.region}</span>
                  </h3>
                  <ul className="space-y-1.5">
                    {urls.map((u, i) => (
                      <li key={i} className="text-sm">
                        <a
                          href={u.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-stone-500 hover:text-[#1C3D55] transition-colors break-all"
                        >
                          {u.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
