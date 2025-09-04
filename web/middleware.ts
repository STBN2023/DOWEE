import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  try {
    // This will refresh the session if needed and set auth cookies on the response
    const supabase = createMiddlewareClient({ req, res });
    await supabase.auth.getSession();
  } catch (e) {
    // swallow middleware errors; do not block the request
  }
  return res;
}

// Run on all app routes except Next static assets and public files
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|logo.*|.*\\.(?:png|jpg|jpeg|gif|webp|svg)).*)',
  ],
};
