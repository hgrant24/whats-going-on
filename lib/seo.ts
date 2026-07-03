import { Event } from '@/types/event';
import { LocationDef, locationPath } from '@/lib/locations';

const SITE_URL = 'https://www.hansonsguide.com';

/** 'East Bay, RI' → 'RI'. Falls back to '' if the region has no state suffix. */
function stateFromRegion(region: string): string {
  const last = region.split(',').pop()?.trim() ?? '';
  return /^[A-Z]{2}$/.test(last) ? last : '';
}

/** Day of month of the nth Sunday of a month (monthIndex 0-based). */
function nthSunday(year: number, monthIndex: number, n: number): number {
  const firstDow = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay(); // 0 = Sun
  const firstSunday = firstDow === 0 ? 1 : 8 - firstDow;
  return firstSunday + (n - 1) * 7;
}

/**
 * UTC offset for a date in US Eastern time (all current hubs are Eastern).
 * DST runs from the second Sunday in March through the first Sunday in November.
 */
function easternOffset(dateISO: string): string {
  const [y, m, d] = dateISO.split('-').map(Number);
  const dstStart = nthSunday(y, 2, 2); // second Sunday in March
  const dstEnd = nthSunday(y, 10, 1); // first Sunday in November
  const inDst =
    (m > 3 || (m === 3 && d >= dstStart)) && (m < 11 || (m === 11 && d < dstEnd));
  return inDst ? '-04:00' : '-05:00';
}

/** Map one Event to a Schema.org Event object for JSON-LD. */
function eventToSchema(event: Event, hub: LocationDef): Record<string, unknown> | null {
  if (!event.startDate) return null;

  const offset = easternOffset(event.startDate);
  const startDate = event.startTime
    ? `${event.startDate}T${event.startTime}:00${offset}`
    : event.startDate;

  const state = stateFromRegion(hub.region);
  const schema: Record<string, unknown> = {
    '@type': 'Event',
    name: event.name,
    startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue || event.town || hub.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.town || hub.name,
        ...(state ? { addressRegion: state } : {}),
        addressCountry: 'US',
      },
    },
  };

  if (event.endTime) schema.endDate = `${event.startDate}T${event.endTime}:00${offset}`;
  if (event.description) schema.description = event.description;
  if (event.sourceLink) schema.url = event.sourceLink;
  if (event.cost) {
    const isFree = /free/i.test(event.cost);
    schema.offers = {
      '@type': 'Offer',
      price: isFree ? '0' : event.cost.replace(/[^0-9.]/g, '') || '0',
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    };
  }
  schema.organizer = { '@type': 'Organization', name: event.venue || "What's Going On" };

  return schema;
}

/**
 * Build a JSON-LD ItemList of upcoming events for a hub page.
 * Limits to the soonest 50 dated events to keep the payload sane.
 */
export function buildEventsJsonLd(events: Event[], hub: LocationDef): string {
  const dated = events
    .filter(e => e.startDate)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(0, 50);

  const path = locationPath(hub);
  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `What's Going On — Events in ${hub.name}, ${hub.region}`,
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    itemListElement: dated
      .map((e, i) => {
        const schema = eventToSchema(e, hub);
        if (!schema) return null;
        return { '@type': 'ListItem', position: i + 1, item: schema };
      })
      .filter(Boolean),
  };

  return JSON.stringify(itemList);
}
