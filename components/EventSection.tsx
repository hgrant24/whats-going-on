import { Event } from '@/types/event';
import { formatEventDate, formatTime } from '@/lib/events';
import EventCard from './EventCard';

const CATEGORY_COLORS: Record<string, string> = {
  'Trivia':        'bg-blue-100 text-blue-700',
  'Live Music':    'bg-purple-100 text-purple-700',
  'Food/Drink':    'bg-emerald-100 text-emerald-700',
  'Sports/League': 'bg-orange-100 text-orange-700',
  'Market':        'bg-yellow-100 text-yellow-700',
  'Family':        'bg-pink-100 text-pink-700',
  'Comedy':        'bg-indigo-100 text-indigo-700',
  'Arts/Culture':  'bg-red-100 text-red-700',
  'Other':         'bg-stone-100 text-stone-600',
};

function RecurringTag({ event }: { event: Event }) {
  const colors = CATEGORY_COLORS[event.category] ?? CATEGORY_COLORS['Other'];
  const timeStr = formatTime(event.startTime);
  const label = [
    event.name,
    event.venue ? `@ ${event.venue}` : null,
    timeStr ? `· ${timeStr}` : null,
  ].filter(Boolean).join(' ');

  return event.sourceLink ? (
    <a
      href={event.sourceLink}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full hover:opacity-80 transition-opacity ${colors}`}
      title={event.description ?? undefined}
    >
      {label}
    </a>
  ) : (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${colors}`}
      title={event.description ?? undefined}
    >
      {label}
    </span>
  );
}

interface DateGroup {
  date: string;
  oneOff: Event[];
  recurring: Event[];
}

function buildDateGroups(events: Event[]): DateGroup[] {
  const map = new Map<string, DateGroup>();
  for (const e of events) {
    const key = e.startDate ?? 'undated';
    if (!map.has(key)) map.set(key, { date: key, oneOff: [], recurring: [] });
    if (e.isRecurring) {
      map.get(key)!.recurring.push(e);
    } else {
      map.get(key)!.oneOff.push(e);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

interface Props {
  title: string;
  events: Event[];
  emptyMessage?: string;
  showDateHeaders?: boolean;
}

export default function EventSection({ title, events, emptyMessage, showDateHeaders = true }: Props) {
  if (events.length === 0 && !emptyMessage) return null;

  const groups = buildDateGroups(events);

  return (
    <section>
      <h2 className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-3">{title}</h2>

      {events.length === 0 ? (
        <p className="text-sm text-stone-400 italic">{emptyMessage}</p>
      ) : (
        <div className="flex flex-col gap-5">
          {groups.map(group => {
            const dateInfo = group.date !== 'undated' ? formatEventDate(group.date) : null;
            return (
              <div key={group.date}>
                {/* Date sub-header — shown when there are multiple days in the section */}
                {showDateHeaders && dateInfo && (
                  <div className="flex items-center gap-3 mb-2.5">
                    <span className="text-sm font-semibold text-stone-700">
                      {dateInfo.weekday}, {dateInfo.month} {dateInfo.day}
                    </span>
                    <div className="flex-1 h-px bg-stone-200" />
                  </div>
                )}

                {/* One-off events — full cards */}
                {group.oneOff.length > 0 && (
                  <div className="flex flex-col gap-3">
                    {group.oneOff.map(event => (
                      <EventCard key={event.id} event={event} showDateBadge={false} />
                    ))}
                  </div>
                )}

                {/* Recurring events — colored tag chips */}
                {group.recurring.length > 0 && (
                  <div className={`flex flex-wrap gap-2 ${group.oneOff.length > 0 ? 'mt-2' : ''}`}>
                    {group.recurring.map(event => (
                      <RecurringTag key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
