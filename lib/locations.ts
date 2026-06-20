// ─────────────────────────────────────────────────────────────────────────
// LOCATIONS — the only place you edit to add a new hub.
// Add an object here (slug + name + region + blurb) and a new page,
// dropdown entry, sitemap entry, and submit option all appear automatically.
// ─────────────────────────────────────────────────────────────────────────

export interface LocationDef {
  slug: string;       // URL segment, e.g. 'sagamore-beach'  ('' default hub lives at '/')
  name: string;       // display name + the value stored in the sheet's Location column
  region: string;     // short subtitle, e.g. 'East Bay, RI'
  blurb: string;      // hero subtitle sentence
  isDefault?: boolean; // the hub served at '/'
}

export const LOCATIONS: LocationDef[] = [
  {
    slug: 'bristol',
    name: 'Bristol',
    region: 'East Bay, RI',
    blurb:
      'A simple local guide to trivia, live music, markets, food events, and things happening around Bristol and the East Bay.',
    isDefault: true,
  },
  {
    slug: 'sagamore-beach',
    name: 'Sagamore Beach',
    region: 'Cape Cod, MA',
    blurb:
      'A simple local guide to trivia, live music, markets, food events, and things happening around Sagamore Beach and the Upper Cape.',
  },
  {
    slug: 'somerville',
    name: 'Somerville',
    region: 'Greater Boston, MA',
    blurb:
      'A simple local guide to trivia, live music, markets, food events, and things happening around Somerville and Greater Boston.',
  },
  {
    slug: 'saratoga',
    name: 'Saratoga',
    region: 'Saratoga Springs, NY',
    blurb:
      'A simple local guide to trivia, live music, markets, food events, and things happening around Saratoga Springs.',
  },
];

export const DEFAULT_LOCATION: LocationDef =
  LOCATIONS.find(l => l.isDefault) ?? LOCATIONS[0];

export function getLocationBySlug(slug: string): LocationDef | undefined {
  return LOCATIONS.find(l => l.slug === slug.toLowerCase());
}

/** Path for a hub: the default hub lives at '/', others at '/<slug>'. */
export function locationPath(loc: LocationDef): string {
  return loc.isDefault ? '/' : `/${loc.slug}`;
}

/**
 * Does an event belong to this hub?
 * - Tagged events match by hub name or slug.
 * - Untagged/legacy events (blank Location) fall to the default hub,
 *   so nothing that was added before locations existed disappears.
 */
export function eventInLocation(eventLocation: string | null | undefined, loc: LocationDef): boolean {
  const v = (eventLocation ?? '').trim().toLowerCase();
  if (!v) return !!loc.isDefault;
  return v === loc.name.toLowerCase() || v === loc.slug.toLowerCase();
}
