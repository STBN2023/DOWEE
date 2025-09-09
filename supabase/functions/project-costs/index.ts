import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

type Payload = { action: "overview" }

type EmployeeRow = { id: string; team: string | null }
type PlanRow = { project_id: string; employee_id: string; planned_minutes: number }
type ActualRow = { project_id: string; employee_id: string; minutes: number }

function normalizeTeam(team?: string | null): "conception" | "crea" | "dev" {
  if (!team) return "conception"
  const b = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  if (b === "crea" || b === "creation") return "crea"
  if (b === "dev" || b === "developpement" || b === "developement") return "dev"
  return "conception"
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } })

  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle()
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  // Charger le dernier coût interne (par effective_from puis created_at)
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
  const HOUR = { conception: dayConc / H, crea: dayCrea / H, dev: dayDev / H }

  const [{ data: employees, error: emplErr }, { data: plans, error: planErr }, { data: actuals, error: actErr }] = await Promise.all([
    admin.from("employees").select("id, team"),
    admin.from("plan_items").select("project_id, employee_id, planned_minutes"),
    admin.from("actual_items").select("project_id, employee_id, minutes"),
  ])

  if (emplErr || planErr || actErr) {
    const msg = emplErr?.message || planErr?.message || actErr?.message || "Unknown error"
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const teamMap = new Map<string, string | null>()
  ;(employees ?? []).forEach((e: any) => teamMap.set((e as EmployeeRow).id, (e as EmployeeRow).team ?? null))

  const result: Record<string, { cost_planned: number; cost_actual: number }> = {}

  for (const row of (plans ?? []) as PlanRow[]) {
    const sec = normalizeTeam(teamMap.get(row.employee_id) ?? null)
    const hours = (row.planned_minutes ?? 0) / 60
    result[row.project_id] = result[row.project_id] || { cost_planned: 0, cost_actual: 0 }
    result[row.project_id].cost_planned += hours * HOUR[sec]
  }

  for (const row of (actuals ?? []) as ActualRow[]) {
    const sec = normalizeTeam(teamMap.get(row.employee_id) ?? null)
    const hours = (row.minutes ?? 0) / 60
    result[row.project_id] = result[row.project_id] || { cost_planned: 0, cost_actual: 0 }
    result[row.project_id].cost_actual += hours * HOUR[sec]
  }

  for (const k of Object.keys(result)) {
    result[k].cost_planned = Math.round(result[k].cost_planned * 100) / 100
    result[k].cost_actual = Math.round(result[k].cost_actual * 100) / 100
  }

  return new Response(JSON.stringify({ costs: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})