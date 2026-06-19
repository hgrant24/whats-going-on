import Header from '@/components/Header';
import Link from 'next/link';

export const metadata = {
  title: "About | What's Going On",
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-stone-400 hover:text-teal-600 transition-colors mb-6 inline-block">
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
              <Link href="/submit" className="text-teal-600 hover:underline font-medium">
                Submit it here.
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
