import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireRole } from '@/lib/adminGuard';

export async function GET() {
  // Optionnel: lecture via admin pour contourner RLS si besoin, mais tout auth peut déjà lire.
  const { data, error } = await supabaseAdmin
    .from('tariffs_reference')
    .select('id,name,daily_rate,hourly_rate,currency,active')
    .order('name', { ascending: true, nullsFirst: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(['admin','manager']);
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json();
    const { id, name, daily_rate, hourly_rate, currency, active } = body || {};
    if (!id) return NextResponse.json({ error: 'Champ requis: id' }, { status: 400 });
    const patch: any = { name, daily_rate, hourly_rate, currency, active };
    Object.keys(patch).forEach((k) => { if (typeof patch[k] === 'undefined') delete patch[k]; });
    const upd = await supabaseAdmin
      .from('tariffs_reference')
      .update(patch)
      .eq('id', id)
      .select('id')
      .single();
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 });
    return NextResponse.json({ id: upd.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur inconnue' }, { status: 500 });
  }
}
