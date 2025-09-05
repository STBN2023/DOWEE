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
  tariff: { label: string; rate_conception: number; rate_crea: number; rate_dev: number };
};
type UpdatePayload = {
  action: "update";
  tariff_id: string;
  patch: Partial<{ label: string; rate_conception: number; rate_crea: number; rate_dev: number }>;
};
type DeletePayload = { action: "delete"; tariff_id: string };
type Payload = ListPayload | CreatePayload | UpdatePayload | DeletePayload;

function isCreatePayload(p: any): p is CreatePayload {
  return p?.action === "create"
    && p?.tariff
    && typeof p.tariff.label === "string"
    && typeof p.tariff.rate_conception === "number"
    && typeof p.tariff.rate_crea === "number"
    && typeof p.tariff.rate_dev === "number";
}
function isUpdatePayload(p: any): p is UpdatePayload {
  return p?.action === "update" && typeof p?.tariff_id === "string" && p?.patch && typeof p.patch === "object";
}
function isDeletePayload(p: any): p is DeletePayload {
  return p?.action === "delete" && typeof p?.tariff_id === "string";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

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
      .from("ref_tariffs")
      .select("id, label, rate_conception, rate_crea, rate_dev, created_at")
      .order("created_at", { ascending: true });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ tariffs: data ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isCreatePayload(body)) {
    const label = body.tariff.label.trim();
    if (!label) return new Response(JSON.stringify({ error: "Label requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data, error } = await admin
      .from("ref_tariffs")
      .insert({
        label,
        rate_conception: body.tariff.rate_conception,
        rate_crea: body.tariff.rate_crea,
        rate_dev: body.tariff.rate_dev,
      })
      .select("id, label, rate_conception, rate_crea, rate_dev, created_at")
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ tariff: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isUpdatePayload(body)) {
    const patch: Record<string, any> = {};
    if (typeof body.patch.label === "string") patch.label = body.patch.label.trim();
    if (typeof body.patch.rate_conception === "number") patch.rate_conception = body.patch.rate_conception;
    if (typeof body.patch.rate_crea === "number") patch.rate_crea = body.patch.rate_crea;
    if (typeof body.patch.rate_dev === "number") patch.rate_dev = body.patch.rate_dev;

    const { data, error } = await admin
      .from("ref_tariffs")
      .update(patch)
      .eq("id", body.tariff_id)
      .select("id, label, rate_conception, rate_crea, rate_dev, created_at")
      .single();

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ tariff: data }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (isDeletePayload(body)) {
    // Les projets référencent tariff_id avec ON DELETE SET NULL; on peut supprimer sans FK error.
    const { error } = await admin.from("ref_tariffs").delete().eq("id", body.tariff_id);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});