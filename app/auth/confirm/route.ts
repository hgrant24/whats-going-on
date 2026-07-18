import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';

/**
 * Magic-link landing. Handles both flows:
 *  - token_hash (customized email template — works across browsers/devices)
 *  - code       (default template PKCE flow — works out of the box, same browser)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/me';
  // Only allow same-site relative redirects
  const dest = next.startsWith('/') && !next.startsWith('//') ? next : '/me';

  const supabase = supabaseServer();
  if (supabase) {
    if (tokenHash && type) {
      const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
      if (!error) return NextResponse.redirect(new URL(dest, request.url));
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) return NextResponse.redirect(new URL(dest, request.url));
    }
  }

  return NextResponse.redirect(new URL('/login?error=link', request.url));
}
