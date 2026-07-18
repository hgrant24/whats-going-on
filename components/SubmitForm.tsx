'use client';

import { useEffect, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { Tracker } from '@/types/account';

const MAX_IMAGE_MB = 10;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface LocationOption {
  slug: string;
  name: string;
  region: string;
}

interface Props {
  endpoint: string;
  formUrl?: string;
  locations: LocationOption[];
  initialLocation: string;    // hub name to preselect
  initialTrackerTag?: string; // personal tracker tag to preselect (from /submit?trk=)
}

export default function SubmitForm({ endpoint, formUrl, locations, initialLocation, initialTrackerTag }: Props) {
  const [url, setUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState(initialLocation);
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const honeypotRef = useRef<HTMLInputElement>(null);

  // Signed-in users can aim a submission at one of their private trackers.
  // The tracker value posted as `location` is "tag~Town Name" — the backend
  // splits it so Claude sees the town, the sheet keeps the tag.
  const [trackers, setTrackers] = useState<Tracker[]>([]);
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user || cancelled) return;
      const { data: rows } = await supabase
        .from('trackers')
        .select('id, name, region, tag, created_at')
        .order('created_at');
      if (cancelled || !rows) return;
      setTrackers(rows as Tracker[]);
      if (initialTrackerTag) {
        const t = (rows as Tracker[]).find(x => x.tag === initialTrackerTag);
        if (t) setLocation(`${t.tag}~${t.name}`);
      }
    });
    return () => { cancelled = true; };
  }, [initialTrackerTag]);

  const inputClass =
    'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9BAE] transition';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    if (!url.trim() && !notes.trim() && !file) {
      setErrorMsg('Add an event link, some details, or a photo.');
      return;
    }
    if (file && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      setErrorMsg(`That image is over ${MAX_IMAGE_MB} MB — please choose a smaller one.`);
      return;
    }

    setStatus('submitting');
    try {
      const body = new URLSearchParams();
      body.set('url', url.trim());
      body.set('notes', notes.trim());
      body.set('name', name.trim());
      body.set('location', location);
      body.set('topic', honeypotRef.current?.value ?? ''); // honeypot — humans leave it empty
      if (file) {
        body.set('imageData', await fileToDataUrl(file));
        body.set('imageName', file.name);
        body.set('imageType', file.type || 'image/jpeg');
      }

      // Apps Script web apps don't return CORS headers, so we fire-and-forget.
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
      setStatus('success');
      setUrl(''); setNotes(''); setName(''); setFile(null);
    } catch {
      setStatus('error');
      setErrorMsg('Something went wrong sending that. Please try again.');
    }
  }

  if (status === 'success') {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 text-center">
        <p className="text-lg font-semibold" style={{ color: '#1C3D55' }}>Thanks — got it! 🎉</p>
        <p className="mt-1 text-sm text-stone-500">
          We&apos;ll review it and add it to the feed, usually within a day or two.
        </p>
        <button
          onClick={() => setStatus('idle')}
          className="mt-4 text-sm font-medium hover:underline"
          style={{ color: '#5B9BAE' }}
        >
          Submit another →
        </button>
      </div>
    );
  }

  const submitting = status === 'submitting';

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col gap-4">
      {/* Honeypot — invisible to people; bots that fill it are silently dropped */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Topic
          <input ref={honeypotRef} type="text" name="topic" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {(locations.length > 1 || trackers.length > 0) && (
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Area</label>
          <select
            value={location}
            onChange={e => setLocation(e.target.value)}
            className={inputClass}
          >
            {trackers.length > 0 ? (
              <>
                <optgroup label="Public areas">
                  {locations.map(l => (
                    <option key={l.slug} value={l.name}>{l.name} — {l.region}</option>
                  ))}
                </optgroup>
                <optgroup label="My private trackers">
                  {trackers.map(t => (
                    <option key={t.id} value={`${t.tag}~${t.name}`}>📍 {t.name} (only you)</option>
                  ))}
                </optgroup>
              </>
            ) : (
              locations.map(l => (
                <option key={l.slug} value={l.name}>{l.name} — {l.region}</option>
              ))
            )}
          </select>
          <p className="mt-1 text-xs text-stone-400">
            {location.startsWith('trk_')
              ? 'Goes to your private tracker — only you will see these events.'
              : 'Which area is this event in?'}
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Event link <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="url"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Website, Eventbrite, or event listing…"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Details <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="e.g. Trivia every Tuesday 7pm at The Beehive"
          className={`${inputClass} resize-y`}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Your name <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="So we can credit you"
          className={inputClass}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">
          Photo of a local flyer, chalkboard, or screenshot from social <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-stone-500 file:mr-3 file:rounded-lg file:border-0 file:bg-stone-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-stone-700 hover:file:bg-stone-200"
        />
        {file && <p className="mt-1 text-xs text-stone-400">{file.name}</p>}
        <p className="mt-1 text-xs text-stone-400">We&apos;ll read the events right off the image.</p>
      </div>

      {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        style={{ backgroundColor: '#1C3D55' }}
      >
        {submitting ? (file ? 'Uploading photo…' : 'Sending…') : 'Submit event'}
      </button>

      {formUrl && (
        <p className="text-xs text-stone-400 text-center">
          Prefer the Google Form?{' '}
          <a href={formUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-stone-600">
            Open it here
          </a>
          .
        </p>
      )}
    </form>
  );
}
