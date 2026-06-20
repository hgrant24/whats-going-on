import { Event } from '@/types/event';

const SITE_URL = 'https://www.hansonsguide.com';

/** Map one Event to a Schema.org Event object for JSON-LD. */
function eventToSchema(event: Event): Record<string, unknown> | null {
  if (!event.startDate) return null;

  const startDate = event.startTime
    ? `${event.startDate}T${event.startTime}:00-04:00`
    : event.startDate;

  const schema: Record<string, unknown> = {
    '@type': 'Event',
    name: event.name,
    startDate,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: event.venue || event.town || 'Bristol, RI',
      address: {
        '@type': 'PostalAddress',
        addressLocality: event.town || 'Bristol',
        addressRegion: 'RI',
        addressCountry: 'US',
      },
    },
  };

  if (event.endTime) schema.endDate = `${event.startDate}T${event.endTime}:00-04:00`;
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
 * Build a JSON-LD ItemList of upcoming events for the home page.
 * Limits to the soonest 50 dated events to keep the payload sane.
 */
export function buildEventsJsonLd(events: Event[]): string {
  const dated = events
    .filter(e => e.startDate)
    .sort((a, b) => (a.startDate ?? '').localeCompare(b.startDate ?? ''))
    .slice(0, 50);

  const itemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: "What's Going On — Bristol & East Bay RI Events",
    url: SITE_URL,
    itemListElement: dated
      .map((e, i) => {
        const schema = eventToSchema(e);
        if (!schema) return null;
        return { '@type': 'ListItem', position: i + 1, item: schema };
      })
      .filter(Boolean),
  };

  return JSON.stringify(itemList);
}
