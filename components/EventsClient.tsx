'use client';

import { useState, useMemo } from 'react';
import { Event, Filters, GroupedEvents, RawSubmission } from '@/types/event';
import EventFilters from './EventFilters';
import EventSection from './EventSection';
import SubmitEventCTA from './SubmitEventCTA';

function filterEvents(events: Event[], filters: Filters): Event[] {
  return events.filter(event => {
    if (filters.town !== 'All' && event.town !== filters.town) return false;
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
  submitHref?: string;
  areaName?: string;
}

export default function EventsClient({ grouped, rawSubmissions, hasApprovedTab, submitHref = '/submit', areaName }: Props) {
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

  // Town options derived from the events actually present in this hub
  const towns = useMemo(() => {
    const set = new Set<string>();
    [grouped.tonight, grouped.thisWeek, grouped.upcoming, grouped.recurring].forEach(arr =>
      arr.forEach(e => { if (e.town && e.town.trim()) set.add(e.town.trim()); })
    );
    return ['All', ...Array.from(set).sort()];
  }, [grouped]);

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
        <div className="flex flex-col gap-2">
          <EventFilters filters={filters} onChange={setFilters} totalResults={totalFiltered} towns={towns} />
          <p className="text-xs text-stone-400 px-1">
            Don&apos;t see your town{areaName ? ` near ${areaName}` : ''}? Tap the{' '}
            <span className="font-semibold" style={{ color: '#5B9BAE' }}>📍 menu at the top</span> to switch regions.
          </p>
        </div>
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
            <p className="mt-3 text-sm">
              In a different area? Tap the <span className="font-semibold" style={{ color: '#5B9BAE' }}>📍 menu at the top</span> to switch regions.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            <EventSection title="Tonight" events={filtered.tonight} showDateHeaders={false} />
            <EventSection title="This Week" events={filtered.thisWeek} />
            <EventSection title="Upcoming" events={filtered.upcoming} />
            {/* Truly undated recurring events — shown as tags, no date headers */}
            <EventSection title="Always Happening" events={filtered.recurring} showDateHeaders={false} />
          </div>
        )
      )}

      {/* True empty state */}
      {!hasAnything && (
        <div className="text-center py-12 text-stone-400">
          <p className="text-base">Nothing listed here yet — check back soon or</p>
          <p className="mt-1">
            <a href={submitHref} className="text-teal-600 hover:underline font-medium">
              submit an event
            </a>
            .
          </p>
        </div>
      )}

      <SubmitEventCTA href={submitHref} areaName={areaName} />
    </div>
  );
}
