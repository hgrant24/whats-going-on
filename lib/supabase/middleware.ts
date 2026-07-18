import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_URL, SUPABASE_ANON_KEY, supabaseConfigured } from './config';

/**
 * Refreshes the auth session on /me requests. Server Components can't write
 * cookies, so without this a returning visitor with an expired access token
 * would bounce to /login even though their refresh token is still good.
 */
export async function updateSession(request: NextRequest) {
  if (!supabaseConfigured) return NextResponse.next({ request });

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Triggers a token refresh if needed; do not add logic between client
  // creation and this call, per @supabase/ssr guidance.
  await supabase.auth.getUser();

  return response;
}
