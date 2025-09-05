import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ListPayload = { action: "list" };
type CreatePayload = {
  action: "create";
  employee: {
    id: string; // UUID de auth.users
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    role?: "admin" | "manager" | "user";
    team?: string | null;
  };
};
type UpdatePayload = {
  action: "update";
  employee_id: string;
  patch: Partial<{
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    role: "admin" | "manager" | "user";
    team: string | null;
  }>;
};
type DeletePayload = { action: "delete"; employee_id: string };

type Payload = ListPayload | CreatePayload | UpdatePayload | DeletePayload;

function isCreatePayload(p: any): p is CreatePayload {
  return p?.action === "create" && p?.employee && typeof p.employee?.id === "string";
}
function isUpdatePayload(p: any): p is UpdatePayload {
  return p?.action === "update" && typeof p?.employee_id === "string" && p?.patch && typeof p.patch === "object";
}
function isDeletePayload(p: any): p is DeletePayload {
  return p?.action === "delete" && typeof p?.employee_id === "string";
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
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (body.action === "list") {
    const { data, error } = await admin
      .from("employees")
      .select("id, first_name, last_name, display_name, role, team, updated_at")
      .order("updated_at", { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ employees: data ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isCreatePayload(body)) {
    const payload: Record<string, any> = {
      id: body.employee.id,
      display_name: body.employee.display_name ?? null,
      first_name: body.employee.first_name ?? null,
      last_name: body.employee.last_name ?? null,
      role: body.employee.role ?? "user",
      team: body.employee.team ?? null,
    };
    const { data, error } = await admin.from("employees").insert(payload).select("id, first_name, last_name, display_name, role, team, updated_at").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ employee: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isUpdatePayload(body)) {
    const patch: Record<string, any> = {};
    if ("display_name" in body.patch!) patch.display_name = body.patch!.display_name ?? null;
    if ("first_name" in body.patch!) patch.first_name = body.patch!.first_name ?? null;
    if ("last_name" in body.patch!) patch.last_name = body.patch!.last_name ?? null;
    if ("role" in body.patch!) patch.role = body.patch!.role ?? "user";
    if ("team" in body.patch!) patch.team = body.patch!.team ?? null;

    const { data, error } = await admin
      .from("employees")
      .update(patch)
      .eq("id", body.employee_id)
      .select("id, first_name, last_name, display_name, role, team, updated_at")
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ employee: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isDeletePayload(body)) {
    // Clean related rows that might block delete (no FK cascade info)
    const delPE = await admin.from("project_employees").delete().eq("employee_id", body.employee_id);
    if (delPE.error) return new Response(JSON.stringify({ error: delPE.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const delPI = await admin.from("plan_items").delete().eq("employee_id", body.employee_id);
    if (delPI.error) return new Response(JSON.stringify({ error: delPI.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { error } = await admin.from("employees").delete().eq("id", body.employee_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});