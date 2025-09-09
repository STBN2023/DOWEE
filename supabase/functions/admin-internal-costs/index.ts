import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ListPayload = { action: "list" };
type CreatePayload = { action: "create"; cost: { label: string; rate_conception: number; rate_crea: number; rate_dev: number; effective_from?: string | null } };
type UpdatePayload = { action: "update"; id: string; patch: Partial<{ label: string; rate_conception: number; rate_crea: number; rate_dev: number; effective_from: string | null }> };
type DeletePayload = { action: "delete"; id: string };
type Payload = ListPayload | CreatePayload | UpdatePayload | DeletePayload;

function isCreate(p: any): p is CreatePayload {
  return p?.action === "create" && p?.cost && typeof p.cost?.label === "string"
    && typeof p.cost?.rate_conception === "number" && typeof p.cost?.rate_crea === "number" && typeof p.cost?.rate_dev === "number";
}
function isUpdate(p: any): p is UpdatePayload {
  return p?.action === "update" && typeof p?.id === "string" && p?.patch && typeof p.patch === "object";
}
function isDelete(p: any): p is DeletePayload {
  return p?.action === "delete" && typeof p?.id === "string";
}

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

  // Auth + orphan check
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (body.action === "list") {
    const { data, error } = await admin
      .from("ref_internal_costs")
      .select("id, label, rate_conception, rate_crea, rate_dev, effective_from, created_at")
      .order("effective_from", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ costs: data ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isCreate(body)) {
    const payload: Record<string, any> = {
      label: body.cost.label.trim(),
      rate_conception: body.cost.rate_conception,
      rate_crea: body.cost.rate_crea,
      rate_dev: body.cost.rate_dev,
    };
    if (typeof body.cost.effective_from === "string" && body.cost.effective_from.trim()) {
      payload.effective_from = body.cost.effective_from;
    }
    const { data, error } = await admin
      .from("ref_internal_costs")
      .insert(payload)
      .select("id, label, rate_conception, rate_crea, rate_dev, effective_from, created_at")
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ cost: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isUpdate(body)) {
    const patch: Record<string, any> = {};
    if (typeof body.patch.label === "string") patch.label = body.patch.label.trim();
    if (typeof body.patch.rate_conception === "number") patch.rate_conception = body.patch.rate_conception;
    if (typeof body.patch.rate_crea === "number") patch.rate_crea = body.patch.rate_crea;
    if (typeof body.patch.rate_dev === "number") patch.rate_dev = body.patch.rate_dev;
    if ("effective_from" in body.patch!) patch.effective_from = body.patch!.effective_from ?? null;

    const { data, error } = await admin
      .from("ref_internal_costs")
      .update(patch)
      .eq("id", body.id)
      .select("id, label, rate_conception, rate_crea, rate_dev, effective_from, created_at")
      .single();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ cost: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isDelete(body)) {
    const { error } = await admin.from("ref_internal_costs").delete().eq("id", body.id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});