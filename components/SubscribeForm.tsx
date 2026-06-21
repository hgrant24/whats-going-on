'use client';

import { useState } from 'react';
import { LOCATIONS } from '@/lib/locations';

interface Props {
  endpoint: string;
  defaultTown: string; // hub name, e.g. "Bristol"
}

export default function SubscribeForm({ endpoint, defaultTown }: Props) {
  const [email, setEmail] = useState('');
  const [town, setTown] = useState(defaultTown);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'done' | 'error'>('idle');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setStatus('error');
      return;
    }
    setStatus('submitting');
    try {
      const body = new URLSearchParams();
      body.set('kind', 'subscribe');
      body.set('email', email.trim());
      body.set('town', town);
      await fetch(endpoint, { method: 'POST', mode: 'no-cors', body });
      setStatus('done');
      setEmail('');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'done') {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-5 text-center">
        <p className="font-semibold" style={{ color: '#1C3D55' }}>You&apos;re on the list ✉️</p>
        <p className="mt-1 text-sm text-stone-500">
          Every Wednesday morning you&apos;ll get the week ahead in {town}.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="text-base font-bold" style={{ color: '#1C3D55' }}>Get the week ahead by email</h2>
      <p className="mt-1 mb-3 text-sm text-stone-500">
        A free Wednesday-morning rundown of what&apos;s happening — pick your area.
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#5B9BAE] focus:border-transparent"
        />
        <select
          value={town}
          onChange={e => setTown(e.target.value)}
          aria-label="Area"
          className="rounded-lg border border-stone-300 bg-white px-2.5 py-2 text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#5B9BAE]"
        >
          {LOCATIONS.map(l => (
            <option key={l.slug} value={l.name}>{l.name}</option>
          ))}
        </select>
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-60"
          style={{ backgroundColor: '#1C3D55' }}
        >
          {status === 'submitting' ? 'Joining…' : 'Subscribe'}
        </button>
      </div>
      {status === 'error' && (
        <p className="mt-2 text-sm text-red-600">Please enter a valid email address.</p>
      )}
    </form>
  );
}
