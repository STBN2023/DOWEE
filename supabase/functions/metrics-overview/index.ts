import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview" };

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

  // RLS-aware client (to get the current user)
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  // Service client for aggregations across all users
  const admin = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: `Bearer ${serviceRole}` } },
  });

  // Current user
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const userId = userData.user.id;

  // Orphan check (server-side)
  const { data: empRow, error: empErr } = await admin
    .from("employees")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

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

  // Projects (non-archived)
  const { data: allProjects, error: projErr } = await admin
    .from("projects")
    .select("id, status")
    .neq("status", "archived");

  if (projErr) {
    return new Response(JSON.stringify({ error: projErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const total = allProjects?.length ?? 0;
  const active = (allProjects ?? []).filter((p) => p.status === "active").length;
  const onhold = (allProjects ?? []).filter((p) => p.status === "onhold").length;
  const allowedProjectIds = new Set((allProjects ?? []).map((p) => p.id));

  // Employees (teams)
  const { data: employees, error: empListErr } = await admin
    .from("employees")
    .select("id, team");
  if (empListErr) {
    return new Response(JSON.stringify({ error: empListErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const empTeam = new Map<string, string | null>();
  (employees ?? []).forEach((e) => empTeam.set(e.id, e.team ?? null));

  // Project-Employees
  const { data: pe, error: peErr } = await admin
    .from("project_employees")
    .select("project_id, employee_id");
  if (peErr) {
    return new Response(JSON.stringify({ error: peErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const teams = ["commercial", "créa", "dev"] as const;
  const byTeamMap = new Map<string, Set<string>>();
  teams.forEach((t) => byTeamMap.set(t, new Set()));

  for (const row of pe ?? []) {
    if (!allowedProjectIds.has(row.project_id)) continue;
    const team = empTeam.get(row.employee_id) ?? null;
    if (team && byTeamMap.has(team)) {
      byTeamMap.get(team)!.add(row.project_id);
    }
  }

  const byTeam = teams.map((t) => ({
    team: t,
    nb_projects_active_distinct: byTeamMap.get(t)!.size,
  }));

  // Me: distinct projects assigned to me (non-archived)
  const myProjects = new Set<string>();
  for (const row of pe ?? []) {
    if (row.employee_id === userId && allowedProjectIds.has(row.project_id)) {
      myProjects.add(row.project_id);
    }
  }

  const response = {
    global: { nb_projects_total: total, nb_projects_active: active, nb_projects_onhold: onhold },
    byTeam,
    me: { nb_projects_mine: myProjects.size },
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});