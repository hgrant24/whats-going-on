import { fetchEvents, groupEvents } from '@/lib/events';
import Header from '@/components/Header';
import Link from 'next/link';

export const metadata = { title: "Debug | What's Going On" };

async function fetchRawCsv(url: string): Promise<{ status: number; preview: string }> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const text = await res.text();
    return { status: res.status, preview: text.slice(0, 600) };
  } catch (e) {
    return { status: 0, preview: String(e) };
  }
}

export default async function DebugPage() {
  const start = Date.now();
  const { events, rawSubmissions, hasApprovedTab, error } = await fetchEvents();
  const grouped = groupEvents(events);
  const elapsed = Date.now() - start;

  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
  const rawCsv = csvUrl ? await fetchRawCsv(csvUrl) : null;

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8 font-mono text-sm">
        <Link href="/" className="text-teal-600 hover:underline mb-4 inline-block not-italic text-sm font-sans">
          ← Back
        </Link>
        <h1 className="text-lg font-bold mb-4 font-sans">Debug</h1>

        <section className="bg-stone-800 text-stone-100 rounded-xl p-4 mb-4 space-y-1 text-xs">
          <div><span className="text-stone-400">fetch time:</span> {elapsed}ms</div>
          <div><span className="text-stone-400">hasApprovedTab:</span> {String(hasApprovedTab)}</div>
          <div><span className="text-stone-400">error:</span> {error ?? 'none'}</div>
          <div><span className="text-stone-400">events total:</span> {events.length}</div>
          <div><span className="text-stone-400">tonight:</span> {grouped.tonight.length}</div>
          <div><span className="text-stone-400">thisWeek:</span> {grouped.thisWeek.length}</div>
          <div><span className="text-stone-400">upcoming:</span> {grouped.upcoming.length}</div>
          <div><span className="text-stone-400">recurring:</span> {grouped.recurring.length}</div>
          <div><span className="text-stone-400">rawSubmissions:</span> {rawSubmissions.length}</div>
          <div>
            <span className="text-stone-400">GOOGLE_SHEET_CSV_URL:</span>{' '}
            {csvUrl ? '✓ set' : '✗ not set'}
          </div>
          <div>
            <span className="text-stone-400">RAW_SUBMISSIONS_CSV_URL:</span>{' '}
            {process.env.RAW_SUBMISSIONS_CSV_URL ? '✓ set' : '✗ not set'}
          </div>
          <div>
            <span className="text-stone-400">NEXT_PUBLIC_GOOGLE_FORM_URL:</span>{' '}
            {process.env.NEXT_PUBLIC_GOOGLE_FORM_URL ? '✓ set' : '✗ not set'}
          </div>
        </section>

        {rawCsv && (
          <section className="mb-4">
            <h2 className="font-bold font-sans mb-2 text-stone-700">
              Raw CSV response{' '}
              <span className={rawCsv.status === 200 ? 'text-emerald-600' : 'text-red-500'}>
                (HTTP {rawCsv.status})
              </span>
            </h2>
            <div className="bg-stone-800 text-stone-100 rounded-xl p-4 text-xs overflow-auto whitespace-pre-wrap break-all">
              {rawCsv.preview || '(empty)'}
            </div>
            {rawCsv.status !== 200 && (
              <p className="mt-2 text-xs text-amber-700 font-sans">
                Non-200 response. Make sure the sheet is published to the web (File → Share →
                Publish to web → select tab → CSV) or shared as &quot;Anyone with the link can
                view.&quot;
              </p>
            )}
            {rawCsv.status === 200 && rawCsv.preview.trim().startsWith('<') && (
              <p className="mt-2 text-xs text-amber-700 font-sans">
                Got HTML instead of CSV — the sheet likely requires authentication. Publish it via
                File → Share → Publish to web → select tab → CSV.
              </p>
            )}
          </section>
        )}

        {events.length > 0 && (
          <section className="mb-4">
            <h2 className="font-bold font-sans mb-2">Sample events (first 5)</h2>
            <div className="bg-stone-800 text-stone-100 rounded-xl p-4 text-xs overflow-auto">
              <pre>{JSON.stringify(events.slice(0, 5), null, 2)}</pre>
            </div>
          </section>
        )}

        {rawSubmissions.length > 0 && (
          <section>
            <h2 className="font-bold font-sans mb-2">Raw submissions (first 5)</h2>
            <div className="bg-stone-800 text-stone-100 rounded-xl p-4 text-xs overflow-auto">
              <pre>{JSON.stringify(rawSubmissions.slice(0, 5), null, 2)}</pre>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
