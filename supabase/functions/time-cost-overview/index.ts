import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview"; start?: string };

function mondayOf(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}
function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

type EmployeeRow = { id: string; team: string | null };
type PlanRow = { project_id: string; employee_id: string; planned_minutes: number; d: string };
type ActualRow = { project_id: string; employee_id: string; minutes: number; d: string };

function normalizeTeam(team?: string | null): "conception" | "créa" | "dev" {
  if (!team) return "conception";
  const b = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (b === "crea" || b === "creation") return "créa";
  if (b === "dev" || b === "developpement" || b === "developement") return "dev";
  return "conception";
}
function round2(n: number) { return Math.round(n * 100) / 100; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "overview") {
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  // Auth + orphan check
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userId).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const start = body.start ? new Date(body.start) : mondayOf(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startIso = isoDate(start);
  const endIso = isoDate(end);

  // Dernière entrée coûts internes
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
  const HOUR = { conception: dayConc / H, "créa": dayCrea / H, dev: dayDev / H };

  const [
    { data: employees, error: emplErr },
    { data: plans, error: planErr },
    { data: actuals, error: actErr },
  ] = await Promise.all([
    admin.from("employees").select("id, team"),
    admin.from("plan_items").select("project_id, employee_id, planned_minutes, d").gte("d", startIso).lte("d", endIso),
    admin.from("actual_items").select("project_id, employee_id, minutes, d").gte("d", startIso).lte("d", endIso),
  ]);

  if (emplErr || planErr || actErr) {
    const msg = emplErr?.message || planErr?.message || actErr?.message || "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const teamMap = new Map<string, string | null>();
  (employees ?? []).forEach((e: any) => teamMap.set(e.id, (e as EmployeeRow).team ?? null));

  type Agg = { hours_planned: number; hours_actual: number; cost_planned: number; cost_actual: number };
  const global: Agg = { hours_planned: 0, hours_actual: 0, cost_planned: 0, cost_actual: 0 };
  const byTeam = new Map<string, Agg>();
  (["conception", "créa", "dev"] as const).forEach((t) => byTeam.set(t, { hours_planned: 0, hours_actual: 0, cost_planned: 0, cost_actual: 0 }));
  const me: Agg = { hours_planned: 0, hours_actual: 0, cost_planned: 0, cost_actual: 0 };

  for (const row of (plans ?? []) as PlanRow[]) {
    const sec = normalizeTeam(teamMap.get(row.employee_id) ?? null);
    const hours = (row.planned_minutes ?? 0) / 60;
    const cost = hours * HOUR[sec];
    global.hours_planned += hours; global.cost_planned += cost;
    const agg = byTeam.get(sec)!; agg.hours_planned += hours; agg.cost_planned += cost;
    if (row.employee_id === userId) { me.hours_planned += hours; me.cost_planned += cost; }
  }

  for (const row of (actuals ?? []) as ActualRow[]) {
    const sec = normalizeTeam(teamMap.get(row.employee_id) ?? null);
    const hours = (row.minutes ?? 0) / 60;
    const cost = hours * HOUR[sec];
    global.hours_actual += hours; global.cost_actual += cost;
    const agg = byTeam.get(sec)!; agg.hours_actual += hours; agg.cost_actual += cost;
    if (row.employee_id === userId) { me.hours_actual += hours; me.cost_actual += cost; }
  }

  global.cost_planned = round2(global.cost_planned); global.cost_actual = round2(global.cost_actual);
  byTeam.forEach((agg) => { agg.cost_planned = round2(agg.cost_planned); agg.cost_actual = round2(agg.cost_actual); });
  me.cost_planned = round2(me.cost_planned); me.cost_actual = round2(me.cost_actual);

  const response = {
    range: { start: startIso, end: endIso },
    global,
    byTeam: (["conception", "créa", "dev"] as const).map((t) => ({ team: t as any, ...byTeam.get(t)! })),
    me,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});