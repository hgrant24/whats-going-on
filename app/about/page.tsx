import Header from '@/components/Header';
import Link from 'next/link';
import { fetchEvents } from '@/lib/events';

export const metadata = {
  title: "About | What's Going On",
};

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

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

export default async function AboutPage() {
  const { events, rawSubmissions } = await fetchEvents();

  // Collect unique source URLs from both approved events and raw submissions
  const urlSet = new Set<string>();
  for (const e of events) {
    if (e.sourceLink && /^https?:\/\//i.test(e.sourceLink)) urlSet.add(e.sourceLink);
  }
  for (const s of rawSubmissions) {
    if (s.link && /^https?:\/\//i.test(s.link)) urlSet.add(s.link);
  }
  const sources = Array.from(urlSet).sort((a, b) => hostname(a).localeCompare(hostname(b)));

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
            local events guide for Bristol and the East Bay of Rhode Island — covering Bristol,
            Warren, Barrington, and nearby towns.
          </p>
          <p>
            The idea is simple: one place to see what&apos;s happening locally, whether that&apos;s
            trivia night at your favorite bar, a farmers market, live music, a family event, a
            5K, or a waterfront festival.
          </p>
          <p>
            Events are submitted by community members through a simple Google Form. We review
            each submission and add it to the feed. If you know something happening locally,
            please share it — this site is only as good as what the community puts into it.
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

        {/* Sources — every website this guide pulls events from */}
        {sources.length > 0 && (
          <section className="mt-10 pt-6 border-t border-stone-200">
            <h2 className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-3">
              Where this info comes from
            </h2>
            <ul className="space-y-1.5">
              {sources.map((url, i) => (
                <li key={i} className="text-sm">
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-stone-500 hover:text-[#1C3D55] transition-colors break-all"
                  >
                    {displayUrl(url)}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>
    </>
  );
}
