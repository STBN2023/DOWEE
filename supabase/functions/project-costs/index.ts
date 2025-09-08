import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview" };

type Tariff = {
  id: string;
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
};

type ProjectRow = {
  id: string;
  status: string;
  tariff_id: string | null;
};

type EmployeeRow = {
  id: string;
  team: string | null;
};

type PlanRow = {
  project_id: string;
  employee_id: string;
  planned_minutes: number;
};

type ActualRow = {
  project_id: string;
  employee_id: string;
  minutes: number;
};

function mapTeamToRateKey(team: string | null | undefined): "rate_conception" | "rate_crea" | "rate_dev" {
  if (!team) return "rate_conception";
  const base = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "crea" || base === "creation") return "rate_crea";
  if (base === "dev" || base === "developpement" || base === "developement") return "rate_dev";
  // commercial, direction, autres → conception par défaut
  return "rate_conception";
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

  // RLS-aware client for current user
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service client for cross-tenant aggregates
  const admin = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: `Bearer ${serviceRole}` } },
  });

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
  if (empErr) {
    return new Response(JSON.stringify({ error: empErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!empRow) {
    return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Load core data in parallel
  const [
    { data: projects, error: projErr },
    { data: tariffs, error: tarErr },
    { data: employees, error: emplErr },
    { data: plans, error: planErr },
    { data: actuals, error: actErr },
  ] = await Promise.all([
    admin.from("projects").select("id, status, tariff_id"),
    admin.from("ref_tariffs").select("id, label, rate_conception, rate_crea, rate_dev"),
    admin.from("employees").select("id, team"),
    admin.from("plan_items").select("project_id, employee_id, planned_minutes"),
    admin.from("actual_items").select("project_id, employee_id, minutes"),
  ]);

  if (projErr || tarErr || emplErr || planErr || actErr) {
    const msg = projErr?.message || tarErr?.message || emplErr?.message || planErr?.message || actErr?.message || "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const tariffMap = new Map<string, Tariff>();
  (tariffs ?? []).forEach((t) => tariffMap.set(t.id, t as Tariff));

  const teamMap = new Map<string, string | null>();
  (employees ?? []).forEach((e) => teamMap.set(e.id, (e as EmployeeRow).team ?? null));

  const result: Record<string, { cost_planned: number; cost_actual: number }> = {};
  const projectsArr = (projects ?? []) as ProjectRow[];

  // Pre-init projects with 0 cost
  for (const p of projectsArr) {
    result[p.id] = { cost_planned: 0, cost_actual: 0 };
  }

  // Sum planned
  for (const row of (plans ?? []) as PlanRow[]) {
    const proj = projectsArr.find((p) => p.id === row.project_id);
    if (!proj) continue;
    const tariff = proj.tariff_id ? tariffMap.get(proj.tariff_id) : null;
    if (!tariff) continue;

    const team = teamMap.get(row.employee_id) ?? null;
    const rateKey = mapTeamToRateKey(team);
    const rate = (tariff as any)[rateKey] as number | undefined;
    if (!rate || isNaN(rate)) continue;

    const minutes = row.planned_minutes ?? 0;
    const cost = (minutes / 60) * rate;
    result[row.project_id].cost_planned += cost;
  }

  // Sum actual
  for (const row of (actuals ?? []) as ActualRow[]) {
    const proj = projectsArr.find((p) => p.id === row.project_id);
    if (!proj) continue;
    const tariff = proj.tariff_id ? tariffMap.get(proj.tariff_id) : null;
    if (!tariff) continue;

    const team = teamMap.get(row.employee_id) ?? null;
    const rateKey = mapTeamToRateKey(team);
    const rate = (tariff as any)[rateKey] as number | undefined;
    if (!rate || isNaN(rate)) continue;

    const minutes = row.minutes ?? 0;
    const cost = (minutes / 60) * rate;
    result[row.project_id].cost_actual += cost;
  }

  // Round to 2 decimals
  for (const pid of Object.keys(result)) {
    result[pid].cost_planned = Math.round(result[pid].cost_planned * 100) / 100;
    result[pid].cost_actual = Math.round(result[pid].cost_actual * 100) / 100;
  }

  return new Response(JSON.stringify({ costs: result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});