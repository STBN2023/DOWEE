import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview"; start?: string }; // start = YYYY-MM-DD (lundi)

function mondayOf(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0=Mon
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

// Internal cost rates (per day) and hourly conversion
const COST_PER_DAY = { conception: 800, crea: 500, dev: 800 };
const HOURS_PER_DAY = 8;
const COST_PER_HOUR = {
  conception: COST_PER_DAY.conception / HOURS_PER_DAY,
  crea: COST_PER_DAY.crea / HOURS_PER_DAY,
  dev: COST_PER_DAY.dev / HOURS_PER_DAY,
};

function mapTeamToSection(team: string | null | undefined): "conception" | "créa" | "dev" {
  if (!team) return "conception";
  const base = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "crea" || base === "creation") return "créa";
  if (base === "dev" || base === "developpement" || base === "developement") return "dev";
  return "conception";
}

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

  // Date range (week)
  const start = body.start ? new Date(body.start) : mondayOf(new Date());
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const startIso = isoDate(start);
  const endIso = isoDate(end);

  // Load data
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
  (employees ?? []).forEach((e) => teamMap.set((e as any).id, (e as EmployeeRow).team ?? null));

  type Agg = { hours_planned: number; hours_actual: number; cost_planned: number; cost_actual: number };
  const global: Agg = { hours_planned: 0, hours_actual: 0, cost_planned: 0, cost_actual: 0 };
  const byTeam = new Map<string, Agg>();
  (["conception", "créa", "dev"] as const).forEach((t) => byTeam.set(t, { hours_planned: 0, hours_actual: 0, cost_planned: 0, cost_actual: 0 }));
  const me: Agg = { hours_planned: 0, hours_actual: 0, cost_planned: 0, cost_actual: 0 };

  // Plans
  for (const row of (plans ?? []) as PlanRow[]) {
    const section = mapTeamToSection(teamMap.get(row.employee_id) ?? null);
    const hours = (row.planned_minutes ?? 0) / 60;
    const rate = section === "conception" ? COST_PER_HOUR.conception : section === "créa" ? COST_PER_HOUR.crea : COST_PER_HOUR.dev;
    const cost = hours * rate;

    global.hours_planned += hours;
    global.cost_planned += cost;

    const agg = byTeam.get(section)!;
    agg.hours_planned += hours;
    agg.cost_planned += cost;

    if (row.employee_id === userId) {
      me.hours_planned += hours;
      me.cost_planned += cost;
    }
  }

  // Actuals
  for (const row of (actuals ?? []) as ActualRow[]) {
    const section = mapTeamToSection(teamMap.get(row.employee_id) ?? null);
    const hours = (row.minutes ?? 0) / 60;
    const rate = section === "conception" ? COST_PER_HOUR.conception : section === "créa" ? COST_PER_HOUR.crea : COST_PER_HOUR.dev;
    const cost = hours * rate;

    global.hours_actual += hours;
    global.cost_actual += cost;

    const agg = byTeam.get(section)!;
    agg.hours_actual += hours;
    agg.cost_actual += cost;

    if (row.employee_id === userId) {
      me.hours_actual += hours;
      me.cost_actual += cost;
    }
  }

  // Round cost to 2 decimals
  function round2(n: number) { return Math.round(n * 100) / 100; }
  global.cost_planned = round2(global.cost_planned);
  global.cost_actual = round2(global.cost_actual);
  byTeam.forEach((agg) => {
    agg.cost_planned = round2(agg.cost_planned);
    agg.cost_actual = round2(agg.cost_actual);
  });
  me.cost_planned = round2(me.cost_planned);
  me.cost_actual = round2(me.cost_actual);

  const response = {
    range: { start: startIso, end: endIso },
    global,
    byTeam: (["conception", "créa", "dev"] as const).map((t) => ({ team: t, ...byTeam.get(t)! })),
    me,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});