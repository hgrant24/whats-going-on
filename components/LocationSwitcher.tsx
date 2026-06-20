'use client';

import Link from 'next/link';
import { LOCATIONS, DEFAULT_LOCATION, locationPath } from '@/lib/locations';

const REQUEST_EMAIL = 'hansongrant1@gmail.com';

export default function LocationSwitcher({ currentSlug }: { currentSlug: string }) {
  const current = LOCATIONS.find(l => l.slug === currentSlug) ?? DEFAULT_LOCATION;

  return (
    <details className="relative [&_summary::-webkit-details-marker]:hidden">
      <summary
        className="list-none flex items-center gap-1 cursor-pointer rounded-full pl-2 pr-2.5 py-1 text-sm font-semibold hover:bg-stone-100 transition-colors"
        style={{ color: '#1C3D55' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{current.name}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </summary>

      <div className="absolute left-0 mt-2 w-60 bg-white border border-stone-200 rounded-xl shadow-lg p-1.5 z-50">
        <p className="px-2.5 pt-1 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-400">
          Choose your area
        </p>
        {LOCATIONS.map(l => {
          const active = l.slug === current.slug;
          return (
            <Link
              key={l.slug}
              href={locationPath(l)}
              className={`flex items-center justify-between rounded-lg px-2.5 py-2 text-sm transition-colors ${
                active ? 'bg-stone-100' : 'hover:bg-stone-50'
              }`}
            >
              <span className="font-medium" style={{ color: active ? '#1C3D55' : undefined }}>
                {l.name}
              </span>
              <span className="text-xs text-stone-400">{l.region}</span>
            </Link>
          );
        })}
        <a
          href={`mailto:${REQUEST_EMAIL}?subject=${encodeURIComponent("What's Going On — new town request")}&body=${encodeURIComponent('Which town would you like to see added?\n\nTown:\nWhy:')}`}
          className="block rounded-lg px-2.5 py-2 mt-0.5 text-sm font-medium border-t border-stone-100 hover:bg-stone-50 transition-colors"
          style={{ color: '#5B9BAE' }}
        >
          + Request your town
        </a>
      </div>
    </details>
  );
}
