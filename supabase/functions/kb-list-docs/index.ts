import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" }

type Payload = { action: "list" | "activate"; document_id?: string }

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } })

  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const { data: me } = await admin.from("employees").select("role").eq("id", userData.user.id).maybeSingle()
  if (!me || (me as any).role !== "admin") return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  if (body.action === "activate") {
    if (!body.document_id) return new Response(JSON.stringify({ error: "document_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    await admin.from("kb_documents").update({ active: false }).neq("id", body.document_id)
    const { error } = await admin.from("kb_documents").update({ active: true }).eq("id", body.document_id)
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // list
  const { data: docs, error } = await admin
    .from("kb_documents")
    .select("id, name, version, active, created_at, created_by")
    .order("created_at", { ascending: false })
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  // count chunks per doc
  // note: could be heavy, keep it simple
  const result: any[] = []
  for (const d of docs ?? []) {
    const { count } = await admin.from("kb_chunks").select("id", { count: "exact", head: true }).eq("document_id", (d as any).id)
    result.push({ ...(d as any), chunks_count: count ?? 0 })
  }

  return new Response(JSON.stringify({ documents: result }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})