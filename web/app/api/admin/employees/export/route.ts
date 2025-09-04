import 'server-only';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { requireAdmin } from '@/lib/adminGuard';

function toCsv(rows: any[]): string {
  const headers = [
    'email',
    'first_name',
    'last_name',
    'agency',
    'service',
    'function',
    'contract_start_date',
    'active',
  ];
  const lines = rows.map((r) => [
    r.email ?? '',
    r.first_name ?? '',
    r.last_name ?? '',
    r.agency?.name ?? '',
    r.service?.name ?? '',
    r.function?.name ?? '',
    r.contract_start_date ?? '',
    r.active ? 'Oui' : 'Non',
  ].map((v: string) => `"${String(v).replaceAll('"','""')}"`).join(','));
  return [headers.join(','), ...lines].join('\n');
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('email, first_name, last_name, active, contract_start_date, agency:agencies(name), service:services(name), function:functions(name)')
    .order('last_name', { ascending: true, nullsFirst: true })
    .order('first_name', { ascending: true, nullsFirst: true });

  if (error) {
    return new NextResponse(error.message, { status: 400 });
  }

  const csv = toCsv(data ?? []);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="employees_export_${new Date().toISOString().slice(0,10)}.csv"`,
    },
  });
}
