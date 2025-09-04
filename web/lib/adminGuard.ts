import 'server-only';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

type GuardOk = { ok: true; user: { id: string } };
type GuardFail = { ok: false; response: NextResponse };

export async function requireRole(allowed: Array<'admin'|'manager'|'user'>): Promise<GuardOk | GuardFail> {
  const cookieStore = cookies();
  // Use auth-helpers for Route Handlers, works with middleware to refresh cookies
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { data: userData, error } = await supabase.auth.getUser();
  const user = userData?.user;
  if (error || !user) {
    return { ok: false as const, response: NextResponse.json({ error: 'Unauthorized: no valid Supabase session' }, { status: 401 }) };
  }

  const { data, error: roleErr } = await supabaseAdmin
    .from('employees')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (roleErr || !data) {
    return { ok: false as const, response: NextResponse.json({ error: 'Forbidden: no employee row for this user' }, { status: 403 }) };
  }

  if (!allowed.includes(data.role as any)) {
    return { ok: false as const, response: NextResponse.json({ error: `Forbidden: role '${data.role}' not allowed` }, { status: 403 }) };
  }

  return { ok: true as const, user: { id: user.id } };
}

export async function requireAdmin() {
  return requireRole(['admin']);
}
