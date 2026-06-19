'use client';

import { useState, useMemo } from 'react';
import { Event, Filters, GroupedEvents, RawSubmission } from '@/types/event';
import EventFilters from './EventFilters';
import EventSection from './EventSection';
import SubmissionCard from './SubmissionCard';
import SubmitEventCTA from './SubmitEventCTA';

function filterEvents(events: Event[], filters: Filters): Event[] {
  return events.filter(event => {
    if (filters.town !== 'All') {
      const town = event.town.toLowerCase();
      if (filters.town === 'Other') {
        const known = ['bristol', 'warren', 'providence', 'newport'];
        if (known.some(t => town.includes(t))) return false;
      } else if (!town.includes(filters.town.toLowerCase())) {
        return false;
      }
    }
    if (filters.category !== 'All' && event.category !== filters.category) return false;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const haystack = [event.name, event.venue, event.town, event.description ?? '', event.tags.join(' ')]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

interface Props {
  grouped: GroupedEvents;
  rawSubmissions: RawSubmission[];
  hasApprovedTab: boolean;
}

export default function EventsClient({ grouped, rawSubmissions, hasApprovedTab }: Props) {
  const [filters, setFilters] = useState<Filters>({ town: 'All', category: 'All', search: '' });

  const filtered = useMemo<GroupedEvents>(
    () => ({
      tonight: filterEvents(grouped.tonight, filters),
      thisWeek: filterEvents(grouped.thisWeek, filters),
      upcoming: filterEvents(grouped.upcoming, filters),
      recurring: filterEvents(grouped.recurring, filters),
    }),
    [grouped, filters]
  );

  const totalFiltered =
    filtered.tonight.length + filtered.thisWeek.length + filtered.upcoming.length + filtered.recurring.length;

  const totalAll =
    grouped.tonight.length + grouped.thisWeek.length + grouped.upcoming.length + grouped.recurring.length;

  const hasActiveFilter =
    filters.town !== 'All' || filters.category !== 'All' || filters.search !== '';

  const hasAnything = totalAll > 0 || rawSubmissions.length > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* Only show filters when there are structured events to filter */}
      {hasApprovedTab && totalAll > 0 && (
        <EventFilters filters={filters} onChange={setFilters} totalResults={totalFiltered} />
      )}

      {/* Structured events (Approved Events tab) */}
      {hasApprovedTab && totalAll > 0 && (
        hasActiveFilter && totalFiltered === 0 ? (
          <div className="text-center py-10 text-stone-400">
            <p>No events match your filters.</p>
            <button
              onClick={() => setFilters({ town: 'All', category: 'All', search: '' })}
              className="mt-2 text-teal-600 hover:underline text-sm font-medium"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <EventSection title="Tonight" events={filtered.tonight} />
            <EventSection title="This Week" events={filtered.thisWeek} />
            <EventSection title="Upcoming" events={filtered.upcoming} />
            <EventSection title="Recurring" events={filtered.recurring} showDateBadge={false} />
          </div>
        )
      )}

      {/* Raw submissions — shown publicly as simple link cards */}
      {rawSubmissions.length > 0 && (
        <section>
          <h2 className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-3">
            Submitted Spots
          </h2>
          <div className="flex flex-col gap-3">
            {rawSubmissions.map((s, i) => (
              <SubmissionCard key={i} submission={s} />
            ))}
          </div>
        </section>
      )}

      {/* True empty state */}
      {!hasAnything && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-base">Nothing listed yet — check back soon or</p>
          <p className="mt-1">
            <a href="/submit" className="text-teal-600 hover:underline font-medium">
              submit an event
            </a>
            .
          </p>
        </div>
      )}

      <SubmitEventCTA />
    </div>
  );
}
