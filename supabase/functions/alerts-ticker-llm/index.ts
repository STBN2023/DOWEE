import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

type Scope = "global" | "team" | "me"
type Payload = { action: "list"; scope?: Scope; limit?: number }

type RawItem = {
  id: string
  project: { id: string; code: string; name: string }
  type: "deadline" | "budget_days" | "margin"
  severity: "critical" | "warning" | "info"
  short: string
  source: "rule"
}
type LlmItem = {
  id: string
  short: string
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const authHeader = req.headers.get("Authorization")
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>
  if (body.action !== "list") return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const scope: Scope = (body.scope as Scope) || "me"
  const limit = typeof body.limit === "number" && isFinite(body.limit) ? Math.max(1, Math.min(100, body.limit)) : 20

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } })
  const admin = createClient(supabaseUrl, serviceRole, { global: { headers: { Authorization: `Bearer ${serviceRole}` } } })

  // Auth + orphan
  const { data: userData } = await userClient.auth.getUser()
  if (!userData?.user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  const userId = userData.user.id
  const { data: empRow, error: empErr } = await admin.from("employees").select("id").eq("id", userId).maybeSingle()
  if (empErr) return new Response(JSON.stringify({ error: empErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  if (!empRow) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  // Get LLM key
  const { data: secret } = await admin.from("secrets_llm").select("api_key, provider").eq("id", "openai").maybeSingle()
  const apiKey = (secret as any)?.api_key as string | undefined
  const provider = (secret as any)?.provider as string | undefined
  if (!apiKey || provider !== "openai") {
    // Fallback to raw alerts if no key
    const rawRes = await fetch(`${supabaseUrl}/functions/v1/alerts-ticker`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list", scope, limit }),
    })
    const data = await rawRes.json().catch(() => ({ items: [] }))
    return new Response(JSON.stringify({ items: data.items ?? [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Fetch raw alerts first
  const rawRes = await fetch(`${supabaseUrl}/functions/v1/alerts-ticker`, {
    method: "POST",
    headers: { Authorization: authHeader, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "list", scope, limit: Math.min(60, limit * 2) }),
  })
  if (!rawRes.ok) {
    const text = await rawRes.text()
    return new Response(JSON.stringify({ error: `alerts-ticker: ${text}` }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
  const raw = (await rawRes.json()) as { items: RawItem[] }
  const items = raw.items ?? []

  // If nothing to do, return as-is
  if (items.length === 0) {
    return new Response(JSON.stringify({ items: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Call OpenAI to rephrase/prioritize
  const prompt = [
    { role: "system", content: "Tu es un assistant de priorisation. On te fournit des alertes déjà calculées. Tu dois retourner une liste d’éléments pour un bandeau défilant, en FR, très concis, sans inventer d’informations. Respecte strictement les champs et n’ajoute rien." },
    { role: "user", content: JSON.stringify({
      instructions: {
        language: "fr",
        style: "sobre, actionnable, concis",
        max_items: limit,
        order: ["critical","warning","info"],
        type_priority: ["deadline","budget_days","margin"],
        constraints: [
          "Ne pas inventer de projets ni de chiffres.",
          "Inclure le code projet au début du message.",
          "Longueur < 100 caractères par message.",
        ]
      },
      schema: { type: "array", items: { id: "string from input", short: "string concise message" } },
      input_items: items
    }) }
  ]

  let llmOut: LlmItem[] | null = null
  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        messages: prompt,
        response_format: { type: "json_object" },
      })
    })
    if (!resp.ok) {
      // fallback raw
      return new Response(JSON.stringify({ items }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const data = await resp.json()
    const content: string = data.choices?.[0]?.message?.content ?? "{}"
    const parsed = JSON.parse(content)
    const arr: any[] = Array.isArray(parsed) ? parsed : (Array.isArray(parsed.items) ? parsed.items : [])
    llmOut = (arr as any[]).map((x) => ({ id: String(x.id), short: String(x.short) })).slice(0, limit)
  } catch {
    // fallback to raw
    return new Response(JSON.stringify({ items }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  if (!llmOut || llmOut.length === 0) {
    return new Response(JSON.stringify({ items }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // Merge LLM short messages back onto items (preserve type/severity)
  const byId = new Map<string, RawItem>()
  items.forEach((it) => byId.set(it.id, it))
  const merged = []
  for (const x of llmOut) {
    const base = byId.get(x.id)
    if (!base) continue
    merged.push({ ...base, short: x.short, source: "rule" as const })
  }

  return new Response(JSON.stringify({ items: merged }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
})