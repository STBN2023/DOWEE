import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminGuard';

async function findOrCreateByName(table: 'agencies'|'services', name?: string | null) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  let { data, error } = await supabaseAdmin.from(table).select('id').eq('name', trimmed).maybeSingle();
  if (error) throw error;
  if (data) return data.id as string;
  const ins = await supabaseAdmin.from(table).insert({ name: trimmed }).select('id').single();
  if (ins.error) throw ins.error;
  return ins.data.id as string;
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

function parseCsv(content: string) {
  const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const cols = [] as string[];
    let cur = ''; let inQ = false;
    for (let i=0;i<line.length;i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i+1] === '"') { cur += '"'; i++; }
        else { inQ = !inQ; }
      } else if (ch === ',' && !inQ) {
        cols.push(cur); cur='';
      } else { cur += ch; }
    }
    cols.push(cur);
    const obj: Record<string,string> = {};
    headers.forEach((h, idx) => obj[h] = (cols[idx] ?? '').trim());
    return obj;
  });
  return { headers, rows };
}

export async function POST(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json();
    const csv: string | undefined = body?.csv;
    if (!csv) return NextResponse.json({ error: 'csv manquant' }, { status: 400 });

    const { rows } = parseCsv(csv);
    const report = { inserted: 0, updated: 0, errors: [] as string[] };

    for (const r of rows) {
      const email = r.email;
      if (!email) { report.errors.push('Ligne sans email'); continue; }
      const first_name = r.first_name || null;
      const last_name = r.last_name || null;
      const active = /^(oui|true|1)$/i.test(r.active || 'oui');
      const contract_start_date = r.contract_start_date || null;
      const agencyName = r.agency || null;
      const serviceName = r.service || null;
      const functionName = r.function || null;
      const temp_password = r.temp_password || undefined;

      try {
        // user
        let userId: string | null = null;
        const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
        const already = list.data.users?.find(u => u.email?.toLowerCase() === String(email).toLowerCase());
        if (already) userId = already.id; else {
          const created = await supabaseAdmin.auth.admin.createUser({
            email,
            password: temp_password || undefined,
            email_confirm: !!temp_password,
          });
          if (created.error || !created.data.user) throw new Error(created.error?.message || 'createUser');
          userId = created.data.user.id;
        }

        const agency_id = await findOrCreateByName('agencies', agencyName);
        const service_id = await findOrCreateByName('services', serviceName);
        const function_id = await findOrCreateFunctionUnderService(functionName, service_id);
        const display_name = `${last_name ?? ''} ${first_name ?? ''}`.trim() || email;

        const up = await supabaseAdmin.from('employees').upsert({
          id: userId!, email, display_name, role: 'user', active,
          first_name, last_name, agency_id, service_id, function_id, contract_start_date,
        }, { onConflict: 'id' }).select('id');
        if (up.error) throw up.error;
        if ((up.data?.length ?? 0) > 0) report.inserted++; else report.updated++;
      } catch (e: any) {
        report.errors.push(`${email}: ${e?.message || e}`);
      }
    }

    return NextResponse.json(report);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Erreur import' }, { status: 500 });
  }
}
