import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin, requireRole } from '@/lib/adminGuard';

// TODO: Ajouter une vraie vérification d'admin (via auth-helpers) avant d'autoriser POST

async function findOrCreateByName(table: 'agencies'|'services', name?: string | null) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  // Try find
  let { data, error } = await supabaseAdmin.from(table).select('id').eq('name', trimmed).maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const ins = await supabaseAdmin.from(table).insert({ name: trimmed }).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data.id as string;
}

export async function PATCH(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json();
    const {
      id,
      first_name,
      last_name,
      active,
      contract_start_date,
      agency,
      service,
      function: jobFunction,
      avatar_url,
      role,
    } = body || {};

    if (!id) {
      return NextResponse.json({ error: 'Champ requis: id' }, { status: 400 });
    }

    const agency_id = await findOrCreateByName('agencies', agency);
    const service_id = await findOrCreateByName('services', service);
    const function_id = await findOrCreateFunctionUnderService(jobFunction, service_id);

    const patch: any = {
      first_name,
      last_name,
      active,
      contract_start_date,
      agency_id,
      service_id,
      function_id,
      avatar_url,
    };
    if (role) patch.role = role; // only admins reach here

    // remove undefined to avoid overwriting with null
    Object.keys(patch).forEach((k) => {
      if (typeof patch[k] === 'undefined') delete patch[k];
    });

    const upd = await supabaseAdmin.from('employees').update(patch).eq('id', id).select('id').single();
    if (upd.error) return NextResponse.json({ error: upd.error.message }, { status: 400 });
    return NextResponse.json({ id: upd.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur inconnue' }, { status: 500 });
  }
}

async function findOrCreateFunctionUnderService(funcName?: string | null, service_id?: string | null) {
  if (!funcName) return null;
  const name = funcName.trim();
  if (!name) return null;
  const q = supabaseAdmin.from('functions').select('id').eq('name', name);
  const { data, error } = service_id ? await q.eq('service_id', service_id).maybeSingle() : await q.is('service_id', null).maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const ins = await supabaseAdmin.from('functions').insert({ name, service_id: service_id ?? null }).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data.id as string;
}

export async function GET() {
  const guard = await requireRole(['admin', 'manager']);
  if (!guard.ok) return guard.response;
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, first_name, last_name, email, active, contract_start_date, agency:agencies(name), service:services(name), function:functions(name)')
    .order('last_name', { ascending: true, nullsFirst: true })
    .order('first_name', { ascending: true, nullsFirst: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ rows: data ?? [] });
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json();
    const {
      email,
      first_name,
      last_name,
      active = true,
      contract_start_date,
      agency,
      service,
      function: jobFunction,
      temp_password,
      avatar_url,
      role = 'user',
    } = body || {};

    if (!email || !first_name || !last_name) {
      return NextResponse.json({ error: 'Champs requis: email, first_name, last_name' }, { status: 400 });
    }

    // Create auth user (or fetch existing)
    let userId: string | null = null;
    const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const already = list.data.users?.find(u => u.email?.toLowerCase() === String(email).toLowerCase()) ?? null;
    if (already) {
      userId = already.id;
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: temp_password || undefined,
        email_confirm: !!temp_password, // si mot de passe fourni, on considère confirmé
      });
      if (created.error || !created.data.user) {
        return NextResponse.json({ error: created.error?.message || 'Impossible de créer l’utilisateur' }, { status: 400 });
      }
      userId = created.data.user.id;
    }

    // Upsert referentials
    const agency_id = await findOrCreateByName('agencies', agency);
    const service_id = await findOrCreateByName('services', service);
    const function_id = await findOrCreateFunctionUnderService(jobFunction, service_id);

    const display_name = `${last_name ?? ''} ${first_name ?? ''}`.trim();

    // Upsert employee row
    const upsert = await supabaseAdmin
      .from('employees')
      .upsert({
        id: userId!,
        email,
        display_name: display_name || email,
        role,
        active: !!active,
        first_name,
        last_name,
        agency_id,
        service_id,
        function_id,
        contract_start_date,
        avatar_url,
      }, { onConflict: 'id' })
      .select('id')
      .single();

    if (upsert.error) return NextResponse.json({ error: upsert.error.message }, { status: 400 });

    return NextResponse.json({ id: upsert.data.id });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur inconnue' }, { status: 500 });
  }
}
