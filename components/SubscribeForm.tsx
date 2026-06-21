'use client';

import { useState } from 'react';
import { LOCATIONS } from '@/lib/locations';

interface Props {
  endpoint: string;
  defaultTown: string; // hub name, e.g. "Bristol" — pre-selected
}

export default function SubscribeForm({ endpoint, defaultTown }: Props) {
  const [email, setEmail] = useState('');
  const [towns, setTowns] = useState<string[]>([defaultTown]);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  function toggleTown(name: string) {
    setTowns(prev => (prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    if (towns.length === 0) {
      setErrorMsg('Pick at least one area.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const body = new URLSearchParams();
      body.set('kind', 'subscribe');
      body.set('email', email.trim());
      body.set('towns', towns.join(','));
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
      setStatus('done');
      setEmail('');
    } catch {
      setErrorMsg('Something went wrong. Please try again.');
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 text-center">
        <p className="font-semibold" style={{ color: '#1C3D55' }}>You&apos;re on the list ✉️</p>
        <p className="mt-1 text-sm text-stone-500">
          Check your inbox — a welcome email with this week&apos;s {towns.join(' & ')} events is on its way.
          You&apos;ll get a fresh one every Wednesday morning.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-base font-bold" style={{ color: '#1C3D55' }}>Get the week ahead by email</h2>
      <p className="mt-1 mb-3 text-sm text-stone-500">
        A free Wednesday-morning rundown of what&apos;s happening — pick any areas you want.
      </p>

      <input
        type="email"
        required
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="you@email.com"
        className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5B9BAE] focus:border-transparent"
      />

      <div className="mt-3">
        <p className="text-xs font-medium text-stone-500 mb-1.5">Areas (pick one or more)</p>
        <div className="flex flex-wrap gap-2">
          {LOCATIONS.map(l => {
            const on = towns.includes(l.name);
            return (
              <button
                type="button"
                key={l.slug}
                onClick={() => toggleTown(l.name)}
                aria-pressed={on}
                className="text-sm rounded-full px-3 py-1.5 border font-medium transition-colors"
                style={on
                  ? { backgroundColor: '#1C3D55', color: 'white', borderColor: '#1C3D55' }
                  : { backgroundColor: 'white', color: '#1C3D55', borderColor: '#d6d3d1' }}
              >
                {on ? '✓ ' : ''}{l.name}
              </button>
            );
          })}
        </div>
      </div>

      {status === 'error' && <p className="mt-2 text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
        style={{ backgroundColor: '#1C3D55' }}
      >
        {status === 'submitting' ? 'Joining…' : 'Subscribe'}
      </button>
    </form>
  );
}
