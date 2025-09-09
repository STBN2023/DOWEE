import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StatusPayload = { action: "status" };
type SetPayload = { action: "set"; provider?: "openai"; api_key: string };
type ClearPayload = { action: "clear" };
type Payload = StatusPayload | SetPayload | ClearPayload;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  // Auth
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const userId = userData.user.id;

  // Admin check
  const { data: empRow, error: empErr } = await admin.from("employees").select("id, role").eq("id", userId).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow || (empRow as any).role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  // Actions
  if (body.action === "status") {
    const { data, error } = await admin.from("secrets_llm").select("id, provider, updated_at").eq("id", "openai").maybeSingle();
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const configured = !!data;
    return new Response(JSON.stringify({ configured, provider: data?.provider ?? null, updated_at: data?.updated_at ?? null }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (body.action === "set") {
    const provider = body.provider ?? "openai";
    const api_key = (body as any).api_key as string;
    if (provider !== "openai") {
      return new Response(JSON.stringify({ error: "Unsupported provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!api_key || typeof api_key !== "string" || api_key.trim().length < 10) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Simple format hint; do not enforce strictly
    if (!api_key.startsWith("sk-")) {
      // accept but warn? we'll accept to support different formats
    }

    // Upsert row
    const { error } = await admin
      .from("secrets_llm")
      .upsert({ id: "openai", provider, api_key, updated_at: new Date().toISOString() }, { onConflict: "id" });
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  if (body.action === "clear") {
    const { error } = await admin.from("secrets_llm").delete().eq("id", "openai");
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});