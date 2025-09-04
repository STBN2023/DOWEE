import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  try {
    // Désactivé par défaut via variable d'environnement
    if (process.env.BOOTSTRAP_ENABLED !== 'true') {
      return NextResponse.json({ error: 'disabled' }, { status: 410 });
    }
    // 1) Auth du setup via header secret
    const token = req.headers.get('x-setup-token');
    if (!token || token !== process.env.SETUP_TOKEN) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }

    // 2) Refuser si un admin existe déjà
    const { count, error: adminErr } = await supabaseAdmin
      .from('employees')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin');
    if (adminErr) return NextResponse.json({ error: adminErr.message }, { status: 500 });
    if ((count ?? 0) > 0) return NextResponse.json({ error: 'admin_exists' }, { status: 409 });

    // 3) Récupérer les champs
    const { email, password, displayName } = await req.json();
    if (!email || typeof email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'invalid_email' }, { status: 400 });
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json({ error: 'invalid_password' }, { status: 400 });
    }

    // 4) Créer (ou récupérer) l’utilisateur Auth
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    let userId = created?.user?.id ?? null;
    if (createErr) {
      // si l'utilisateur existe déjà, tenter de le retrouver par listUsers
      const alreadyExists = /already exists|User already registered/i.test(createErr.message);
      if (!alreadyExists) {
        return NextResponse.json({ error: createErr.message }, { status: 400 });
      }
    }

    if (!userId) {
      const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
      userId = list.users.find(u => u.email?.toLowerCase() === String(email).toLowerCase())?.id ?? null;
      if (!userId) return NextResponse.json({ error: 'user_not_found' }, { status: 400 });
    }

    // 5) Upsert employees
    const { error: upsertErr } = await supabaseAdmin
      .from('employees')
      .upsert({ id: userId, email, display_name: displayName ?? 'Admin', role: 'admin', active: true }, { onConflict: 'id' });
    if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 });

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'unknown_error' }, { status: 500 });
  }
}
