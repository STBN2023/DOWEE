import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type StatusPayload = { action: "status"; d?: string };
type ConfirmPayload = { action: "confirm"; d?: string };
type Payload = StatusPayload | ConfirmPayload;

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

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } });

  // Current user
  const { data: userData } = await userClient.auth.getUser();
  if (!userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = userData.user.id;

  // Orphan check
  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userId).maybeSingle();
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const d = (body as any)?.d || todayIsoLocal();

  if (body?.action === "status") {
    const [{ data: dv }, { data: plans }, { data: actuals }] = await Promise.all([
      userClient.from("day_validations").select("id, validated_at").eq("employee_id", userId).eq("d", d).maybeSingle(),
      userClient.from("plan_items").select("id").eq("employee_id", userId).eq("d", d),
      userClient.from("actual_items").select("id").eq("employee_id", userId).eq("d", d),
    ]);

    const plannedCount = (plans ?? []).length;
    const actualCount = (actuals ?? []).length;
    const validated = !!dv;

    return new Response(
      JSON.stringify({ d, validated, plannedCount, actualCount, canSuggestCopy: plannedCount > 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (body?.action === "confirm") {
    // Load plans of the day
    const { data: plans, error: planErr } = await userClient
      .from("plan_items")
      .select("d, hour, project_id, planned_minutes, note")
      .eq("employee_id", userId)
      .eq("d", d);

    if (planErr) return new Response(JSON.stringify({ error: planErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Remove previous actuals for that day
    const del = await userClient.from("actual_items").delete().eq("employee_id", userId).eq("d", d);
    if (del.error) return new Response(JSON.stringify({ error: del.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Insert actuals mirroring plans
    if ((plans ?? []).length > 0) {
      const rows = (plans ?? []).map((p) => ({
        employee_id: userId,
        d: p.d,
        hour: p.hour,
        project_id: p.project_id,
        minutes: p.planned_minutes ?? 60,
        note: p.note ?? null,
      }));
      const ins = await userClient.from("actual_items").insert(rows);
      if (ins.error) return new Response(JSON.stringify({ error: ins.error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Mark validated
    const { error: valErr } = await userClient.from("day_validations").upsert(
      { employee_id: userId, d, validated_at: new Date().toISOString() },
      { onConflict: "employee_id,d" }
    );
    if (valErr) return new Response(JSON.stringify({ error: valErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
});