import { Event, GroupedEvents } from '@/types/event';

// ─────────────────────────────────────────────────────────────────────────
// Happy hour helpers — a "happy hour" is any event with category Happy Hour,
// or one whose name/tags say so. They're pulled OUT of the normal event
// timeline and shown on their own tab, one entry per venue.
// ─────────────────────────────────────────────────────────────────────────

export function isHappyHour(e: Event): boolean {
  if ((e.category ?? '').trim().toLowerCase() === 'happy hour') return true;
  if (/\bhappy hour\b/i.test(e.name)) return true;
  return e.tags.some(t => /\bhappy hour\b/i.test(t));
}

const DAY_IDX: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

/**
 * Parse the weekdays a happy hour runs from free text like
 * "Mon–Fri 3–6 PM", "Every Thursday", "Daily 4-6", "Weekends".
 * Returns sorted unique day indices (0 = Sunday). Empty = unknown.
 */
export function parseDays(text: string | null | undefined): number[] {
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) return [];
  if (/\b(daily|every ?day|all week|7 days)\b/.test(t)) return [0, 1, 2, 3, 4, 5, 6];

  const days = new Set<number>();
  if (/\bweekdays?\b/.test(t)) [1, 2, 3, 4, 5].forEach(d => days.add(d));
  if (/\bweekends?\b/.test(t)) [0, 6].forEach(d => days.add(d));

  // Ranges: "mon–fri", "thursday through sunday" (ranges may wrap the week)
  const range = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\s*(?:[-–—]|to\s|through\s|thru\s)\s*(sun|mon|tue|wed|thu|fri|sat)[a-z]*/g;
  const consumed: Array<[number, number]> = [];
  let m: RegExpExecArray | null;
  while ((m = range.exec(t))) {
    let d = DAY_IDX[m[1]];
    const end = DAY_IDX[m[2]];
    days.add(d);
    let guard = 0;
    while (d !== end && guard++ < 7) {
      d = (d + 1) % 7;
      days.add(d);
    }
    consumed.push([m.index, m.index + m[0].length]);
  }

  // Single day mentions outside any range
  const single = /\b(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/g;
  while ((m = single.exec(t))) {
    const pos = m.index;
    if (consumed.some(([s, e]) => pos >= s && pos < e)) continue;
    days.add(DAY_IDX[m[1]]);
  }

  return Array.from(days).sort((a, b) => a - b);
}

/** Days a happy hour runs, checking its fields in order of reliability. */
export function happyHourDays(e: Event): number[] {
  for (const src of [e.recurrenceRule, e.name, e.description, e.notes]) {
    const days = parseDays(src);
    if (days.length > 0) return days;
  }
  return [];
}

function dedupKey(e: Event): string {
  const norm = (s: string | null) =>
    (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  return `${norm(e.name)}|${norm(e.venue)}`;
}

/**
 * Split grouped events into the normal timeline (happy hours removed) and a
 * deduped happy hour list. Extraction may have expanded a recurring happy
 * hour into many dated rows — those collapse to one entry per venue here.
 */
export function splitHappyHours(grouped: GroupedEvents): {
  events: GroupedEvents;
  happyHours: Event[];
} {
  const happyHours: Event[] = [];
  const seen = new Set<string>();

  const strip = (arr: Event[]) =>
    arr.filter(e => {
      if (!isHappyHour(e)) return true;
      const key = dedupKey(e);
      if (!seen.has(key)) {
        seen.add(key);
        happyHours.push(e);
      }
      return false;
    });

  return {
    events: {
      // Undated recurring rows first — they carry the canonical schedule
      recurring: strip(grouped.recurring),
      tonight: strip(grouped.tonight),
      thisWeek: strip(grouped.thisWeek),
      upcoming: strip(grouped.upcoming),
    },
    happyHours,
  };
}
