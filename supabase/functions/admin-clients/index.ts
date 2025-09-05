import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ListPayload = { action: "list" };
type CreatePayload = { action: "create"; client: { code: string; name: string } };
type Payload = ListPayload | CreatePayload;

function isCreatePayload(p: any): p is CreatePayload {
  return p?.action === "create" && p?.client && typeof p.client?.code === "string" && typeof p.client?.name === "string";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceRole, {
    global: { headers: { Authorization: `Bearer ${serviceRole}` } },
  });

  // User and orphan check
  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: empRow, error: empErr } = await admin
    .from("employees")
    .select("id")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (empErr) {
    return new Response(JSON.stringify({ error: empErr.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!empRow) {
    return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  if (body.action === "list") {
    const { data, error } = await admin
      .from("clients")
      .select("id, code, name, created_at")
      .order("code", { ascending: true });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ clients: data ?? [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isCreatePayload(body)) {
    const { code, name } = body.client;
    const { data, error } = await admin
      .from("clients")
      .insert({ code, name })
      .select("id, code, name, created_at")
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ client: data }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});