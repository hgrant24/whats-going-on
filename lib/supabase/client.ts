import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from './config';

let client: SupabaseClient | null = null;

/**
 * Browser Supabase client (singleton). Returns null when Supabase isn't
 * configured — callers must handle that by hiding their feature.
 */
export function supabaseBrowser(): SupabaseClient | null {
  if (!supabaseConfigured) return null;
  if (!client) client = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
