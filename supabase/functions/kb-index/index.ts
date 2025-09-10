import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type Payload = {
  text: string
  name?: string
  version?: string
  activate?: boolean
  chunkSize?: number
  overlap?: number
}

function splitSections(md: string): Array<{ heading: string; content: string }> {
  const lines = md.split(/\r?\n/)
  const out: Array<{ heading: string; content: string }> = []
  let current = { heading: "Document", content: "" }
  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line)) {
      if (current.content.trim()) out.push(current)
      current = { heading: line.replace(/^#{1,3}\s+/, "").trim(), content: "" }
    } else {
      current.content += line + "\n"
    }
  }
  if (current.content.trim()) out.push(current)
  return out
}

function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const words = text.split(/\s+/)
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += (size - overlap)) {
    const slice = words.slice(i, i + size).join(" ").trim()
    if (slice.length > 0) chunks.push(slice)
  }
  return chunks
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>
  const text = String(body?.text || "")
  if (!text.trim()) return new Response(JSON.stringify({ error: "Empty text" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } })

  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  // Admin check
  const { data: me } = await admin.from("employees").select("role").eq("id", userData.user.id).maybeSingle()
  if (!me || (me as any).role !== "admin") return new Response(JSON.stringify({ error: "Forbidden: admin only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const name = body.name?.trim() || "guide_utilisateur.md"
  const version = body.version?.trim() || new Date().toISOString().slice(0,16).replace("T"," ")
  const chunkSize = Math.max(400, Math.min(2000, Number(body.chunkSize ?? 1200)))
  const overlap = Math.max(0, Math.min(400, Number(body.overlap ?? 200)))

  const sections = splitSections(text)
  const rows: Array<{ section: string; content: string }> = []
  for (const s of sections) {
    const parts = chunkText(s.content, chunkSize, overlap)
    if (parts.length === 0) continue
    if (parts.length === 1) {
      rows.push({ section: s.heading, content: parts[0] })
    } else {
      parts.forEach((p, idx) => rows.push({ section: `${s.heading} (part ${idx+1})`, content: p }))
    }
  }

  // Créer document
  const { data: doc, error: docErr } = await admin
    .from("kb_documents")
    .insert({ name, version, source: "manual", created_by: userData.user.id, active: false })
    .select("id")
    .single()
  if (docErr) return new Response(JSON.stringify({ error: docErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  // Insert chunks
  const payload = rows.map((r, i) => ({ document_id: (doc as any).id, order_idx: i, section: r.section, content: r.content }))
  // batch insert in slices (avoid payload too big)
  const BATCH = 200
  for (let i = 0; i < payload.length; i += BATCH) {
    const slice = payload.slice(i, i + BATCH)
    const { error } = await admin.from("kb_chunks").insert(slice)
    if (error) return new Response(JSON.stringify({ error: error.message, at: i }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // activation optionnelle
  if (body.activate) {
    await admin.from("kb_documents").update({ active: false }).neq("id", (doc as any).id)
    await admin.from("kb_documents").update({ active: true }).eq("id", (doc as any).id)
  }

  return new Response(JSON.stringify({ ok: true, document_id: (doc as any).id, chunks: payload.length }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})