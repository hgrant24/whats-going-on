'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Tracker } from '@/types/account';

// Tag (12 chars) + '~' + name must fit the backend's 40-char location cap.
const MAX_NAME = 27;

interface Props {
  userId: string;
  initialTrackers: Tracker[];
}

export default function TrackerManager({ userId, initialTrackers }: Props) {
  const [trackers, setTrackers] = useState<Tracker[]>(initialTrackers);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function createTracker(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    if (!supabase) return;

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Give it a name — usually the town, like "Warren, RI".');
      return;
    }
    if (trimmed.length > MAX_NAME) {
      setError(`Keep it under ${MAX_NAME} characters (try "Warren, RI" style).`);
      return;
    }

    setBusy(true);
    setError('');
    const { data, error: err } = await supabase
      .from('trackers')
      .insert({ user_id: userId, name: trimmed })
      .select('id, name, region, tag, created_at')
      .single();
    setBusy(false);

    if (err || !data) {
      setError('Could not create that tracker — please try again.');
      return;
    }
    setTrackers([...trackers, data as Tracker]);
    setName('');
    router.refresh();
  }

  async function deleteTracker(t: Tracker) {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    if (!window.confirm(`Delete "${t.name}"? Events you already submitted to it will disappear from your feed.`)) return;

    const { error: err } = await supabase.from('trackers').delete().eq('id', t.id);
    if (err) {
      setError('Could not delete that tracker — please try again.');
      return;
    }
    setTrackers(trackers.filter(x => x.id !== t.id));
    router.refresh();
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-5">
      {trackers.length > 0 && (
        <ul className="mb-4 flex flex-col gap-2">
          {trackers.map(t => (
            <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: '#1C3D55' }}>📍 {t.name}</p>
                <p className="text-xs text-stone-400">Private — only you see these events</p>
              </div>
              <div className="flex items-center gap-3 shrink-0 text-sm">
                <Link
                  href={`/submit?trk=${encodeURIComponent(t.tag)}`}
                  className="font-medium hover:underline"
                  style={{ color: '#5B9BAE' }}
                >
                  Add events →
                </Link>
                <button
                  type="button"
                  onClick={() => deleteTracker(t)}
                  className="text-stone-400 hover:text-red-600 transition-colors"
                  aria-label={`Delete ${t.name}`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={createTracker} className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={MAX_NAME}
          placeholder='Town to track, e.g. "Warren, RI"'
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9BAE] transition"
        />
        <button
          type="submit"
          disabled={busy}
          className="shrink-0 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#1C3D55' }}
        >
          {busy ? 'Creating…' : 'Create tracker'}
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
