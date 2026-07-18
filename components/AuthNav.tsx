'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

/**
 * Session-aware nav item. Lives client-side ONLY so the Header (and every
 * static page it sits on) never touches cookies — SSG pages prerender the
 * logged-out state and hydrate to the real one.
 */
export default function AuthNav() {
  const [signedIn, setSignedIn] = useState<boolean | null>(null); // null = unknown

  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Not configured (supabaseBrowser() === null) → signedIn stays null → render
  // nothing and the header looks exactly like it does today.
  if (signedIn === null) return null;

  return signedIn ? (
    <Link href="/me" className="hover:text-[#1C3D55] transition-colors whitespace-nowrap">
      My Feed
    </Link>
  ) : (
    <Link href="/login" className="hover:text-[#1C3D55] transition-colors whitespace-nowrap">
      Sign in
    </Link>
  );
}
