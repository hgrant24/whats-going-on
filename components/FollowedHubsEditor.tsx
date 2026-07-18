'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LOCATIONS } from '@/lib/locations';
import { supabaseBrowser } from '@/lib/supabase/client';

interface Props {
  userId: string;
  initialFollowed: string[]; // hub slugs
}

export default function FollowedHubsEditor({ userId, initialFollowed }: Props) {
  const [followed, setFollowed] = useState<string[]>(initialFollowed);
  const [error, setError] = useState('');
  const router = useRouter();

  async function toggle(slug: string) {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const next = followed.includes(slug)
      ? followed.filter(s => s !== slug)
      : [...followed, slug];

    setFollowed(next); // optimistic
    setError('');

    // Upsert only id + followed_hubs — other profile columns are untouched.
    const { error: err } = await supabase
      .from('profiles')
      .upsert({ id: userId, followed_hubs: next });

    if (err) {
      setFollowed(followed); // roll back
      setError('Could not save that — please try again.');
      return;
    }
    router.refresh(); // re-render the server feed with the new selection
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {LOCATIONS.map(l => {
          const on = followed.includes(l.slug);
          return (
            <button
              type="button"
              key={l.slug}
              onClick={() => toggle(l.slug)}
              aria-pressed={on}
              className="text-sm rounded-full px-3 py-1.5 border font-medium transition-colors"
              style={on
                ? { backgroundColor: '#1C3D55', color: 'white', borderColor: '#1C3D55' }
                : { backgroundColor: 'white', color: '#1C3D55', borderColor: '#d6d3d1' }}
            >
              {on ? '✓ ' : ''}{l.name}
              <span className="ml-1 text-xs font-normal opacity-70">{l.region}</span>
            </button>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
