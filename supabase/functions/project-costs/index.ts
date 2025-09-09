import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview" };

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

// Company internal cost rates (per day)
const COST_PER_DAY = {
  conception: 800,
  crea: 500,
  dev: 800,
};
// Hours per day used to convert daily rates into hourly rates
const HOURS_PER_DAY = 8;
const COST_PER_HOUR = {
  conception: COST_PER_DAY.conception / HOURS_PER_DAY,
  crea: COST_PER_DAY.crea / HOURS_PER_DAY,
  dev: COST_PER_DAY.dev / HOURS_PER_DAY,
};

function sectionFromTeam(team: string | null | undefined): "conception" | "crea" | "dev" {
  if (!team) return "conception";
  const base = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "crea" || base === "creation") return "crea";
  if (base === "dev" || base === "developpement" || base === "developement") return "dev";
  return "conception";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const admin = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: `Bearer ${serviceRole}` } },
  });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "overview") {
    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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

  // Load datasets
  const [
    { data: projects, error: projErr },
    { data: employees, error: emplErr },
    { data: plans, error: planErr },
    { data: actuals, error: actErr },
  ] = await Promise.all([
    admin.from("projects").select("id, status, tariff_id"),
    admin.from("employees").select("id, team"),
    admin.from("plan_items").select("project_id, employee_id, planned_minutes"),
    admin.from("actual_items").select("project_id, employee_id, minutes"),
  ]);

  if (projErr || emplErr || planErr || actErr) {
    const msg = projErr?.message || emplErr?.message || planErr?.message || actErr?.message || "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const teamMap = new Map<string, string | null>();
  (employees ?? []).forEach((e) => teamMap.set((e as EmployeeRow).id, (e as EmployeeRow).team ?? null));

  const result: Record<string, { cost_planned: number; cost_actual: number }> = {};
  for (const p of (projects ?? []) as ProjectRow[]) {
    result[p.id] = { cost_planned: 0, cost_actual: 0 };
  }

  for (const row of (plans ?? []) as PlanRow[]) {
    const sec = sectionFromTeam(teamMap.get(row.employee_id) ?? null);
    const rate = sec === "crea" ? COST_PER_HOUR.crea : sec === "dev" ? COST_PER_HOUR.dev : COST_PER_HOUR.conception;
    const hours = (row.planned_minutes ?? 0) / 60;
    result[row.project_id].cost_planned += hours * rate;
  }
  for (const row of (actuals ?? []) as ActualRow[]) {
    const sec = sectionFromTeam(teamMap.get(row.employee_id) ?? null);
    const rate = sec === "crea" ? COST_PER_HOUR.crea : sec === "dev" ? COST_PER_HOUR.dev : COST_PER_HOUR.conception;
    const hours = (row.minutes ?? 0) / 60;
    result[row.project_id].cost_actual += hours * rate;
  }

  for (const k of Object.keys(result)) {
    result[k].cost_planned = Math.round(result[k].cost_planned * 100) / 100;
    result[k].cost_actual = Math.round(result[k].cost_actual * 100) / 100;
  }

  return new Response(JSON.stringify({ costs: result }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});