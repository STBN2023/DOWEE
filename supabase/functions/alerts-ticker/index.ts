import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type Scope = "global" | "team" | "me"
type Payload = { action: "list"; scope?: Scope; limit?: number }

type ProjectRow = {
  id: string
  code: string
  name: string
  status: string
  due_date: string | null
  effort_days: number | null
  quote_amount: number | null
  budget_conception: number | null
  budget_crea: number | null
  budget_dev: number | null
}
type EmployeeRow = { id: string; team: string | null }
type PE = { project_id: string; employee_id: string }
type ActualRow = { project_id: string; employee_id: string; minutes: number }
type PlanRow = { project_id: string; employee_id: string; planned_minutes: number }

type AlertItem = {
  id: string
  project: { id: string; code: string; name: string }
  type: "deadline" | "budget_days" | "margin"
  severity: "critical" | "warning" | "info"
  short: string
  source: "rule"
  meta?: Record<string, number | string | null>
}

function normalizeTeamSlug(input?: string | null): "conception" | "créa" | "dev" | null {
  if (!input) return null
  const base = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (base === "crea" || base === "creation") return "créa"
  if (base === "dev" || base === "developpement" || base === "developement") return "dev"
  if (base === "commercial" || base === "conception" || base === "direction") return "conception"
  return "conception"
}
function daysUntil(dueIso: string | null): number | null {
  if (!dueIso) return null
  const [y,m,dd] = dueIso.split("-").map((x) => parseInt(x, 10))
  const today = new Date()
  const nowUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const due = new Date(Date.UTC(y, m - 1, dd))
  const diff = (due.getTime() - nowUTC.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(diff)
}
function round2(n: number) { return Math.round(n * 100) / 100 }
function eur(n: number) { return `€${round2(n)}` }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>
  if (body.action !== "list") return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const scope: Scope = (body.scope as Scope) || "me"
  const limit = typeof body.limit === "number" && isFinite(body.limit) ? Math.max(1, Math.min(100, body.limit)) : 20

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } })

  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  const userId = userData.user.id

  const { data: empSelf, error: empErr } = await admin.from("employees").select("id, team, role").eq("id", userId).maybeSingle()
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  if (!empSelf) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const [
    { data: projects, error: projErr },
    { data: employees, error: emplErr },
    { data: pe, error: peErr },
  ] = await Promise.all([
    admin.from("projects").select("id, code, name, status, due_date, effort_days, quote_amount, budget_conception, budget_crea, budget_dev").neq("status", "archived"),
    admin.from("employees").select("id, team"),
    admin.from("project_employees").select("project_id, employee_id"),
  ])
  if (projErr || emplErr || peErr) {
    const msg = projErr?.message || emplErr?.message || peErr?.message || "Unknown error"
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const activeProjects = (projects ?? []) as ProjectRow[]
  const teamMap = new Map<string, string | null>()
  ;(employees ?? []).forEach((e: any) => teamMap.set((e as EmployeeRow).id, (e as EmployeeRow).team ?? null))

  const includedProjectIds = new Set<string>()
  let allowedEmployeeIds: Set<string> | null = null

  if (scope === "global") {
    for (const p of activeProjects) includedProjectIds.add(p.id)
  } else if (scope === "team") {
    const myTeam = normalizeTeamSlug((empSelf as any).team ?? null)
    const teamEmpIds = new Set<string>()
    for (const e of (employees ?? []) as any[]) {
      const norm = normalizeTeamSlug((e as any).team ?? null)
      if (norm && myTeam && norm === myTeam) teamEmpIds.add((e as any).id)
    }
    allowedEmployeeIds = teamEmpIds
    const projIds = new Set<string>()
    for (const row of (pe ?? []) as any[]) {
      if (teamEmpIds.has((row as any).employee_id)) projIds.add((row as any).project_id)
    }
    for (const p of activeProjects) {
      if (projIds.has(p.id)) includedProjectIds.add(p.id)
    }
  } else {
    allowedEmployeeIds = new Set([userId])
    const projIds = new Set<string>()
    for (const row of (pe ?? []) as any[]) {
      if ((row as any).employee_id === userId) projIds.add((row as any).project_id)
    }
    for (const p of activeProjects) {
      if (projIds.has(p.id)) includedProjectIds.add(p.id)
    }
  }

  const filtered = activeProjects.filter((p) => includedProjectIds.has(p.id))
  const projIds = filtered.map((p) => p.id)

  const { data: costRows } = await admin
    .from("ref_internal_costs")
    .select("rate_conception, rate_crea, rate_dev, effective_from, created_at")
    .order("effective_from", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(1)
  const dayConc = Number(costRows?.[0]?.rate_conception ?? 800)
  const dayCrea = Number(costRows?.[0]?.rate_crea ?? 500)
  const dayDev = Number(costRows?.[0]?.rate_dev ?? 800)
  const H = 8
  const HOUR: Record<"conception"|"créa"|"dev", number> = { conception: dayConc / H, "créa": dayCrea / H, dev: dayDev / H }

  const [{ data: actuals, error: actErr }, { data: plans, error: planErr }] = await Promise.all([
    admin.from("actual_items").select("project_id, employee_id, minutes").in("project_id", projIds),
    admin.from("plan_items").select("project_id, employee_id, planned_minutes").in("project_id", projIds),
  ])
  if (actErr || planErr) {
    const msg = actErr?.message || planErr?.message || "Unknown error"
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const hoursActual = new Map<string, number>()
  const hoursPlanned = new Map<string, number>()
  const costActual = new Map<string, number>()

  function secOf(empId: string): "conception" | "créa" | "dev" {
    const norm = normalizeTeamSlug(teamMap.get(empId) ?? null) ?? "conception"
    return norm as any
  }

  for (const r of (actuals ?? []) as any as ActualRow[]) {
    if (allowedEmployeeIds && !allowedEmployeeIds.has(r.employee_id)) continue
    const hrs = (r.minutes ?? 0) / 60
    hoursActual.set(r.project_id, (hoursActual.get(r.project_id) ?? 0) + hrs)
    const rate = HOUR[secOf(r.employee_id)]
    costActual.set(r.project_id, (costActual.get(r.project_id) ?? 0) + hrs * rate)
  }

  const projectsWithActuals = new Set<string>()
  for (const k of hoursActual.keys()) projectsWithActuals.add(k)

  for (const r of (plans ?? []) as any as PlanRow[]) {
    if (allowedEmployeeIds && !allowedEmployeeIds.has(r.employee_id)) continue
    const hrs = (r.planned_minutes ?? 0) / 60
    hoursPlanned.set(r.project_id, (hoursPlanned.get(r.project_id) ?? 0) + hrs)
    // fallback: si pas d'actuals, on estime le coût depuis le plan
    if (!projectsWithActuals.has(r.project_id)) {
      const rate = HOUR[secOf(r.employee_id)]
      costActual.set(r.project_id, (costActual.get(r.project_id) ?? 0) + hrs * rate)
    }
  }

  const items: AlertItem[] = []

  for (const p of filtered) {
    const sold = (p.quote_amount ?? 0) || ((p.budget_conception ?? 0) + (p.budget_crea ?? 0) + (p.budget_dev ?? 0))
    const cost = costActual.get(p.id) ?? 0
    const marginEur = round2(sold - cost)
    const marginPct = sold > 0 ? round2((marginEur / sold) * 100) : null

    const hoursUsed = hoursActual.get(p.id) ?? 0
    const daysUsed = hoursUsed / H
    const budgetDays = typeof p.effort_days === "number" && isFinite(p.effort_days) ? p.effort_days : null
    const budgetPct = budgetDays != null && budgetDays > 0 ? round2((daysUsed / budgetDays) * 100) : null

    const jLeft = daysUntil(p.due_date)

    // deadline alerts (avec J+/-)
    if (jLeft != null && jLeft <= 7) {
      const sev: AlertItem["severity"] = jLeft <= 3 ? "critical" : "warning"
      items.push({
        id: `deadline:${p.id}`,
        project: { id: p.id, code: p.code, name: p.name },
        type: "deadline",
        severity: sev,
        short: `${p.code} — Échéance ${jLeft >= 0 ? "J-" + jLeft : "J+" + Math.abs(jLeft)}`,
        source: "rule",
        meta: { j_left: jLeft, due_date: p.due_date },
      })
    }

    // budget days alerts (avec reste)
    if (budgetPct != null && budgetDays != null) {
      if (budgetPct >= 85) {
        const sev: AlertItem["severity"] = budgetPct >= 100 ? (budgetPct >= 110 ? "critical" : "warning") : "warning"
        const rest = round2(budgetDays - daysUsed)
        items.push({
          id: `budget:${p.id}`,
          project: { id: p.id, code: p.code, name: p.name },
          type: "budget_days",
          severity: sev,
          short: `${p.code} — Budget: ${daysUsed.toFixed(1)}j/${budgetDays}j (${budgetPct.toFixed(0)}%) · Reste ${rest.toFixed(1)}j`,
          source: "rule",
          meta: { days_used: round2(daysUsed), budget_days: budgetDays, budget_pct: budgetPct, rest_days: rest },
        })
      }
    }

    // margin alerts (avec €)
    if (marginPct != null && marginPct < 20) {
      const sev: AlertItem["severity"] = marginPct <= 0 ? "critical" : (marginPct < 10 ? "critical" : "warning")
      items.push({
        id: `margin:${p.id}`,
        project: { id: p.id, code: p.code, name: p.name },
        type: "margin",
        severity: sev,
        short: `${p.code} — Marge ${marginPct.toFixed(0)}% (${eur(marginEur)})`,
        source: "rule",
        meta: { margin_pct: marginPct, margin_eur: marginEur, sold_ht: sold, cost_realized: cost },
      })
    }
  }

  const orderType = { deadline: 0, budget_days: 1, margin: 2 } as Record<AlertItem["type"], number>
  const orderSev = { critical: 0, warning: 1, info: 2 } as Record<AlertItem["severity"], number>
  items.sort((a, b) => {
    const s = orderSev[a.severity] - orderSev[b.severity]
    if (s !== 0) return s
    const t = orderType[a.type] - orderType[b.type]
    if (t !== 0) return t
    return a.project.code.localeCompare(b.project.code)
  })

  const limited = items.slice(0, limit)

  return new Response(JSON.stringify({ items: limited }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})