import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "export" };

type ProjectRow = {
  id: string;
  client_id: string | null;
  status: string;
  quote_amount: number | null;
  budget_conception: number | null;
  budget_crea: number | null;
  budget_dev: number | null;
};
type EmployeeRow = { id: string; team: string | null };
type ActualRow = { project_id: string; employee_id: string; minutes: number };
type PlanRow = { project_id: string; employee_id: string; planned_minutes: number };

function normalizeTeamSlug(input?: string | null): "conception" | "créa" | "dev" | null {
  if (!input) return null;
  const base = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "crea" || base === "creation") return "créa";
  if (base === "dev" || base === "developpement" || base === "developement") return "dev";
  if (base === "commercial" || base === "conception" || base === "direction") return "conception";
  return "conception";
}
function round2(n: number) { return Math.round(n * 100) / 100; }
function csvEscape(s: any) {
  const str = String(s ?? "");
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "export") return new Response("Invalid action", { status: 400, headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response("Unauthorized", { status: 401, headers: corsHeaders });

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle();
  if (empErr) return new Response(empErr.message, { status: 400, headers: corsHeaders });
  if (!empRow) return new Response("Forbidden: orphan session", { status: 403, headers: corsHeaders });

  const [
    { data: clients, error: clientsErr },
    { data: projects, error: projErr },
    { data: employees, error: emplErr },
  ] = await Promise.all([
    admin.from("clients").select("id, code, name"),
    admin.from("projects").select("id, client_id, status, quote_amount, budget_conception, budget_crea, budget_dev").neq("status", "archived"),
    admin.from("employees").select("id, team"),
  ]);

  if (clientsErr || projErr || emplErr) {
    const msg = clientsErr?.message || projErr?.message || emplErr?.message || "Unknown error";
    return new Response(msg, { status: 400, headers: corsHeaders });
  }

  const { data: costRows } = await admin
    .from("ref_internal_costs")
    .select("rate_conception, rate_crea, rate_dev, effective_from, created_at")
    .order("effective_from", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1);
  const dayConc = Number(costRows?.[0]?.rate_conception ?? 800);
  const dayCrea = Number(costRows?.[0]?.rate_crea ?? 500);
  const dayDev = Number(costRows?.[0]?.rate_dev ?? 800);
  const H = 8;
  const HOUR = { conception: dayConc / H, créa: dayCrea / H, dev: dayDev / H };

  const activeProjects = (projects ?? []) as ProjectRow[];
  const projectIds = activeProjects.map((p) => p.id);

  const { data: actuals, error: actErr } = await admin
    .from("actual_items")
    .select("project_id, employee_id, minutes")
    .in("project_id", projectIds);
  if (actErr) return new Response(actErr.message, { status: 400, headers: corsHeaders });

  const projectsWithActuals = new Set<string>((actuals ?? []).map((r: any) => r.project_id as string));
  const withoutActuals = projectIds.filter((id) => !projectsWithActuals.has(id));

  let plans: any[] = [];
  if (withoutActuals.length > 0) {
    const { data: planRows, error: planErr } = await admin
      .from("plan_items")
      .select("project_id, employee_id, planned_minutes")
      .in("project_id", withoutActuals);
    if (planErr) return new Response(planErr.message, { status: 400, headers: corsHeaders });
    plans = planRows ?? [];
  }

  const teamMap = new Map<string, string | null>();
  (employees ?? []).forEach((e) => teamMap.set((e as EmployeeRow).id, (e as EmployeeRow).team ?? null));

  const costByProject = new Map<string, number>();
  for (const row of (actuals ?? []) as any as { project_id: string; employee_id: string; minutes: number }[]) {
    const sec = normalizeTeamSlug(teamMap.get(row.employee_id) ?? null) ?? "conception";
    const hours = (row.minutes ?? 0) / 60;
    costByProject.set(row.project_id, (costByProject.get(row.project_id) ?? 0) + hours * HOUR[sec]);
  }
  for (const row of (plans as any[])) {
    const proj = (row as any).project_id as string;
    if (projectsWithActuals.has(proj)) continue;
    const sec = normalizeTeamSlug(teamMap.get((row as any).employee_id) ?? null) ?? "conception";
    const hours = ((row as any).planned_minutes ?? 0) / 60;
    costByProject.set(proj, (costByProject.get(proj) ?? 0) + hours * HOUR[sec]);
  }

  const clientMap = new Map<string, { id: string; code: string; name: string }>();
  (clients ?? []).forEach((c) => clientMap.set((c as any).id, c as any));

  const rows = new Map<string, { code: string; name: string; projects_count: number; sold_total_ht: number; cost_total: number }>();

  for (const p of activeProjects) {
    const client_id = p.client_id;
    if (!client_id) continue;
    const c = clientMap.get(client_id);
    if (!c) continue;
    const sold = (p.quote_amount ?? 0) || ((p.budget_conception ?? 0) + (p.budget_crea ?? 0) + (p.budget_dev ?? 0));
    const cost = costByProject.get(p.id) ?? 0;

    if (!rows.has(client_id)) rows.set(client_id, { code: (c as any).code, name: (c as any).name, projects_count: 0, sold_total_ht: 0, cost_total: 0 });
    const agg = rows.get(client_id)!;
    agg.projects_count += 1;
    agg.sold_total_ht += sold;
    agg.cost_total += cost;
  }

  const header = ["code","name","projects_count","sold_total_ht","cost_total","margin","margin_pct"];
  const lines = [header.join(",")];
  for (const [_, r] of rows.entries()) {
    const sold = round2(r.sold_total_ht);
    const cost = round2(r.cost_total);
    const margin = round2(sold - cost);
    const margin_pct = sold > 0 ? round2((margin / sold) * 100) : null;
    lines.push([csvEscape(r.code), csvEscape(r.name), r.projects_count, sold, cost, margin, margin_pct ?? ""].join(","));
  }

  const filename = `clients_profitability_${new Date().toISOString().slice(0,10)}.csv`;
  return new Response(lines.join("\n"), {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});