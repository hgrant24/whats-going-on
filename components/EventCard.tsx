import { Event } from '@/types/event';
import { formatEventDate, formatTime } from '@/lib/events';
import { googleCalendarUrl } from '@/lib/calendar';

const CATEGORY_STYLES: Record<string, string> = {
  'Trivia': 'bg-blue-100 text-blue-700',
  'Live Music': 'bg-purple-100 text-purple-700',
  'Food/Drink': 'bg-emerald-100 text-emerald-700',
  'Sports/League': 'bg-orange-100 text-orange-700',
  'Market': 'bg-yellow-100 text-yellow-700',
  'Family': 'bg-pink-100 text-pink-700',
  'Comedy': 'bg-indigo-100 text-indigo-700',
  'Arts/Culture': 'bg-red-100 text-red-700',
  'Other': 'bg-stone-100 text-stone-600',
};

function categoryStyle(cat: string): string {
  return CATEGORY_STYLES[cat] ?? CATEGORY_STYLES['Other'];
}

interface Props {
  event: Event;
  showDateBadge?: boolean;
}

export default function EventCard({ event, showDateBadge = true }: Props) {
  const timeStr = [formatTime(event.startTime), formatTime(event.endTime)]
    .filter(Boolean)
    .join(' – ');

  const dateInfo = event.startDate ? formatEventDate(event.startDate) : null;

  const recurrenceDisplay = event.recurrenceRule
    ? event.recurrenceRule
    : event.isRecurring
    ? 'Recurring'
    : null;

  const calUrl = googleCalendarUrl(event);

  return (
    <article className="bg-white rounded-xl border border-stone-200 p-4 flex gap-4 hover:border-teal-300 hover:shadow-sm transition-all">
      {/* Date badge */}
      {showDateBadge && (
        <div className="shrink-0 w-14">
          {dateInfo ? (
            <div className="flex flex-col items-center bg-stone-100 rounded-lg px-2 py-2 text-center">
              <span className="text-[10px] font-bold tracking-widest text-stone-500">
                {dateInfo.month}
              </span>
              <span className="text-2xl font-bold text-stone-800 leading-tight">{dateInfo.day}</span>
              <span className="text-[10px] font-medium text-stone-400">{dateInfo.weekday}</span>
            </div>
          ) : (
            <div className="flex flex-col items-center bg-teal-50 rounded-lg px-2 py-2 text-center">
              <span className="text-[10px] font-bold text-teal-600 leading-tight">EVERY</span>
              <span className="text-[10px] font-bold text-teal-600 leading-tight mt-0.5">WEEK</span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <h3 className="text-base font-semibold text-stone-900 leading-snug">{event.name}</h3>
          {event.category && (
            <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${categoryStyle(event.category)}`}>
              {event.category}
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-stone-500">
          {event.venue && <span>{event.venue}</span>}
          {event.town && <span className="text-stone-400">·</span>}
          {event.town && <span>{event.town}</span>}
        </div>

        {(timeStr || recurrenceDisplay) && (
          <div className="mt-1 text-sm text-stone-500">
            {timeStr && <span>{timeStr}</span>}
            {timeStr && recurrenceDisplay && <span className="text-stone-300 mx-1">·</span>}
            {recurrenceDisplay && <span className="font-medium text-teal-700">{recurrenceDisplay}</span>}
          </div>
        )}

        {event.description && (
          <p className="mt-2 text-sm text-stone-600 line-clamp-2 leading-relaxed">
            {event.description}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {event.cost && (
            <span className="text-xs bg-stone-50 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
              {event.cost}
            </span>
          )}
          {event.outdoor === true && (
            <span className="text-xs bg-stone-50 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
              Outdoors
            </span>
          )}
          {event.ageFriendly === true && (
            <span className="text-xs bg-stone-50 border border-stone-200 text-stone-600 px-2 py-0.5 rounded-full">
              All ages
            </span>
          )}
          {event.tags.map(tag => (
            <span
              key={tag}
              className="text-xs bg-stone-50 border border-stone-200 text-stone-500 px-2 py-0.5 rounded-full"
            >
              {tag}
            </span>
          ))}
          <div className="ml-auto flex items-center gap-3">
            {calUrl && (
              <a
                href={calUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold hover:opacity-70 transition-opacity"
                style={{ color: '#5B9BAE' }}
              >
                + Calendar
              </a>
            )}
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
      </div>
    </article>
  );
}
