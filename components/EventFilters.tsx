'use client';

import { CATEGORIES, Filters, CategoryFilter } from '@/types/event';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
  totalResults: number;
  towns: string[]; // dynamic list derived from the current hub's events
}

export default function EventFilters({ filters, onChange, totalResults, towns }: Props) {
  const hasActiveFilters =
    filters.town !== 'All' || filters.category !== 'All' || filters.search !== '' || filters.freeOnly;

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3.5 flex flex-col gap-3">
      {/* Search */}
      <input
        type="search"
        placeholder="Search events, venues..."
        value={filters.search}
        onChange={e => onChange({ ...filters, search: e.target.value })}
        className="w-full text-sm border border-stone-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-stone-400"
      />

      {/* Town + Category */}
      <div className="flex gap-2 flex-wrap">
        {towns.length > 1 && (
          <select
            value={filters.town}
            onChange={e => onChange({ ...filters, town: e.target.value })}
            className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-stone-700"
          >
            {towns.map(t => (
              <option key={t} value={t}>{t === 'All' ? 'All Towns' : t}</option>
            ))}
          </select>
        )}

        <select
          value={filters.category}
          onChange={e => onChange({ ...filters, category: e.target.value as CategoryFilter })}
          className="text-sm border border-stone-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 text-stone-700"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c === 'All' ? 'All Categories' : c}</option>
          ))}
        </select>

        {/* Tara Mode — free events only */}
        <button
          type="button"
          onClick={() => onChange({ ...filters, freeOnly: !filters.freeOnly })}
          aria-pressed={filters.freeOnly}
          title="Tara Mode — show only free events"
          className="text-sm rounded-lg px-2.5 py-1.5 font-medium border transition-colors"
          style={filters.freeOnly
            ? { backgroundColor: '#1C3D55', color: 'white', borderColor: '#1C3D55' }
            : { backgroundColor: 'white', color: '#1C3D55', borderColor: '#d6d3d1' }}
        >
          🆓 Tara Mode
        </button>

        {hasActiveFilters && (
          <button
            onClick={() => onChange({ town: 'All', category: 'All', search: '', freeOnly: false })}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium transition-colors ml-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-stone-400">
          {totalResults === 0
            ? 'No events match these filters.'
            : `Showing ${totalResults} event${totalResults === 1 ? '' : 's'}`}
        </p>
      )}
    </div>
  );
}
