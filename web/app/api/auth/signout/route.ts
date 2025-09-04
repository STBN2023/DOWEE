import 'server-only';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  await supabase.auth.signOut();
  return NextResponse.json({ ok: true });
}

export async function GET() {
  // convenience: allow GET during dev to quickly sign out
  return POST();
}
