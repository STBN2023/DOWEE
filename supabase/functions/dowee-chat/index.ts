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

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function includesAll(haystack: string, needles: string[]) {
  return needles.every((k) => haystack.includes(k))
}

function quickNavAnswer(question: string): string | null {
  const q = normalize(question)
  if (includesAll(q, ["journee"])) return "Accès: Menu → Journée (édition) — URL: /day"
  if (includesAll(q, ["planning"])) return "Accès: Menu → Planning (semaine) — URL: /planning"
  if (includesAll(q, ["dashboard"]) || includesAll(q, ["tableaux", "bord"])) return "Accès: Menu → Tableaux de bord — URL: /dashboards"
  if (includesAll(q, ["report", "modif"]) || includesAll(q, ["reporting"])) return "Accès: Menu → Reporting modifs — URL: /reports/changes"
  if (includesAll(q, ["rentabilite", "client"])) return "Accès: Menu → Rentabilité clients — URL: /profitability/clients"
  if (includesAll(q, ["rentabilite", "projet"])) return "Accès: Menu → Rentabilité projets — URL: /profitability/projects"
  if (includesAll(q, ["admin"]) && !q.includes("llm") && !q.includes("rag") && !q.includes("ticker") && !q.includes("band")) return "Accès: Menu → Admin (hub) — URL: /admin"
  if (includesAll(q, ["employe"]) || includesAll(q, ["salari"])) return "Accès: Admin → Profils salariés — URL: /admin/employees"
  if (includesAll(q, ["client"]) && q.includes("admin")) return "Accès: Admin → Clients — URL: /admin/clients"
  if (includesAll(q, ["projet"]) && q.includes("admin")) return "Accès: Admin → Projets — URL: /admin/projects"
  if (includesAll(q, ["tarif"]) || includesAll(q, ["bareme"])) return "Accès: Admin → Barèmes (tarifs) — URL: /admin/tariffs"
  if (includesAll(q, ["cout", "interne"])) return "Accès: Admin → Coûts internes — URL: /admin/internal-costs"
  if (includesAll(q, ["bandeau"]) || includesAll(q, ["ticker"])) return "Accès: Admin → Bandeau — URL: /admin/ticker"
  if (includesAll(q, ["llm"]) || includesAll(q, ["openai"])) return "Accès: Admin → LLM (OpenAI) — URL: /admin/llm"
  if (includesAll(q, ["rag"]) || includesAll(q, ["base", "connaissance"])) return "Accès: Admin → Base de connaissance (RAG) — URL: /admin/rag"
  if (includesAll(q, ["aujourdhui"]) || includesAll(q, ["aujourd", "hui"])) return "Accès: Menu → Aujourd’hui — URL: /today"
  if (includesAll(q, ["login"]) || includesAll(q, ["connexion"])) return "Accès: Page de connexion — URL: /login"
  if (includesAll(q, ["debug"])) return "Accès: Admin → Debug — URL: /debug (réservé admin)"
  return null
}

// Intent: explication du score projet
function isScoreHow(q: string) {
  return q.includes("score") && (q.includes("calcul") || q.includes("comment") || q.includes("formule"))
}
function answerScoreHow() {
  return [
    "Calcul du score projet:",
    "- S_client (segment client): Super rentable=80, Normal=50, Pas rentable=20 (25%).",
    "- S_marge: 0–100 selon marge% (≥40%→100; 20–39%: 60–98; 1–19%: 22–58; ≤0%→0) (35%).",
    "- S_urgence: via B = jours restants / effort (j). B≤0→100; 0<B<1→90; 1≤B<3→60; B≥3→20 (20%).",
    "- S_récurrence: 0–100 (10%).",
    "- S_strat: 0 / 50 / 100 (10%).",
    "Score = min(100, (0,25*S_client + 0,35*S_marge + 0,20*S_urgence + 0,10*S_récurrence + 0,10*S_strat) × (1,15 si client Star))."
  ].join("\n")
}

// Extract code type CLIENT-YYYY-NNN...
function extractProjectCode(text: string): string | null {
  const m = text.match(/([A-Z0-9]+-\d{4}-\d{1,4})/i)
  return m ? m[1].toUpperCase() : null
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
  const userId = userData.user.id
  const { data: emp } = await admin.from("employees").select("id").eq("id", userId).maybeSingle()
  if (!emp) return new Response(JSON.stringify({ error: "Forbidden: orphan session" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  const q = normalize(last)

  // 1) Réponses rapides (navigation)
  const nav = quickNavAnswer(q)
  if (nav) {
    return new Response(JSON.stringify({ answer: nav, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 2) Intent: explication du score
  if (isScoreHow(q)) {
    return new Response(JSON.stringify({ answer: answerScoreHow(), citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 3) Intent: projets prioritaires (top score)
  if (q.includes("prioritair") || q.includes("projet prioritaire") || q.includes("top projet") || (q.includes("quel") && q.includes("projet") && (q.includes("priorite") || q.includes("prioritair")))) {
    // Appel à la fonction scoring
    const resp = await fetch(`${supabaseUrl}/functions/v1/project-scoring`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list" }),
    })
    if (!resp.ok) {
      return new Response(JSON.stringify({ answer: "Impossible d’obtenir les scores pour l’instant.", citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const data = await resp.json().catch(() => ({ scores: [] }))
    let scores: any[] = (data?.scores || []) as any[]

    // Filtrer sur "mes projets" si demandé
    if (q.includes("mes") || q.includes("moi") || q.includes("mon")) {
      const { data: pe } = await admin.from("project_employees").select("project_id").eq("employee_id", userId)
      const mine = new Set((pe || []).map((r: any) => r.project_id))
      scores = scores.filter((s: any) => mine.has(s.project_id))
    }

    scores.sort((a, b) => (b.score ?? -1) - (a.score ?? -1))
    const top = scores.slice(0, 3)
    if (top.length === 0) {
      return new Response(JSON.stringify({ answer: "Aucun projet prioritaire trouvé.", citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const lines = top.map((s: any, i: number) => `${i+1}. ${s.code} — ${s.name} (score ${Math.round(s.score)})`)
    const prefix = (q.includes("mes") || q.includes("moi") || q.includes("mon")) ? "Top priorités (mes projets):" : "Top priorités (global):"
    return new Response(JSON.stringify({ answer: [prefix, ...lines].join("\n"), citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 4) Intent: heures restantes sur un projet
  if ((q.includes("heure") || q.includes("heures")) && (q.includes("reste") || q.includes("restant"))) {
    const code = extractProjectCode(last)
    // Si code absent, essayer de déduire: si un seul projet assigné, utiliser celui-ci, sinon demander de préciser
    let projectId: string | null = null
    let projectLabel = ""
    if (code) {
      const { data: prj } = await admin.from("projects").select("id, code, name, effort_days").eq("code", code).maybeSingle()
      if (!prj) {
        return new Response(JSON.stringify({ answer: `Projet ${code} introuvable. Donne un code de type CLIENT-YYYY-NNN.`, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      projectId = (prj as any).id
      projectLabel = `${(prj as any).code} — ${(prj as any).name}`
      // calcul
      const effortDays = (prj as any).effort_days as number | null
      if (effortDays == null) {
        return new Response(JSON.stringify({ answer: `${projectLabel}: effort (jours) non défini; impossible de calculer les heures restantes.`, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const budgetH = effortDays * 8
      const { data: act } = await admin.from("actual_items").select("minutes").eq("project_id", projectId)
      let usedH = ((act || []) as any[]).reduce((acc, r) => acc + Number(r.minutes || 0), 0) / 60
      if (!act || act.length === 0) {
        const { data: plans } = await admin.from("plan_items").select("planned_minutes").eq("project_id", projectId)
        usedH = ((plans || []) as any[]).reduce((acc, r) => acc + Number(r.planned_minutes || 0), 0) / 60
      }
      const remaining = Math.max(0, budgetH - usedH)
      const answer = `${projectLabel}: budget ${budgetH.toFixed(1)} h, réalisé ${usedH.toFixed(1)} h → reste ${remaining.toFixed(1)} h.`
      return new Response(JSON.stringify({ answer, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    } else {
      // pas de code: regarder mes projets
      const { data: pe } = await admin.from("project_employees").select("project_id").eq("employee_id", userId)
      const myIds = Array.from(new Set((pe || []).map((r: any) => r.project_id)))
      if (myIds.length === 0) {
        return new Response(JSON.stringify({ answer: "Aucun projet assigné. Donne un code projet (ex: ACME-2025-001).", citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      if (myIds.length > 1) {
        // lister pour que l’utilisateur précise
        const { data: projs } = await admin.from("projects").select("code, name").in("id", myIds)
        const list = (projs || []).map((p: any) => `• ${p.code} — ${p.name}`).join("\n")
        return new Response(JSON.stringify({ answer: `Précise le projet (code) parmi:\n${list}`, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      // un seul projet → calcul
      const { data: prj } = await admin.from("projects").select("id, code, name, effort_days").eq("id", myIds[0]).maybeSingle()
      if (!prj) return new Response(JSON.stringify({ answer: "Projet introuvable.", citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      const effortDays = (prj as any).effort_days as number | null
      if (effortDays == null) return new Response(JSON.stringify({ answer: `${(prj as any).code} — ${(prj as any).name}: effort (jours) non défini.`, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      const budgetH = effortDays * 8
      const { data: act } = await admin.from("actual_items").select("minutes").eq("project_id", (prj as any).id)
      let usedH = ((act || []) as any[]).reduce((acc, r) => acc + Number(r.minutes || 0), 0) / 60
      if (!act || act.length === 0) {
        const { data: plans } = await admin.from("plan_items").select("planned_minutes").eq("project_id", (prj as any).id)
        usedH = ((plans || []) as any[]).reduce((acc, r) => acc + Number(r.planned_minutes || 0), 0) / 60
      }
      const remaining = Math.max(0, budgetH - usedH)
      const answer = `${(prj as any).code} — ${(prj as any).name}: budget ${budgetH.toFixed(1)} h, réalisé ${usedH.toFixed(1)} h → reste ${remaining.toFixed(1)} h.`
      return new Response(JSON.stringify({ answer, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
  }

  // 5) Intent: chiffres clés des dashboards
  if (q.includes("chiffre") && (q.includes("cle") || q.includes("cl")) || q.includes("kpi") || (q.includes("dashboard") && (q.includes("resume") || q.includes("synthese")))) {
    // time-cost-overview
    const tcRes = await fetch(`${supabaseUrl}/functions/v1/time-cost-overview`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "overview" }),
    })
    // metrics-overview
    const metRes = await fetch(`${supabaseUrl}/functions/v1/metrics-overview`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "overview" }),
    })

    if (!tcRes.ok || !metRes.ok) {
      return new Response(JSON.stringify({ answer: "Impossible de récupérer les chiffres clés pour l’instant.", citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const tc = await tcRes.json().catch(() => null) as any
    const met = await metRes.json().catch(() => null) as any

    const range = tc?.range ? `${tc.range.start} → ${tc.range.end}` : "cette semaine"
    const hp = tc?.global?.hours_planned ?? 0
    const ha = tc?.global?.hours_actual ?? 0
    const cp = tc?.global?.cost_planned ?? 0
    const ca = tc?.global?.cost_actual ?? 0
    const mhp = tc?.me?.hours_planned ?? 0
    const mha = tc?.me?.hours_actual ?? 0

    const total = met?.global?.nb_projects_total ?? 0
    const active = met?.global?.nb_projects_active ?? 0
    const onhold = met?.global?.nb_projects_onhold ?? 0

    const answer = [
      `Période: ${range}`,
      `Projets: ${total} total • ${active} actifs • ${onhold} en pause`,
      `Heures (Global): ${hp.toFixed(1)} h planifiées • ${ha.toFixed(1)} h réelles`,
      `Coûts (Global): ${Math.round(cp)} € planifiés • ${Math.round(ca)} € réels`,
      `Mes heures: ${mhp.toFixed(1)} h planifiées • ${mha.toFixed(1)} h réelles`,
    ].join("\n")
    return new Response(JSON.stringify({ answer, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 6) Recherche RAG (FTS websearch) + fallback LLM/context
  // Document actif
  const { data: doc } = await admin.from("kb_documents").select("id, name, version").eq("active", true).order("created_at", { ascending: false }).maybeSingle()
  if (!doc) {
    const fallback = "Le guide n'est pas encore indexé. Ouvre Admin → Base de connaissance (RAG) et indexe le/les guides (puis active la version)."
    return new Response(JSON.stringify({ answer: fallback, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  const { data: chunksFts } = await admin
    .from("kb_chunks")
    .select("section, content, order_idx")
    .eq("document_id", (doc as any).id)
    .textSearch("ts", last, { config: "french", type: "websearch" })
    .limit(5)

  let top = (chunksFts ?? []).slice(0, 5)
  if (top.length === 0) {
    const terms = last.split(/\s+/).filter(Boolean).slice(0, 3)
    const pattern = `%${terms.join("%")}%`
    const { data: chunksLike } = await admin
      .from("kb_chunks")
      .select("section, content, order_idx")
      .eq("document_id", (doc as any).id)
      .ilike("content", pattern)
      .limit(5)
    top = (chunksLike ?? []).slice(0, 5)
  }

  const context = top.map((c, i) => `#${i+1} [${(c as any).section ?? "Section"}]\n${((c as any).content ?? "").slice(0, 1200)}`).join("\n\n")
  const sys = systemPrompt()
  const finalPrompt = [`CONTEXT:\n${context || "(vide)"}`, "Question:", last].join("\n\n")

  // Clé OpenAI (optionnelle)
  const { data: secret } = await admin.from("secrets_llm").select("api_key, provider").eq("id", "openai").maybeSingle()
  const apiKey = (secret as any)?.api_key as string | undefined
  const provider = (secret as any)?.provider as string | undefined

  if (!apiKey || provider !== "openai") {
    const answer = top.length > 0
      ? `D'après le guide:\n- ${top.map(c => ((c as any).section ?? "Section")).join(" • ")}.\n\n${((top[0] as any).content ?? "").slice(0, 500)}\n\nSi besoin, demandez une recommandation de développement.`
      : "Le guide ne contient pas d'information pertinente. Souhaitez-vous créer une recommandation de développement ?"
    return new Response(JSON.stringify({ answer, citations: top.map((c) => ({ section: (c as any).section, snippet: ((c as any).content ?? '').slice(0, 180) })) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  }

  try {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0.2, messages: [{ role: "system", content: sys }, { role: "user", content: finalPrompt }] })
    })
    if (!resp.ok) {
      const text = await resp.text()
      return new Response(JSON.stringify({ error: `OpenAI error ${resp.status}`, details: text }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const dataLLM = await resp.json()
    const answer = dataLLM?.choices?.[0]?.message?.content ?? "Je n'ai pas trouvé d'information suffisante dans le guide."
    return new Response(JSON.stringify({ answer, citations: top.map((c) => ({ section: (c as any).section, snippet: ((c as any).content ?? '').slice(0, 180) })) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" }
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: "LLM call failed", message: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})