import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Payload = { action: "overview"; project_id: string; year?: number };

type Tariff = {
  id: string;
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
};
type ProjectRow = {
  id: string;
  code: string;
  name: string;
  client_id: string | null;
  tariff_id: string | null;
  quote_amount: number | null;
  budget_conception: number | null;
  budget_crea: number | null;
  budget_dev: number | null;
};
type ClientRow = { id: string; code: string; name: string };
type EmployeeRow = { id: string; display_name: string | null; first_name: string | null; last_name: string | null; team: string | null };
type ActualRow = { employee_id: string; d: string; minutes: number };

function isoWeek(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
function monthFromIso(iso: string): number {
  const [y, m, day] = iso.split("-").map((x) => parseInt(x, 10));
  const d = new Date(Date.UTC(y, (m - 1), day));
  return d.getUTCMonth() + 1; // 1..12
}
function rateKey(team: string | null | undefined): "rate_conception" | "rate_crea" | "rate_dev" {
  if (!team) return "rate_conception";
  const base = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (base === "crea" || base === "creation") return "rate_crea";
  if (base === "dev" || base === "developpement" || base === "developement") return "rate_dev";
  return "rate_conception";
}
function sectionSlug(team: string | null | undefined): "conception" | "crea" | "dev" {
  const key = rateKey(team);
  return key === "rate_crea" ? "crea" : key === "rate_dev" ? "dev" : "conception";
}
function displayName(e: EmployeeRow): string {
  const n = [e.first_name ?? "", e.last_name ?? ""].join(" ").trim();
  if (n) return n;
  if (e.display_name && e.display_name.trim()) return e.display_name;
  return e.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  if (body.action !== "overview" || typeof body.project_id !== "string") {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const year = typeof body.year === "number" && isFinite(body.year) ? body.year : new Date().getFullYear();
  const yStart = `${year}-01-01`;
  const yEnd = `${year}-12-31`;

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

  // Load project + client + tariff
  const [{ data: project, error: projErr }, { data: client, error: cliErr }] = await Promise.all([
    admin.from("projects").select("id, code, name, client_id, tariff_id, quote_amount, budget_conception, budget_crea, budget_dev").eq("id", body.project_id).maybeSingle(),
    admin.from("clients").select("id, code, name").eq("id", (await admin.from("projects").select("client_id").eq("id", body.project_id).maybeSingle()).data?.client_id ?? "00000000-0000-0000-0000-000000000000").maybeSingle(),
  ]);
  if (projErr || !project) return new Response(JSON.stringify({ error: projErr?.message || "Projet introuvable" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let tariff: Tariff | null = null;
  if (project.tariff_id) {
    const { data: t, error: tErr } = await admin.from("ref_tariffs").select("id, label, rate_conception, rate_crea, rate_dev").eq("id", project.tariff_id).maybeSingle();
    if (tErr) return new Response(JSON.stringify({ error: tErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    tariff = (t ?? null) as any;
  }

  // Load employees
  const { data: employees, error: empListErr } = await admin.from("employees").select("id, display_name, first_name, last_name, team");
  if (empListErr) return new Response(JSON.stringify({ error: empListErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const empMap = new Map<string, EmployeeRow>();
  (employees ?? []).forEach((e) => empMap.set((e as any).id, e as any));

  // Prefer actuals, fallback to plans
  const { data: actuals, error: actErr } = await admin
    .from("actual_items")
    .select("employee_id, d, minutes")
    .eq("project_id", project.id)
    .gte("d", yStart)
    .lte("d", yEnd);

  if (actErr) return new Response(JSON.stringify({ error: actErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  let rows: ActualRow[] = (actuals ?? []) as any[];
  if ((rows ?? []).length === 0) {
    const { data: plans, error: planErr } = await admin
      .from("plan_items")
      .select("employee_id, d, planned_minutes")
      .eq("project_id", project.id)
      .gte("d", yStart)
      .lte("d", yEnd);
    if (planErr) return new Response(JSON.stringify({ error: planErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    rows = (plans ?? []).map((p: any) => ({ employee_id: p.employee_id, d: p.d, minutes: p.planned_minutes ?? 0 }));
  }

  const members = new Map<string, { id: string; name: string; team: string | null; hours: number }>();
  const totalsBySection: Record<"conception" | "crea" | "dev", { hours: number; cost: number }> = {
    conception: { hours: 0, cost: 0 },
    crea: { hours: 0, cost: 0 },
    dev: { hours: 0, cost: 0 },
  };
  const weeks = new Map<number, { week: number; month: number; hours: number }>();

  for (const r of rows) {
    const emp = empMap.get(r.employee_id);
    const sec = sectionSlug(emp?.team ?? null);
    const minutes = r.minutes ?? 0;
    const hours = minutes / 60;

    if (emp) {
      const key = emp.id;
      if (!members.has(key)) members.set(key, { id: key, name: displayName(emp), team: emp.team, hours: 0 });
      members.get(key)!.hours += hours;
    }

    totalsBySection[sec].hours += hours;

    const rate = tariff ? (tariff as any)[rateKey(emp?.team ?? null)] as number : 0;
    totalsBySection[sec].cost += hours * (rate || 0);

    const [yy, mm, dd] = r.d.split("-").map((x) => parseInt(x, 10));
    const dObj = new Date(Date.UTC(yy, mm - 1, dd));
    const w = isoWeek(dObj);
    const m = dObj.getUTCMonth() + 1;
    if (!weeks.has(w)) weeks.set(w, { week: w, month: m, hours: 0 });
    weeks.get(w)!.hours += hours;
  }

  function round2(n: number) { return Math.round(n * 100) / 100; }

  const result = {
    project: {
      id: project.id,
      code: project.code,
      name: project.name,
      client: client ? { id: client.id, code: (client as ClientRow).code, name: (client as ClientRow).name } : null,
      quote_amount: project.quote_amount,
      budgets: {
        conception: project.budget_conception,
        crea: project.budget_crea,
        dev: project.budget_dev,
      },
      tariff: tariff ? {
        id: tariff.id,
        label: tariff.label,
        rate_conception: tariff.rate_conception,
        rate_crea: tariff.rate_crea,
        rate_dev: tariff.rate_dev,
      } : null,
    },
    sold: {
      total_ht: project.quote_amount ?? null,
      by_section: {
        conception: project.budget_conception ?? null,
        crea: project.budget_crea ?? null,
        dev: project.budget_dev ?? null,
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
          const m = monthFromIso(`${year}-${String(w.month).padStart(2, "0")}-01`);
          map.set(m, (map.get(m) ?? 0) + w.hours);
        }
        const out: Array<{ month: number; hours: number }> = [];
        for (let m = 1; m <= 12; m++) out.push({ month: m, hours: round2(map.get(m) ?? 0) });
        return out;
      })(),
    }
  };

  return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});