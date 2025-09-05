import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ListPayload = { action: "list" };
type CreatePayload = { action: "create"; client: { code: string; name: string } };
type UpdatePayload = { action: "update"; client_id: string; patch: Partial<{ code: string; name: string }> };
type DeletePayload = { action: "delete"; client_id: string };
type Payload = ListPayload | CreatePayload | UpdatePayload | DeletePayload;

function isCreatePayload(p: any): p is CreatePayload {
  return p?.action === "create" && p?.client && typeof p.client?.code === "string" && typeof p.client?.name === "string";
}
function isUpdatePayload(p: any): p is UpdatePayload {
  return p?.action === "update" && typeof p?.client_id === "string" && p?.patch && typeof p.patch === "object";
}
function isDeletePayload(p: any): p is DeletePayload {
  return p?.action === "delete" && typeof p?.client_id === "string";
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

  // Auth + orphan check
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (body.action === "list") {
    const { data, error } = await admin.from("clients").select("id, code, name, created_at").order("code", { ascending: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ clients: data ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isCreatePayload(body)) {
    const { data, error } = await admin.from("clients").insert({ code: body.client.code, name: body.client.name }).select("id, code, name, created_at").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ client: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isUpdatePayload(body)) {
    const patch: Record<string, any> = {};
    if (typeof body.patch.code === "string") patch.code = body.patch.code;
    if (typeof body.patch.name === "string") patch.name = body.patch.name;
    const { data, error } = await admin.from("clients").update(patch).eq("id", body.client_id).select("id, code, name, created_at").single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ client: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isDeletePayload(body)) {
    // Optional: if projects reference clients, you may have to handle FK; here we assume delete is allowed or handled by FK.
    const { error } = await admin.from("clients").delete().eq("id", body.client_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});