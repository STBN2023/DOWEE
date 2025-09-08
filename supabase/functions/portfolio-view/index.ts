import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Scope = "global" | "team" | "me";
type Payload = { action: "overview"; scope: Scope; year?: number; team?: string };

type ProjectRow = {
  id: string;
  status: string;
  tariff_id: string | null;
  quote_amount: number | null;
  budget_conception: number | null;
  budget_crea: number | null;
  budget_dev: number | null;
};

type Tariff = {
  id: string;
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
};

type EmployeeRow = { id: string; display_name: string | null; first_name: string | null; last_name: string | null; team: string | null };
type PE = { project_id: string; employee_id: string };
type ActualRow = { project_id: string; employee_id: string; d: string; minutes: number };
type PlanRow = { project_id: string; employee_id: string; d: string; planned_minutes: number };

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
function normalizeTeamSlug(input?: string | null): "commercial" | "créa" | "dev" | string | null {
  if (!input) return null;
  const base = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "commercial") return "commercial";
  if (base === "crea" || base === "creation") return "créa";
  if (base === "dev" || base === "developpement" || base === "developement") return "dev";
  return input;
}
function rateKey(team: string | null | undefined): "rate_conception" | "rate_crea" | "rate_dev" {
  const norm = normalizeTeamSlug(team);
  if (norm === "créa") return "rate_crea";
  if (norm === "dev") return "rate_dev";
  return "rate_conception";
}
function sectionSlug(team: string | null | undefined): "conception" | "crea" | "dev" {
  const k = rateKey(team);
  return k === "rate_crea" ? "crea" : (k === "rate_dev" ? "dev" : "conception");
}
function displayName(e: EmployeeRow): string {
  if (e.display_name && e.display_name.trim()) return e.display_name;
  const n = [e.first_name ?? "", e.last_name ?? ""].join(" ").trim();
  return n || e.id;
}
function round2(n: number) { return Math.round(n * 100) / 100; }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "overview" || (body.scope !== "global" && body.scope !== "team" && body.scope !== "me")) {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const scope = body.scope as Scope;
  const year = typeof body.year === "number" && isFinite(body.year) ? body.year : new Date().getFullYear();
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;
  const selectedTeam = normalizeTeamSlug(body.team ?? null);

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const userId = userData.user.id;

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userId).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // Load core data
  const [
    { data: projects, error: projErr },
    { data: tariffs, error: tarErr },
    { data: employees, error: emplErr },
    { data: pe, error: peErr },
  ] = await Promise.all([
    admin.from("projects").select("id, status, tariff_id, quote_amount, budget_conception, budget_crea, budget_dev"),
    admin.from("ref_tariffs").select("id, label, rate_conception, rate_crea, rate_dev"),
    admin.from("employees").select("id, display_name, first_name, last_name, team"),
    admin.from("project_employees").select("project_id, employee_id"),
  ]);
  if (projErr || tarErr || emplErr || peErr) {
    const msg = projErr?.message || tarErr?.message || emplErr?.message || peErr?.message || "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const tariffsMap = new Map<string, Tariff>();
  (tariffs ?? []).forEach((t: any) => tariffsMap.set(t.id, t as Tariff));

  const empMap = new Map<string, EmployeeRow>();
  (employees ?? []).forEach((e: any) => empMap.set(e.id, e as EmployeeRow));

  const activeProjects = (projects ?? []).filter((p: any) => p.status !== "archived") as ProjectRow[];

  // Determine included projects and allowed employee ids depending on scope
  let includedProjectIds = new Set<string>();
  let allowedEmployeeIds: Set<string> | null = null;

  if (scope === "global") {
    for (const p of activeProjects) includedProjectIds.add(p.id);
    allowedEmployeeIds = null; // everyone
  } else if (scope === "team") {
    const teamEmpIds = new Set<string>();
    for (const e of employees ?? []) {
      const norm = normalizeTeamSlug((e as any).team ?? null);
      if (norm && selectedTeam && norm === selectedTeam) teamEmpIds.add((e as any).id);
    }
    allowedEmployeeIds = teamEmpIds;
    const projIds = new Set<string>();
    for (const row of (pe ?? []) as PE[]) {
      if (teamEmpIds.has(row.employee_id)) projIds.add(row.project_id);
    }
    for (const p of activeProjects) {
      if (projIds.has(p.id)) includedProjectIds.add(p.id);
    }
  } else {
    // me
    allowedEmployeeIds = new Set([userId]);
    const projIds = new Set<string>();
    for (const row of (pe ?? []) as PE[]) {
      if (row.employee_id === userId) projIds.add(row.project_id);
    }
    for (const p of activeProjects) {
      if (projIds.has(p.id)) includedProjectIds.add(p.id);
    }
  }

  // Load time rows (actuals first, else plans), filtered by year, projects and optionally employees
  const filterProjectIds = [...includedProjectIds];
  let rows: Array<{ employee_id: string; d: string; minutes: number }> = [];

  if (filterProjectIds.length > 0) {
    const [{ data: actuals, error: actErr }] = await Promise.all([
      admin
        .from("actual_items")
        .select("project_id, employee_id, d, minutes")
        .in("project_id", filterProjectIds)
        .gte("d", yStart)
        .lte("d", yEnd),
    ]);
    if (actErr) return new Response(JSON.stringify({ error: actErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    if ((actuals ?? []).length > 0) {
      rows = (actuals ?? []).map((r: any) => ({ employee_id: r.employee_id as string, d: r.d as string, minutes: (r.minutes as number) ?? 0 }));
    } else {
      const { data: plans, error: planErr } = await admin
        .from("plan_items")
        .select("project_id, employee_id, d, planned_minutes")
        .in("project_id", filterProjectIds)
        .gte("d", yStart)
        .lte("d", yEnd);
      if (planErr) return new Response(JSON.stringify({ error: planErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      rows = (plans ?? []).map((p: any) => ({ employee_id: p.employee_id as string, d: p.d as string, minutes: (p.planned_minutes as number) ?? 0 }));
    }
  }

  // Apply employee filter if needed
  if (allowedEmployeeIds) {
    rows = rows.filter((r) => allowedEmployeeIds!.has(r.employee_id));
  }

  // Aggregations
  const totalsBySection: Record<"conception" | "crea" | "dev", { hours: number; cost: number }> = {
    conception: { hours: 0, cost: 0 },
    crea: { hours: 0, cost: 0 },
    dev: { hours: 0, cost: 0 },
  };
  const members = new Map<string, { id: string; name: string; team: string | null; hours: number }>();
  const weeks = new Map<number, { week: number; month: number; hours: number }>();

  // We need project->tariff for cost; create map
  const projTariff = new Map<string, Tariff | null>();
  activeProjects.forEach((p) => {
    projTariff.set(p.id, p.tariff_id ? (tariffsMap.get(p.tariff_id) ?? null) : null);
  });

  // For faster check project_id per row, fetch also project_id for rows; since we didn't include it in `rows` after filter, reloading with project_id would have been better, but we already ensured we filtered by project list when fetching.
  // Cost by employee's team
  for (const r of rows) {
    const emp = empMap.get(r.employee_id);
    const sec = sectionSlug(emp?.team ?? null);
    const minutes = r.minutes ?? 0;
    const hours = minutes / 60;

    // No tariff per-row; approximate with average rate by section is not desired. Since we don't have row.project_id here, ensure we included it by requery above when mapping.
    // To keep code consistent with rows, we need project_id to locate tariff; adjust: re-fetch actuals/plans including project_id above (already included), so compute again with local vars.

    // We will recompute using a parallel fetch that included project_id; Above we kept it while mapping? No; we dropped it. Let's quickly refetch minimal arrays to compute cost precisely.

  }

  // Re-fetch detailed rows with project_id for accurate costing
  let rowsDetailed: Array<{ project_id: string; employee_id: string; d: string; minutes: number }> = [];
  if (filterProjectIds.length > 0) {
    const { data: actuals2 } = await admin
      .from("actual_items")
      .select("project_id, employee_id, d, minutes")
      .in("project_id", filterProjectIds)
      .gte("d", yStart)
      .lte("d", yEnd);
    if ((actuals2 ?? []).length > 0) {
      rowsDetailed = (actuals2 ?? []).map((r: any) => ({ project_id: r.project_id, employee_id: r.employee_id, d: r.d, minutes: r.minutes ?? 0 }));
    } else {
      const { data: plans2 } = await admin
        .from("plan_items")
        .select("project_id, employee_id, d, planned_minutes")
        .in("project_id", filterProjectIds)
        .gte("d", yStart)
        .lte("d", yEnd);
      rowsDetailed = (plans2 ?? []).map((p: any) => ({ project_id: p.project_id, employee_id: p.employee_id, d: p.d, minutes: p.planned_minutes ?? 0 }));
    }
  }
  if (allowedEmployeeIds) {
    rowsDetailed = rowsDetailed.filter((r) => allowedEmployeeIds!.has(r.employee_id));
  }

  for (const r of rowsDetailed) {
    const emp = empMap.get(r.employee_id);
    const sec = sectionSlug(emp?.team ?? null);
    const hours = (r.minutes ?? 0) / 60;

    // cost with project tariff and employee section rate
    const t = projTariff.get(r.project_id);
    const rate = t ? (t as any)[rateKey(emp?.team ?? null)] as number : 0;
    const cost = hours * (rate || 0);

    totalsBySection[sec].hours += hours;
    totalsBySection[sec].cost += cost;

    // member
    if (emp) {
      if (!members.has(emp.id)) members.set(emp.id, { id: emp.id, name: displayName(emp), team: emp.team, hours: 0 });
      members.get(emp.id)!.hours += hours;
    }

    // week buckets
    const [yy, mm, dd] = r.d.split("-").map((x) => parseInt(x, 10));
    const dObj = new Date(Date.UTC(yy, (mm - 1), dd));
    const w = isoWeek(dObj);
    const m = dObj.getUTCMonth() + 1;
    if (!weeks.has(w)) weeks.set(w, { week: w, month: m, hours: 0 });
    weeks.get(w)!.hours += hours;
  }

  // Sold totals (sum budgets across included projects)
  let sold_total = 0;
  let sold_conc = 0;
  let sold_crea = 0;
  let sold_dev = 0;
  for (const p of activeProjects) {
    if (!includedProjectIds.has(p.id)) continue;
    sold_total += Number(p.quote_amount ?? 0);
    sold_conc += Number(p.budget_conception ?? 0);
    sold_crea += Number(p.budget_crea ?? 0);
    sold_dev += Number(p.budget_dev ?? 0);
  }

  const response = {
    scope,
    year,
    sold: {
      total_ht: sold_total || null,
      by_section: {
        conception: sold_conc || null,
        crea: sold_crea || null,
        dev: sold_dev || null,
      }
    },
    realized: {
      total_hours: round2(totalsBySection.conception.hours + totalsBySection.crea.hours + totalsBySection.dev.hours),
      total_cost: round2(totalsBySection.conception.cost + totalsBySection.crea.cost + totalsBySection.dev.cost),
      by_section: {
        conception: { hours: round2(totalsBySection.conception.hours), cost: round2(totalsBySection.conception.cost) },
        crea: { hours: round2(totalsBySection.crea.hours), cost: round2(totalsBySection.crea.cost) },
        dev: { hours: round2(totalsBySection.dev.hours), cost: round2(totalsBySection.dev.cost) },
      }
    },
    team: {
      members: Array.from(members.values()).sort((a, b) => b.hours - a.hours).map((m) => ({ ...m, hours: round2(m.hours) })),
      totals: {
        conception: round2(totalsBySection.conception.hours),
        crea: round2(totalsBySection.crea.hours),
        dev: round2(totalsBySection.dev.hours),
        total: round2(totalsBySection.conception.hours + totalsBySection.crea.hours + totalsBySection.dev.hours),
      }
    },
    weekly: {
      year,
      weeks: Array.from(weeks.values()).sort((a, b) => a.week - b.week).map((w) => ({ week: w.week, month: w.month, hours: round2(w.hours) })),
      monthlyTotals: (() => {
        const map = new Map<number, number>();
        for (const w of weeks.values()) {
          map.set(w.month, (map.get(w.month) ?? 0) + w.hours);
        }
        const out: Array<{ month: number; hours: number }> = [];
        for (let m = 1; m <= 12; m++) out.push({ month: m, hours: round2(map.get(m) ?? 0) });
        return out;
      })(),
    }
  };

  return new Response(JSON.stringify(response), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});