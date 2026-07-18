import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Header from '@/components/Header';
import EventsClient from '@/components/EventsClient';
import FollowedHubsEditor from '@/components/FollowedHubsEditor';
import TrackerManager from '@/components/TrackerManager';
import TownRequestForm from '@/components/TownRequestForm';
import SignOutButton from '@/components/SignOutButton';
import { fetchEvents, groupEvents } from '@/lib/events';
import { LOCATIONS, eventInLocation } from '@/lib/locations';
import { supabaseServer } from '@/lib/supabase/server';
import type { Tracker, TownRequest } from '@/types/account';

export const metadata: Metadata = {
  title: 'My Feed',
  robots: { index: false, follow: false },
};

export default async function MePage() {
  const supabase = supabaseServer();
  if (!supabase) redirect('/'); // accounts not configured — nothing to see here

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [profileRes, trackersRes, requestsRes, eventsData] = await Promise.all([
    supabase.from('profiles').select('followed_hubs').eq('id', user.id).maybeSingle(),
    supabase.from('trackers').select('id, name, region, tag, created_at').order('created_at'),
    supabase
      .from('town_requests')
      .select('id, town_name, region, note, status, created_at')
      .order('created_at', { ascending: false }),
    fetchEvents(),
  ]);

  const followedSlugs: string[] = profileRes.data?.followed_hubs ?? [];
  const trackers = (trackersRes.data ?? []) as Tracker[];
  const requests = (requestsRes.data ?? []) as TownRequest[];
  const followedHubs = LOCATIONS.filter(l => followedSlugs.includes(l.slug));

  // The feed: events from followed public hubs + events tagged with any of
  // this user's tracker tags (prefix match — the sheet stores "tag~Town Name").
  const myEvents = eventsData.events.filter(
    e =>
      followedHubs.some(l => eventInLocation(e.location, l)) ||
      trackers.some(t => (e.location ?? '').startsWith(t.tag))
  );
  const grouped = groupEvents(myEvents);
  const hasSelections = followedHubs.length > 0 || trackers.length > 0;

  return (
    <>
      <Header />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-bold uppercase tracking-widest" style={{ color: '#5B9BAE' }}>
              Your personal guide
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight" style={{ color: '#1C3D55' }}>
              My Feed
            </h1>
            <p className="mt-2 text-stone-500 leading-relaxed max-w-xl">
              One feed with just the areas you care about. Signed in as{' '}
              <span className="font-medium text-stone-600">{user.email}</span>.
            </p>
          </div>
          <SignOutButton />
        </div>

        {/* Which public hubs feed this page */}
        <section className="mb-8">
          <h2 className="text-base font-bold mb-2" style={{ color: '#1C3D55' }}>
            Your areas
          </h2>
          <FollowedHubsEditor userId={user.id} initialFollowed={followedSlugs} />
        </section>

        {/* The feed itself */}
        {hasSelections ? (
          <EventsClient
            grouped={grouped}
            rawSubmissions={[]}
            hasApprovedTab={eventsData.hasApprovedTab || myEvents.length > 0}
            submitHref="/submit"
            areaName="your feed"
          />
        ) : (
          <div className="text-center py-10 text-stone-400 bg-white border border-stone-200 rounded-xl mb-8">
            <p>Your feed is empty — pick an area above to start.</p>
          </div>
        )}

        {/* Personal trackers */}
        <section className="mt-12">
          <h2 className="text-base font-bold mb-1" style={{ color: '#1C3D55' }}>
            Your town trackers
          </h2>
          <p className="text-sm text-stone-500 mb-3 leading-relaxed">
            Somewhere we don&apos;t cover yet? Track it yourself — submit links, flyers, or
            notes to your tracker and the events show up here in your feed, visible only to you.
          </p>
          <TrackerManager userId={user.id} initialTrackers={trackers} />
        </section>

        {/* Town promotion requests */}
        <section className="mt-12 mb-4">
          <h2 className="text-base font-bold mb-1" style={{ color: '#1C3D55' }}>
            Want your town on the site for everyone?
          </h2>
          <p className="text-sm text-stone-500 mb-3 leading-relaxed">
            If you&apos;d like one of your towns to become a public page like Bristol or
            Sagamore Beach, ask here — we review every request.
          </p>
          <TownRequestForm userId={user.id} userEmail={user.email ?? ''} trackers={trackers} requests={requests} />
        </section>
      </main>
    </>
  );
}
