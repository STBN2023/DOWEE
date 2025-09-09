import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview"; client_id?: string };

type ProjectRow = {
  id: string;
  code: string;
  name: string;
  client_id: string | null;
  status: string;
  quote_amount: number | null;
  budget_conception: number | null;
  budget_crea: number | null;
  budget_dev: number | null;
  tariff_id: string | null;
};
type ClientRow = { id: string; code: string; name: string };
type EmployeeRow = { id: string; team: string | null };
type ActualRow = { project_id: string; employee_id: string; minutes: number };
type PlanRow = { project_id: string; employee_id: string; planned_minutes: number };

// Company internal cost
const COST_PER_DAY = { conception: 800, crea: 500, dev: 800 };
const HOURS_PER_DAY = 8;
const COST_PER_HOUR = {
  conception: COST_PER_DAY.conception / HOURS_PER_DAY,
  crea: COST_PER_DAY.crea / HOURS_PER_DAY,
  dev: COST_PER_DAY.dev / HOURS_PER_DAY,
};

function normalizeTeamSlug(input?: string | null): "conception" | "créa" | "dev" | null {
  if (!input) return null;
  const base = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "crea" || base === "creation") return "créa";
  if (base === "dev" || base === "developpement" || base === "developement") return "dev";
  if (base === "commercial" || base === "conception" || base === "direction") return "conception";
  return "conception";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "overview") {
    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const filterClientId = typeof body.client_id === "string" ? body.client_id : null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  // Auth + orphan check
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Core datasets
  const [
    { data: clients, error: clientsErr },
    { data: projects, error: projErr },
    { data: employees, error: emplErr },
  ] = await Promise.all([
    admin.from("clients").select("id, code, name"),
    admin.from("projects").select("id, code, name, client_id, status, quote_amount, budget_conception, budget_crea, budget_dev, tariff_id").neq("status", "archived"),
    admin.from("employees").select("id, team"),
  ]);

  if (clientsErr || projErr || emplErr) {
    const msg = clientsErr?.message || projErr?.message || emplErr?.message || "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  let activeProjects = (projects ?? []) as ProjectRow[];
  if (filterClientId) {
    activeProjects = activeProjects.filter((p) => p.client_id === filterClientId);
  }
  const projectIds = activeProjects.map((p) => p.id);

  // Load actuals; fallback to plans for projects without actuals
  const { data: actuals, error: actErr } = await admin
    .from("actual_items")
    .select("project_id, employee_id, minutes")
    .in("project_id", projectIds);

  if (actErr) {
    return new Response(JSON.stringify({ error: actErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const projectsWithActuals = new Set<string>((actuals ?? []).map((r: any) => r.project_id as string));
  const withoutActuals = projectIds.filter((id) => !projectsWithActuals.has(id));

  let plans: any[] = [];
  if (withoutActuals.length > 0) {
    const { data: planRows, error: planErr } = await admin
      .from("plan_items")
      .select("project_id, employee_id, planned_minutes")
      .in("project_id", withoutActuals);
    if (planErr) {
      return new Response(JSON.stringify({ error: planErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    plans = planRows ?? [];
  }

  const clientsMap = new Map<string, ClientRow>();
  (clients ?? []).forEach((c) => clientsMap.set((c as any).id, c as any));

  const teamMap = new Map<string, string | null>();
  (employees ?? []).forEach((e) => teamMap.set((e as EmployeeRow).id, (e as EmployeeRow).team ?? null));

  // Cost per project using internal cost per hour
  const costByProject = new Map<string, number>();
  for (const row of (actuals ?? []) as ActualRow[]) {
    const sec = normalizeTeamSlug(teamMap.get(row.employee_id) ?? null) ?? "conception";
    const rate = sec === "créa" ? COST_PER_HOUR.crea : sec === "dev" ? COST_PER_HOUR.dev : COST_PER_HOUR.conception;
    const hours = (row.minutes ?? 0) / 60;
    costByProject.set(row.project_id, (costByProject.get(row.project_id) ?? 0) + hours * rate);
  }
  for (const row of plans as PlanRow[]) {
    if (projectsWithActuals.has(row.project_id)) continue;
    const sec = normalizeTeamSlug(teamMap.get(row.employee_id) ?? null) ?? "conception";
    const rate = sec === "créa" ? COST_PER_HOUR.crea : sec === "dev" ? COST_PER_HOUR.dev : COST_PER_HOUR.conception;
    const hours = (row.planned_minutes ?? 0) / 60;
    costByProject.set(row.project_id, (costByProject.get(row.project_id) ?? 0) + hours * rate);
  }

  const out = [];
  for (const p of activeProjects) {
    const sold = (p.quote_amount ?? 0) || ((p.budget_conception ?? 0) + (p.budget_crea ?? 0) + (p.budget_dev ?? 0));
    const cost = costByProject.get(p.id) ?? 0;
    const margin = Math.round((sold - cost) * 100) / 100;
    const margin_pct = sold > 0 ? Math.round(((margin / sold) * 100) * 100) / 100 : null;
    const cli = p.client_id ? clientsMap.get(p.client_id) ?? null : null;

    out.push({
      project_id: p.id,
      code: p.code,
      name: p.name,
      client: cli ? { id: cli.id, code: cli.code, name: cli.name } : null,
      sold_ht: Math.round((sold) * 100) / 100,
      cost_realized: Math.round((cost) * 100) / 100,
      margin,
      margin_pct,
    });
  }

  return new Response(JSON.stringify({ generated_at: new Date().toISOString(), projects: out }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});