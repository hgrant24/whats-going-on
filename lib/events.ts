import Papa from 'papaparse';
import { Event, EventsData, GroupedEvents, RawSubmission } from '@/types/event';

function normalizeKey(key: string): string {
  return key.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function parseBoolean(value: string | undefined): boolean | null {
  if (!value) return null;
  const v = value.toLowerCase().trim();
  if (['yes', 'true', 'y', '1'].includes(v)) return true;
  if (['no', 'false', 'n', '0'].includes(v)) return false;
  return null;
}

function parseDate(dateStr: string | undefined | null): string | null {
  if (!dateStr?.trim()) return null;
  const s = dateStr.trim();

  // Already ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/DD/YYYY or M/D/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Fallback: let Date constructor try
  const date = new Date(s);
  if (!isNaN(date.getTime())) {
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${mo}-${d}`;
  }

  return null;
}

function parseTags(tagsStr: string | undefined): string[] {
  if (!tagsStr?.trim()) return [];
  return tagsStr.split(',').map(t => t.trim()).filter(Boolean);
}

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDatePlusDaysISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function fetchCsv(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 600 } });
    if (!res.ok) {
      console.error(`CSV fetch failed: ${res.status} ${res.statusText} — ${url}`);
      return null;
    }
    return await res.text();
  } catch (err) {
    console.error('CSV fetch error:', err);
    return null;
  }
}

function parseApprovedRows(rows: Record<string, string>[]): Event[] {
  return rows
    .map((row, idx) => {
      const n: Record<string, string> = {};
      Object.entries(row).forEach(([k, v]) => { n[normalizeKey(k)] = (v ?? '').trim(); });

      const get = (...keys: string[]): string => {
        for (const k of keys) { if (n[k]) return n[k]; }
        return '';
      };

      const name = get('event_name', 'name', 'title', 'event');
      if (!name) return null;

      return {
        id: `event-${idx}`,
        name,
        venue: get('venue', 'location', 'place'),
        town: get('town', 'city', 'location_town'),
        category: get('category', 'type', 'event_type') || 'Other',
        startDate: parseDate(get('start_date', 'date', 'event_date', 'start')),
        startTime: get('start_time', 'time', 'event_time', 'starts') || null,
        endTime: get('end_time', 'ends', 'end') || null,
        isRecurring: parseBoolean(get('recurring_', 'recurring', 'is_recurring', 'repeats')) ?? false,
        recurrenceRule: get('recurrence_rule', 'recurrence', 'repeat_rule', 'schedule') || null,
        description: get('description', 'details', 'about') || null,
        sourceLink: get('source_link', 'link', 'url', 'website', 'source') || null,
        lastVerified: get('last_verified', 'verified', 'last_updated') || null,
        tags: parseTags(get('tags', 'tag')),
        cost: get('cost', 'price', 'admission', 'fee') || null,
        ageFriendly: parseBoolean(get('age_friendly_', 'age_friendly', 'family_friendly', 'all_ages')) ?? null,
        outdoor: parseBoolean(get('outdoor_', 'outdoor', 'outside')) ?? null,
        imageUrl: get('image_url', 'image', 'photo', 'img') || null,
        notes: get('notes', 'additional_notes', 'extra') || null,
        submittedBy: get('submitted_by', 'submittedby', 'added_by', 'your_name', 'submitter') || null,
      } as Event;
    })
    .filter((e): e is Event => e !== null);
}

function parseRawRows(rows: Record<string, string>[]): RawSubmission[] {
  return rows.map((row, idx) => {
    const n: Record<string, string> = {};
    Object.entries(row).forEach(([k, v]) => { n[normalizeKey(k)] = (v ?? '').trim(); });
    return {
      timestamp: n['timestamp'] || `Row ${idx + 1}`,
      link: n['link'] || n['url'] || '',
      notes: n['notes'] || '',
    };
  });
}

export async function fetchEvents(): Promise<EventsData> {
  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
  const rawUrl = process.env.RAW_SUBMISSIONS_CSV_URL;

  if (!csvUrl) {
    return {
      events: [],
      rawSubmissions: [],
      hasApprovedTab: false,
      error: 'GOOGLE_SHEET_CSV_URL is not set. Add it to your environment variables.',
    };
  }

  const csvText = await fetchCsv(csvUrl);
  if (!csvText) {
    return {
      events: [],
      rawSubmissions: [],
      hasApprovedTab: false,
      error: 'Could not load events from Google Sheets. Please check back soon.',
    };
  }

  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (result.errors.length > 0) {
    console.error('CSV parse errors:', result.errors);
  }

  const rows = result.data.filter(row => Object.values(row).some(v => v?.trim()));

  if (rows.length === 0) {
    return { events: [], rawSubmissions: [], hasApprovedTab: false, error: null };
  }

  const keys = Object.keys(rows[0]).map(normalizeKey);
  const hasName = keys.some(k => ['event_name', 'name', 'title'].includes(k));
  const hasVenue = keys.some(k => k === 'venue');
  const hasDate = keys.some(k => ['start_date', 'date', 'event_date'].includes(k));
  const isApprovedSheet = hasName || (hasVenue && hasDate);

  if (isApprovedSheet) {
    const today = getTodayISO();
    const events = parseApprovedRows(rows).filter(e => {
      if (e.isRecurring || !e.startDate) return true;
      return e.startDate >= today;
    });

    let rawSubmissions: RawSubmission[] = [];
    if (rawUrl) {
      const rawText = await fetchCsv(rawUrl);
      if (rawText) {
        const rawResult = Papa.parse<Record<string, string>>(rawText, {
          header: true,
          skipEmptyLines: true,
        });
        rawSubmissions = parseRawRows(rawResult.data);
      }
    }

    return { events, rawSubmissions, hasApprovedTab: true, error: null };
  }

  // Looks like raw form submissions
  const rawSubmissions = parseRawRows(rows);
  return { events: [], rawSubmissions, hasApprovedTab: false, error: null };
}

export function groupEvents(events: Event[]): GroupedEvents {
  const today = getTodayISO();
  const weekFromNow = getDatePlusDaysISO(7);

  const tonight: Event[] = [];
  const thisWeek: Event[] = [];
  const upcoming: Event[] = [];
  const recurring: Event[] = [];

  events.forEach(event => {
    // Only truly undated events go to the recurring bucket.
    // Recurring events with a specific date go into the normal timeline
    // so they can appear as tags under their day.
    if (!event.startDate) {
      recurring.push(event);
      return;
    }
    if (event.startDate === today) {
      tonight.push(event);
    } else if (event.startDate > today && event.startDate <= weekFromNow) {
      thisWeek.push(event);
    } else if (event.startDate > today) {
      upcoming.push(event);
    }
  });

  const byDateTime = (a: Event, b: Event): number => {
    const d = (a.startDate ?? '').localeCompare(b.startDate ?? '');
    if (d !== 0) return d;
    return (a.startTime ?? '').localeCompare(b.startTime ?? '');
  };

  return {
    tonight: tonight.sort(byDateTime),
    thisWeek: thisWeek.sort(byDateTime),
    upcoming: upcoming.sort(byDateTime),
    recurring,
  };
}

export function formatEventDate(iso: string): { month: string; day: string; weekday: string; full: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return {
    month: date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
    day: String(d),
    weekday: date.toLocaleDateString('en-US', { weekday: 'short' }),
    full: date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }),
  };
}

export function formatTime(t: string | null): string {
  if (!t) return '';
  const match = t.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return t;
  const h = parseInt(match[1]);
  const min = match[2];
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return min === '00' ? `${h12} ${ampm}` : `${h12}:${min} ${ampm}`;
}
