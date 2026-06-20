import { Event } from '@/types/event';

const WEEKDAY_TO_BYDAY: Record<number, string> = {
  0: 'SU', 1: 'MO', 2: 'TU', 3: 'WE', 4: 'TH', 5: 'FR', 6: 'SA',
};

/** "HH:MM" -> "HHMMSS"; null/"" -> null */
function timeToParts(t: string | null): string | null {
  if (!t) return null;
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return `${m[1].padStart(2, '0')}${m[2]}00`;
}

/** Add hours to an "HH:MM" string, clamping at 23:59 */
function addHours(t: string, hours: number): string {
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t;
  let h = parseInt(m[1], 10) + hours;
  if (h > 23) h = 23;
  return `${String(h).padStart(2, '0')}:${m[2]}`;
}

function ymd(iso: string): string {
  return iso.replace(/-/g, '');
}

function nextDayYmd(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d + 1);
  return `${dt.getFullYear()}${String(dt.getMonth() + 1).padStart(2, '0')}${String(dt.getDate()).padStart(2, '0')}`;
}

/**
 * Build a Google Calendar "add event" URL for an event.
 * Returns null for undated events (nothing to add).
 * Recurring weekly events include an RRULE so the whole series is added.
 */
export function googleCalendarUrl(event: Event): string | null {
  if (!event.startDate) return null;

  const params = new URLSearchParams();
  params.set('action', 'TEMPLATE');
  params.set('text', event.name);

  const startTime = timeToParts(event.startTime);
  if (startTime) {
    const endRaw = event.endTime ?? addHours(event.startTime as string, 2);
    const endTime = timeToParts(endRaw) ?? startTime;
    params.set('dates', `${ymd(event.startDate)}T${startTime}/${ymd(event.startDate)}T${endTime}`);
    params.set('ctz', 'America/New_York');
  } else {
    // All-day event
    params.set('dates', `${ymd(event.startDate)}/${nextDayYmd(event.startDate)}`);
  }

  const location = [event.venue, event.town, 'RI'].filter(Boolean).join(', ');
  if (location) params.set('location', location);

  const details = [event.description, 'via hansonsguide.com'].filter(Boolean).join('\n\n');
  params.set('details', details);

  // Weekly recurrence for recurring events
  if (event.isRecurring) {
    const [y, m, d] = event.startDate.split('-').map(Number);
    const weekday = new Date(y, m - 1, d).getDay();
    const byday = WEEKDAY_TO_BYDAY[weekday];
    if (byday) params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${byday}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
