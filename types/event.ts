export const TOWNS = ['All', 'Bristol', 'Warren', 'Providence', 'Newport', 'Other'] as const;
export const CATEGORIES = [
  'All',
  'Trivia',
  'Live Music',
  'Food/Drink',
  'Sports/League',
  'Market',
  'Family',
  'Comedy',
  'Arts/Culture',
  'Other',
] as const;

export type Town = (typeof TOWNS)[number];
export type CategoryFilter = (typeof CATEGORIES)[number];

export interface Event {
  id: string;
  name: string;
  venue: string;
  town: string;
  category: string;
  startDate: string | null; // ISO YYYY-MM-DD
  startTime: string | null;
  endTime: string | null;
  isRecurring: boolean;
  recurrenceRule: string | null;
  description: string | null;
  sourceLink: string | null;
  lastVerified: string | null;
  tags: string[];
  cost: string | null;
  ageFriendly: boolean | null;
  outdoor: boolean | null;
  imageUrl: string | null;
  notes: string | null;
  submittedBy: string | null;
  location: string | null; // hub the event belongs to (e.g. "Bristol", "Sagamore Beach")
}

export interface GroupedEvents {
  tonight: Event[];
  thisWeek: Event[];
  upcoming: Event[];
  recurring: Event[];
}

export interface RawSubmission {
  timestamp: string;
  link: string;
  notes: string;
}

export interface EventsData {
  events: Event[];
  rawSubmissions: RawSubmission[];
  hasApprovedTab: boolean;
  error: string | null;
}

export interface Filters {
  town: string; // dynamic — options derived from the events in the current hub
  category: CategoryFilter;
  search: string;
  freeOnly: boolean; // "Tara Mode" — hide events with a ticket price
}
