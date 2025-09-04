import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function GET() {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: userData, error } = await supabase.auth.getUser();
  const user = userData?.user || null;

  return NextResponse.json({
    ok: !!user && !error,
    error: error?.message || null,
    user: user ? { id: user.id, email: user.email } : null,
  });
}
