// Central switch for the optional accounts layer. When these env vars are
// unset the whole personal-features layer quietly disappears (AuthNav renders
// nothing, /login explains, /me redirects home) and the public site is
// completely unaffected — so the app builds and deploys fine without Supabase.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
export const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
