import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // ONLY personal pages — keeps /, /[location], /submit, /about untouched so
  // the public site stays fully static/ISR with zero middleware overhead.
  matcher: ['/me/:path*'],
};
