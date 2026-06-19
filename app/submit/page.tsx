import Header from '@/components/Header';
import Link from 'next/link';

export const metadata = {
  title: "Submit an Event | What's Going On",
};

export default function SubmitPage() {
  const formUrl = process.env.NEXT_PUBLIC_GOOGLE_FORM_URL;

  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-stone-400 hover:text-teal-600 transition-colors mb-6 inline-block">
          ← Back to events
        </Link>

        <h1 className="text-2xl font-bold text-stone-900 mb-3">Submit an event</h1>
        <p className="text-stone-500 leading-relaxed mb-6">
          Know something happening around Bristol or the East Bay? Share it here and we&apos;ll get
          it on the feed. All types of events are welcome — trivia nights, live music, markets,
          sports, fundraisers, family events, and more.
        </p>

        <div className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col gap-4">
          <p className="text-sm text-stone-600 leading-relaxed">
            Drop a link to the event listing — Facebook event, website, Eventbrite, Instagram
            post, anywhere — along with any extra details you have. We review submissions and add
            them to the site within a day or two.
          </p>

          {formUrl ? (
            <a
              href={formUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center bg-teal-600 text-white font-semibold text-sm px-5 py-2.5 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Open submission form →
            </a>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              Submission form URL not configured. Set{' '}
              <code className="font-mono">NEXT_PUBLIC_GOOGLE_FORM_URL</code> in your environment
              variables.
            </div>
          )}
        </div>
      </main>
    </>
  );
}
