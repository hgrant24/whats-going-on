'use client';

import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = supabaseBrowser();
    if (!supabase) return;

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        // Used by the default email template; with the customized token_hash
        // template this is ignored, which is fine — both paths land on /auth/confirm.
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/me`,
      },
    });

    if (error) {
      setErrorMsg(error.message);
      setStatus('error');
    } else {
      setStatus('sent');
    }
  }

  if (status === 'sent') {
    return (
      <div className="bg-white border border-stone-200 rounded-xl p-6 text-center">
        <p className="text-lg font-semibold" style={{ color: '#1C3D55' }}>
          Check your email ✉️
        </p>
        <p className="mt-1 text-sm text-stone-500">
          We sent a sign-in link to <span className="font-medium">{email.trim()}</span>.
          Click it and you&apos;re in — no password.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-stone-200 rounded-xl p-6 flex flex-col gap-4">
      <div>
        <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#5B9BAE] transition"
        />
      </div>

      {status === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex items-center justify-center text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors disabled:opacity-60"
        style={{ backgroundColor: '#1C3D55' }}
      >
        {status === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}
      </button>
    </form>
  );
}
