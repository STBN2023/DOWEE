import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type Payload = { messages: Array<{ role: "user"|"assistant"|"system"; content: string }> }

function systemPrompt() {
  return [
    "Tu es Dowee Bot, assistant concis français.",
    "Tu réponds UNIQUEMENT d'après le CONTEXTE fourni, issu du guide utilisateur.",
    "Si le guide ne couvre pas la question, dis-le clairement et propose de créer une recommandation.",
    "Style: direct, phrases courtes; listes succinctes si nécessaire; pas d'hallucination."
  ].join("\n")
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>
  const last = (body?.messages || []).slice().reverse().find(m => m.role === "user")?.content?.slice(0, 2000) || ""
  if (!last.trim()) return new Response(JSON.stringify({ error: "Empty query" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } })

  // Auth + orphan check
  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  const { data: emp } = await admin.from("employees").select("id").eq("id", userData.user.id).maybeSingle()
  if (!emp) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  // Version active du guide
  const { data: doc } = await admin.from("kb_documents").select("id, name, version").eq("active", true).order("created_at", { ascending: false }).maybeSingle()
  if (!doc) {
    const fallback = "Le guide n'est pas encore indexé. Demandez à un admin d'ouvrir Admin → Base de connaissance (RAG) et d'indexer le guide."
    return new Response(JSON.stringify({ answer: fallback, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Recherche FTS (fr)
  // Supabase textSearch applique plainto_tsquery si on passe le texte brut
  const { data: chunks } = await admin
    .from("kb_chunks")
    .select("section, content, order_idx")
    .eq("document_id", doc.id)
    .textSearch("ts", last, { config: "french" })
    .limit(5)

  const top = (chunks ?? []).slice(0, 5)
  const context = top.map((c, i) => `#${i+1} [${c.section ?? "Section"}]\n${(c.content ?? "").slice(0, 1200)}`).join("\n\n")
  const sys = systemPrompt()
  const finalPrompt = [
    `CONTEXT:\n${context || "(vide)"}`,
    "Question:",
    last
  ].join("\n\n")

  // Clé OpenAI (optionnelle)
  const { data: secret } = await admin.from("secrets_llm").select("api_key, provider").eq("id", "openai").maybeSingle()
  const apiKey = (secret as any)?.api_key as string | undefined
  const provider = (secret as any)?.provider as string | undefined

  if (!apiKey || provider !== "openai") {
    // Fallback extractif simple
    const answer = top.length > 0
      ? `D'après le guide:\n- ${top.map(c => (c.section ?? "Section")).join(" • ")}.\n\n${(top[0].content ?? "").slice(0, 500)}\n\nSi besoin, demandez une recommandation de développement.`
      : "Le guide ne contient pas d'information pertinente. Souhaitez-vous créer une recommandation de développement ?"
    return new Response(JSON.stringify({ answer, citations: top.map((c) => ({ section: c.section, snippet: (c.content ?? '').slice(0, 180) })) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  // Appel OpenAI
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: finalPrompt }
        ]
      })
    })
    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: `OpenAI error ${resp.status}`, details: text }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const data = await resp.json()
    const answer = data?.choices?.[0]?.message?.content ?? "Je n'ai pas trouvé d'information suffisante dans le guide."
    return new Response(JSON.stringify({ answer, citations: top.map((c) => ({ section: c.section, snippet: (c.content ?? '').slice(0, 180) })) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: "LLM call failed", message: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})