import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Status = "active" | "onhold" | "archived";

type ListPayload = { action: "list" };
type CreatePayload = {
  action: "create";
  project: {
    name: string;
    status?: Status;
    client_id: string;
    tariff_id?: string | null;
    quote_amount?: number | null;
    budget_conception?: number | null;
    budget_crea?: number | null;
    budget_dev?: number | null;
    due_date?: string | null;
    effort_days?: number | null;
    version?: string | null;
  };
};
type AssignPayload = { action: "assign"; project_id: string; employee_ids: string[] };
type UpdatePayload = {
  action: "update";
  project_id: string;
  patch: Partial<{
    name: string;
    status: Status;
    client_id: string;
    tariff_id: string | null;
    quote_amount: number | null;
    budget_conception: number | null;
    budget_crea: number | null;
    budget_dev: number | null;
    due_date: string | null;
    effort_days: number | null;
    version: string | null;
  }>;
};
type DeletePayload = { action: "delete"; project_id: string };
type FinalizePayload = { action: "finalize"; project_id: string; delete_future_plans?: boolean };

type Payload = ListPayload | CreatePayload | AssignPayload | UpdatePayload | DeletePayload | FinalizePayload;

function isCreatePayload(p: any): p is CreatePayload {
  return p?.action === "create" && p?.project && typeof p.project?.name === "string" && typeof p.project?.client_id === "string";
}
function isAssignPayload(p: any): p is AssignPayload {
  return p?.action === "assign" && typeof p?.project_id === "string" && Array.isArray(p?.employee_ids);
}
function isUpdatePayload(p: any): p is UpdatePayload {
  return p?.action === "update" && typeof p?.project_id === "string" && p?.patch && typeof p.patch === "object";
}
function isDeletePayload(p: any): p is DeletePayload {
  return p?.action === "delete" && typeof p?.project_id === "string";
}
function isFinalizePayload(p: any): p is FinalizePayload {
  return p?.action === "finalize" && typeof p?.project_id === "string";
}

function pad3(n: number) {
  return String(n).padStart(3, "0");
}
function todayIsoLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (body.action === "list") {
    const [
      { data: employees, error: empErr2 },
      { data: projects, error: projErr },
      { data: pe, error: peErr },
      { data: clients, error: clientsErr },
      { data: tariffs, error: tariffsErr },
    ] = await Promise.all([
      admin.from("employees").select("id, first_name, last_name, display_name"),
      admin.from("projects").select("id, code, name, status, client_id, tariff_id, quote_amount, budget_conception, budget_crea, budget_dev, due_date, effort_days, version"),
      admin.from("project_employees").select("project_id, employee_id"),
      admin.from("clients").select("id, code, name").order("code", { ascending: true }),
      admin.from("ref_tariffs").select("id, label, rate_conception, rate_crea, rate_dev").order("created_at", { ascending: true }),
    ]);

    if (empErr2 || projErr || peErr || clientsErr || tariffsErr) {
      const msg = empErr2?.message || projErr?.message || peErr?.message || clientsErr?.message || tariffsErr?.message || "Unknown error";
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const assignments: Record<string, string[]> = {};
    for (const row of pe ?? []) {
      if (!assignments[row.project_id]) assignments[row.project_id] = [];
      assignments[row.project_id].push(row.employee_id);
    }

    return new Response(
      JSON.stringify({
        employees: employees ?? [],
        projects: projects ?? [],
        assignments,
        clients: clients ?? [],
        tariffs: tariffs ?? [],
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (isCreatePayload(body)) {
    const { name, client_id } = body.project;
    const status: Status = body.project.status ?? "active";
    const tariff_id = body.project.tariff_id ?? null;
    const quote_amount = body.project.quote_amount ?? null;

    const { budget_conception = null, budget_crea = null, budget_dev = null } = body.project;
    const due_date = typeof body.project.due_date === "string" ? body.project.due_date : null;
    const effort_days = typeof body.project.effort_days === "number" ? body.project.effort_days : null;
    const version = typeof body.project.version === "string" && body.project.version.trim() ? body.project.version.trim() : null;

    const { data: client, error: clientErr } = await admin.from("clients").select("code").eq("id", client_id).maybeSingle();
    if (clientErr || !client) {
      return new Response(JSON.stringify({ error: clientErr?.message || "Client inexistant" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const clientCode = String(client.code).toUpperCase().replace(/[^A-Z0-9\-]/g, "");
    const year = new Date().getFullYear();

    const prefix = `${clientCode}-${year}-`;
    const { data: sameYear, error: listErr } = await admin
      .from("projects")
      .select("code")
      .ilike("code", `${prefix}%`);

    if (listErr) {
      return new Response(JSON.stringify({ error: listErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let maxNum = 0;
    for (const row of sameYear ?? []) {
      const parts = (row.code as string).split("-");
      const last = parts[parts.length - 1];
      const n = parseInt(last, 10);
      if (!isNaN(n)) maxNum = Math.max(maxNum, n);
    }
    const nextNum = maxNum + 1;
    const code = `${prefix}${pad3(nextNum)}`;

    const { data: newProj, error: insErr } = await admin
      .from("projects")
      .insert({
        code,
        name,
        status,
        client_id,
        tariff_id,
        quote_amount,
        budget_conception,
        budget_crea,
        budget_dev,
        due_date,
        effort_days,
        version,
      })
      .select("id, code, name, status, client_id, tariff_id, quote_amount, budget_conception, budget_crea, budget_dev, due_date, effort_days, version")
      .single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ project: newProj }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isUpdatePayload(body)) {
    const { project_id, patch } = body;
    const payload: Record<string, any> = {};
    if (typeof patch.name === "string") payload.name = patch.name;
    if (patch.status === "active" || patch.status === "onhold" || patch.status === "archived") payload.status = patch.status;
    if (typeof patch.client_id === "string") payload.client_id = patch.client_id;
    if ("tariff_id" in patch) payload.tariff_id = patch.tariff_id ?? null;
    if ("quote_amount" in patch) payload.quote_amount = patch.quote_amount ?? null;
    if ("budget_conception" in patch) payload.budget_conception = patch.budget_conception ?? null;
    if ("budget_crea" in patch) payload.budget_crea = patch.budget_crea ?? null;
    if ("budget_dev" in patch) payload.budget_dev = patch.budget_dev ?? null;
    if ("due_date" in patch) payload.due_date = patch.due_date ?? null;
    if ("effort_days" in patch) payload.effort_days = patch.effort_days ?? null;
    if ("version" in patch) payload.version = (typeof patch.version === "string" && patch.version.trim()) ? patch.version.trim() : null;

    const { data, error } = await admin
      .from("projects")
      .update(payload)
      .eq("id", project_id)
      .select("id, code, name, status, client_id, tariff_id, quote_amount, budget_conception, budget_crea, budget_dev, due_date, effort_days, version")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ project: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isAssignPayload(body)) {
    const { project_id, employee_ids } = body;
    const { data: current, error: curErr } = await admin.from("project_employees").select("employee_id").eq("project_id", project_id);
    if (curErr) return new Response(JSON.stringify({ error: curErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const currentSet = new Set((current ?? []).map((r) => r.employee_id));
    const targetSet = new Set(employee_ids);
    const toDelete = [...currentSet].filter((id) => !targetSet.has(id));
    const toInsert = [...targetSet].filter((id) => !currentSet.has(id));

    if (toDelete.length > 0) {
      const { error } = await admin.from("project_employees").delete().eq("project_id", project_id).in("employee_id", toDelete);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (toInsert.length > 0) {
      const rows = toInsert.map((eid) => ({ project_id, employee_id: eid }));
      const { error } = await admin.from("project_employees").insert(rows);
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isDeletePayload(body)) {
    const project_id = body.project_id;

    const delPE = await admin.from("project_employees").delete().eq("project_id", project_id);
    if (delPE.error) return new Response(JSON.stringify({ error: delPE.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const delPI = await admin.from("plan_items").delete().eq("project_id", project_id);
    if (delPI.error) return new Response(JSON.stringify({ error: delPI.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error } = await admin.from("projects").delete().eq("id", project_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isFinalizePayload(body)) {
    const project_id = body.project_id;
    const deleteFuture = body.delete_future_plans !== false; // par défaut true
    const todayIso = todayIsoLocal();

    const { error: upErr } = await admin.from("projects").update({ status: "onhold" }).eq("id", project_id);
    if (upErr) return new Response(JSON.stringify({ error: upErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let deleted_future = 0;
    if (deleteFuture) {
      const { error: delErr, count } = await admin
        .from("plan_items")
        .delete({ count: "exact" })
        .eq("project_id", project_id)
        .gte("d", todayIso);
      if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      deleted_future = count ?? 0;
    }

    return new Response(JSON.stringify({ ok: true, deleted_future }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});