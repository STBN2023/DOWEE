import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "list" };

type EmployeeRow = { id: string; team: string | null };
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
  due_date: string | null; // YYYY-MM-DD
  effort_days: number | null;
};
type ClientRow = { id: string; code: string; name: string; segment: string | null; star: boolean | null };
type ActualRow = { project_id: string; employee_id: string; minutes: number };
type PlanRow = { project_id: string; employee_id: string; planned_minutes: number };

// Internal cost
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
function rateKey(team: string | null | undefined): "rate_conception" | "rate_crea" | "rate_dev" {
  const norm = normalizeTeamSlug(team);
  if (norm === "créa") return "rate_crea";
  if (norm === "dev") return "rate_dev";
  return "rate_conception";
}
function sClient(segment?: string | null): number {
  if (!segment) return 50; // défaut
  const b = segment.toLowerCase();
  if (b.includes("super")) return 80;
  if (b.includes("pas")) return 20;
  return 50; // normal
}
function sMarge(pct: number | null): number {
  if (pct == null) return 50;
  if (pct <= 0) return 0;
  if (pct < 20) return 20 + 2 * (pct - 1); // 22..58
  if (pct < 40) return 60 + 2 * (pct - 20); // 60..98
  return 100;
}
function sUrgence(daysLeft: number | null, effortDays: number | null): number {
  if (daysLeft == null || effortDays == null || effortDays <= 0) return 50;
  const B = daysLeft / effortDays;
  if (B <= 0) return 100;
  if (B < 1) return 90;
  if (B < 3) return 60;
  return 20;
}
function clamp100(n: number) { return Math.min(100, Math.max(0, n)); }
function round2(n: number) { return Math.round(n * 100) / 100; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "list") return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  // Auth + orphan check
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const userId = userData.user.id;

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userId).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Core datasets
  const [
    { data: projects, error: projErr },
    { data: clients, error: clientsErr },
    { data: employees, error: emplErr },
  ] = await Promise.all([
    admin.from("projects").select("id, code, name, client_id, status, quote_amount, budget_conception, budget_crea, budget_dev, tariff_id, due_date, effort_days").neq("status", "archived"),
    admin.from("clients").select("id, code, name, segment, star"),
    admin.from("employees").select("id, team"),
  ]);

  if (projErr || clientsErr || emplErr) {
    const msg = projErr?.message || clientsErr?.message || emplErr?.message || "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const projArr = (projects ?? []) as ProjectRow[];
  const projIds = projArr.map((p) => p.id);

  const [{ data: actuals, error: actErr }] = await Promise.all([
    admin.from("actual_items").select("project_id, employee_id, minutes").in("project_id", projIds),
  ]);
  if (actErr) return new Response(JSON.stringify({ error: actErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const projectsWithActuals = new Set<string>((actuals ?? []).map((r: any) => r.project_id as string));
  const withoutActuals = projIds.filter((id) => !projectsWithActuals.has(id));
  let plans: any[] = [];
  if (withoutActuals.length > 0) {
    const { data: planRows, error: planErr } = await admin.from("plan_items").select("project_id, employee_id, planned_minutes").in("project_id", withoutActuals);
    if (planErr) return new Response(JSON.stringify({ error: planErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    plans = planRows ?? [];
  }

  const clientsMap = new Map<string, ClientRow>();
  (clients ?? []).forEach((c: any) => clientsMap.set(c.id, c as ClientRow));

  const teamMap = new Map<string, string | null>();
  (employees ?? []).forEach((e: any) => teamMap.set(e.id, (e as EmployeeRow).team ?? null));

  // Costs per project using internal company cost
  const costByProject = new Map<string, number>();
  for (const row of (actuals ?? []) as ActualRow[]) {
    const sec = normalizeTeamSlug(teamMap.get(row.employee_id) ?? null) ?? "conception";
    const rate = sec === "créa" ? COST_PER_HOUR.crea : sec === "dev" ? COST_PER_HOUR.dev : COST_PER_HOUR.conception;
    const hours = (row.minutes ?? 0) / 60;
    costByProject.set(row.project_id, (costByProject.get(row.project_id) ?? 0) + hours * rate);
  }
  for (const row of (plans as PlanRow[])) {
    if (projectsWithActuals.has(row.project_id)) continue;
    const sec = normalizeTeamSlug(teamMap.get(row.employee_id) ?? null) ?? "conception";
    const rate = sec === "créa" ? COST_PER_HOUR.crea : sec === "dev" ? COST_PER_HOUR.dev : COST_PER_HOUR.conception;
    const hours = (row.planned_minutes ?? 0) / 60;
    costByProject.set(row.project_id, (costByProject.get(row.project_id) ?? 0) + hours * rate);
  }

  const out = [];
  const today = new Date();
  function daysLeft(dIso?: string | null): number | null {
    if (!dIso) return null;
    const [y,m,dd] = dIso.split("-").map((x) => parseInt(x, 10));
    const due = new Date(Date.UTC(y, m - 1, dd));
    const now = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    const diff = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  }

  for (const p of projArr) {
    const cli = p.client_id ? clientsMap.get(p.client_id) ?? null : null;
    const sold = (p.quote_amount ?? 0) || ((p.budget_conception ?? 0) + (p.budget_crea ?? 0) + (p.budget_dev ?? 0));
    const cost = costByProject.get(p.id) ?? 0;
    const margin = round2(sold - cost);
    const margin_pct = sold > 0 ? round2((margin / sold) * 100) : null;

    const s_client = sClient(cli?.segment ?? null);
    const s_marge = sMarge(margin_pct);
    const dLeft = daysLeft(p.due_date ?? null);
    const s_urg = sUrgence(dLeft, p.effort_days ?? null);
    const s_rec = 0; // non disponible
    const s_strat = 0; // non disponible

    const raw = 0.25 * s_client + 0.35 * s_marge + 0.20 * s_urg + 0.10 * s_rec + 0.10 * s_strat;
    const mult = cli?.star ? 1.15 : 1;
    const score = clamp100(round2(raw * mult));

    out.push({
      project_id: p.id,
      code: p.code,
      name: p.name,
      client: cli ? { id: cli.id, code: cli.code, name: cli.name } : null,
      score,
      margin_pct,
      due_date: p.due_date,
      effort_days: p.effort_days,
      segment: cli?.segment ?? null,
      star: !!cli?.star,
    });
  }

  return new Response(JSON.stringify({ scores: out }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});