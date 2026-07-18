'use client';

import { supabaseBrowser } from '@/lib/supabase/client';

export default function SignOutButton() {
  async function signOut() {
    const supabase = supabaseBrowser();
    if (!supabase) return;
    await supabase.auth.signOut();
    window.location.href = '/'; // full reload clears any server-rendered state
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="shrink-0 text-sm text-stone-400 hover:text-stone-600 transition-colors underline-offset-2 hover:underline"
    >
      Sign out
    </button>
  );
}
