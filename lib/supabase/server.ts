import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from './config';

/**
 * Server Supabase client for Server Components and Route Handlers.
 * IMPORTANT: calling this makes the route dynamic (it reads cookies), so only
 * use it in pages that are meant to be per-user (e.g. /me), never in shared
 * components like Header. Returns null when Supabase isn't configured.
 */
export function supabaseServer(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookie writes are not allowed
          // there. Safe to ignore: the middleware refreshes sessions for /me.
        }
      },
    },
  });
}
