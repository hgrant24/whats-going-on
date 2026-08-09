'use client';

import { Event } from '@/types/event';
import { formatTime } from '@/lib/events';
import { happyHourDays } from '@/lib/happyHour';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function DayStrip({ days, today }: { days: number[]; today: number }) {
  if (days.length === 0) return null;
  const active = new Set(days);
  return (
    <div className="flex gap-1" aria-label="Days offered">
      {DAY_LETTERS.map((letter, idx) => {
        const on = active.has(idx);
        const isToday = idx === today;
        return (
          <span
            key={idx}
            className="w-6 h-6 flex items-center justify-center text-[11px] font-bold rounded-full"
            style={
              on
                ? {
                    backgroundColor: isToday ? '#1C3D55' : 'rgba(168,200,212,0.45)',
                    color: isToday ? 'white' : '#1C3D55',
                  }
                : { backgroundColor: '#f5f5f4', color: '#d6d3d1' }
            }
          >
            {letter}
          </span>
        );
      })}
    </div>
  );
}

function HappyHourCard({ event, today }: { event: Event; today: number }) {
  const days = happyHourDays(event);
  const onToday = days.includes(today);
  const timeStr = [formatTime(event.startTime), formatTime(event.endTime)]
    .filter(Boolean)
    .join(' – ');
  // Prefer the venue as the headline; fall back to the event name
  const headline = event.venue || event.name;
  const showName =
    event.venue && event.name && !/^happy hour$/i.test(event.name.trim()) ? event.name : null;

  return (
    <article className="bg-white rounded-xl border border-stone-200 p-4 hover:border-teal-300 hover:shadow-sm transition-all">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-base font-semibold text-stone-900 leading-snug">{headline}</h3>
        <div className="flex items-center gap-2 shrink-0">
          {onToday && (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
              On today
            </span>
          )}
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            🍻 Happy Hour
          </span>
        </div>
      </div>

      <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-stone-500">
        {showName && <span>{showName}</span>}
        {showName && event.town && <span className="text-stone-400">·</span>}
        {event.town && <span>{event.town}</span>}
      </div>

      {(timeStr || event.recurrenceRule) && (
        <div className="mt-1 text-sm text-stone-500">
          {timeStr && <span>{timeStr}</span>}
          {timeStr && event.recurrenceRule && <span className="text-stone-300 mx-1">·</span>}
          {event.recurrenceRule && (
            <span className="font-medium text-teal-700">{event.recurrenceRule}</span>
          )}
        </div>
      )}

      {event.description && (
        <p className="mt-2 text-sm text-stone-600 leading-relaxed">{event.description}</p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <DayStrip days={days} today={today} />
        <div className="ml-auto flex items-center gap-3">
          {event.sourceLink && (
            <a
              href={event.sourceLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
            >
              View source →
            </a>
          )}
        </div>
      </div>

      {(event.submittedBy || event.lastVerified) && (
        <p className="mt-1.5 text-[11px] text-stone-400">
          {event.submittedBy && <span>Added by {event.submittedBy}</span>}
          {event.submittedBy && event.lastVerified && <span className="mx-1">·</span>}
          {event.lastVerified && <span>Verified {event.lastVerified}</span>}
        </p>
      )}
    </article>
  );
}

interface Props {
  happyHours: Event[];
  submitHref: string;
  areaName?: string;
}

export default function HappyHourList({ happyHours, submitHref, areaName }: Props) {
  const today = new Date().getDay();

  if (happyHours.length === 0) {
    return (
      <div className="text-center py-12 text-stone-400">
        <p className="text-base">
          No happy hours listed{areaName ? ` around ${areaName}` : ''} yet.
        </p>
        <p className="mt-1">
          Know a good one?{' '}
          <a href={submitHref} className="text-teal-600 hover:underline font-medium">
            Submit the spot
          </a>{' '}
          — a link, a photo of the specials board, or just type it out.
        </p>
      </div>
    );
  }

  // Today's happy hours first, then alphabetical by venue
  const sorted = [...happyHours].sort((a, b) => {
    const aToday = happyHourDays(a).includes(today) ? 0 : 1;
    const bToday = happyHourDays(b).includes(today) ? 0 : 1;
    if (aToday !== bToday) return aToday - bToday;
    return (a.venue || a.name).localeCompare(b.venue || b.name);
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-stone-400 px-1">
        Happy hour deals change often — tap the source link to double-check before you go.
      </p>
      {sorted.map(e => (
        <HappyHourCard key={e.id} event={e} today={today} />
      ))}
    </div>
  );
}
