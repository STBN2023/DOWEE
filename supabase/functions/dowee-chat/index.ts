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
    "Tu réponds UNIQUEMENT d'après le CONTEXTE fourni (guide utilisateur) et/ou les données disponibles côté app.",
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

// --- Score (explication) ---
function isScoreHow(q: string) {
  return q.includes("score") && (q.includes("calcul") || q.includes("comment") || q.includes("formule"))
}
function answerScoreHow() {
  return [
    "Calcul du score projet:",
    "- S_client (segment): Super rentable=80, Normal=50, Pas rentable=20 (25%).",
    "- S_marge: 0–100 selon marge% (≥40%→100; 20–39: 60+2×(m-20); 1–19: 20+2×(m-1); ≤0→0) (35%).",
    "- S_urgence: B = jours restants / effort (j). B≤0→100; 0<B<1→90; 1–3→60; ≥3→20 (20%).",
    "- S_récurrence: 0–100 (10%).",
    "- S_strat: 0 / 50 / 100 (10%).",
    "Score = min(100, (0,25*S_client + 0,35*S_marge + 0,20*S_urgence + 0,10*S_récurrence + 0,10*S_strat) × (×1,15 si client Star))."
  ].join("\n")
}

// --- Score (exemple détaillé) ---
function isScoreExample(q: string) {
  return q.includes("exemple") && q.includes("score")
}
function sClient(segment?: string | null): number {
  if (!segment) return 50
  const s = segment.toLowerCase()
  if (s.includes("super")) return 80
  if (s.includes("pas")) return 20
  return 50
}
function sMarge(pct: number | null): number {
  if (pct == null) return 50
  if (pct <= 0) return 0
  if (pct < 20) return 20 + 2 * (pct - 1)
  if (pct < 40) return 60 + 2 * (pct - 20)
  return 100
}
function sUrgence(daysLeft: number | null, effortDays: number | null): number {
  if (daysLeft == null || effortDays == null || effortDays <= 0) return 50
  const B = daysLeft / effortDays
  if (B <= 0) return 100
  if (B < 1) return 90
  if (B < 3) return 60
  return 20
}
function clamp100(n: number) { return Math.min(100, Math.max(0, n)) }
function round2(n: number) { return Math.round(n * 100) / 100 }
function daysLeft(dueIso?: string | null): number | null {
  if (!dueIso) return null
  const [y, m, d] = dueIso.split("-").map((x) => parseInt(x, 10))
  const today = new Date()
  const nowUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const due = new Date(Date.UTC(y, m - 1, d))
  const diff = (due.getTime() - nowUTC.getTime()) / (1000 * 60 * 60 * 24)
  return Math.floor(diff)
}
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

  // 1) Navigation rapide
  const nav = quickNavAnswer(q)
  if (nav) {
    return new Response(JSON.stringify({ answer: nav, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 2) Explication du score
  if (isScoreHow(q)) {
    return new Response(JSON.stringify({ answer: answerScoreHow(), citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 3) Exemple de score (générique ou par projet)
  if (isScoreExample(q)) {
    const code = extractProjectCode(last)
    if (code) {
      // Récupérer le score du projet ciblé
      const resp = await fetch(`${supabaseUrl}/functions/v1/project-scoring`, {
        method: "POST",
        headers: { Authorization: authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
      })
      if (resp.ok) {
        const data = await resp.json().catch(() => ({ scores: [] }))
        const item = (data?.scores || []).find((x: any) => (x.code || "").toUpperCase() === code)
        if (item) {
          const s_client = sClient(item.segment)
          const s_marge = sMarge(item.margin_pct ?? null)
          const dLeft = daysLeft(item.due_date ?? null)
          const s_urg = sUrgence(dLeft, item.effort_days ?? null)
          const s_rec = 0, s_strat = 0
          const raw = 0.25*s_client + 0.35*s_marge + 0.20*s_urg + 0.10*s_rec + 0.10*s_strat
          const mult = item.star ? 1.15 : 1
          const calc = clamp100(round2(raw * mult))
          const lines = [
            `Exemple sur ${item.code} — ${item.name}:`,
            `- Segment: ${String(item.segment ?? "Normal")} → S_client=${Math.round(s_client)}`,
            `- Marge: ${item.margin_pct == null ? "—" : `${Math.round(item.margin_pct)}%`} → S_marge=${Math.round(s_marge)}`,
            `- Urgence: jours restants=${dLeft ?? "?"}, effort=${item.effort_days ?? "?"} → S_urgence=${Math.round(s_urg)}`,
            `- Bonus Star: ${item.star ? "oui (×1,15)" : "non"}`,
            `Score ≈ ${Math.round(calc)} (formule).`,
          ]
          return new Response(JSON.stringify({ answer: lines.join("\n"), citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }
      }
      // si échec: basculer sur exemple générique
    }
    const s_client = 50   // Normal
    const s_marge = sMarge(32) // 32% → 60 + 2×(12) = 84
    const s_urg = sUrgence(5, 10) // 5 jours restants / 10j d'effort → B=0,5 → 90
    const s_rec = 0, s_strat = 0
    const calc = clamp100(round2((0.25*s_client + 0.35*s_marge + 0.20*s_urg + 0.10*s_rec + 0.10*s_strat)))
    const example = [
      "Exemple:",
      "- S_client=50 (client Normal).",
      "- S_marge=84 (marge 32%).",
      "- S_urgence=90 (5j restants / 10j d’effort).",
      "- S_récurrence=0, S_strat=0.",
      `Score ≈ ${Math.round(calc)}.`,
    ]
    return new Response(JSON.stringify({ answer: example.join("\n"), citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 4) Projets prioritaires (top scores)
  if (q.includes("prioritair") || q.includes("projet prioritaire") || q.includes("top projet") || (q.includes("quel") && q.includes("projet") && (q.includes("priorite") || q.includes("prioritair")))) {
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

  // 5) Heures restantes sur un projet (par code ou mes projets)
  if ((q.includes("heure") || q.includes("heures")) && (q.includes("reste") || q.includes("restant"))) {
    const code = extractProjectCode(last)
    if (code) {
      const { data: prj } = await admin.from("projects").select("id, code, name, effort_days").eq("code", code).maybeSingle()
      if (!prj) {
        return new Response(JSON.stringify({ answer: `Projet ${code} introuvable. Donne un code du type CLIENT-YYYY-NNN.`, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      const projectId = (prj as any).id
      const projectLabel = `${(prj as any).code} — ${(prj as any).name}`
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
      const { data: pe } = await admin.from("project_employees").select("project_id").eq("employee_id", userId)
      const myIds = Array.from(new Set((pe || []).map((r: any) => r.project_id)))
      if (myIds.length === 0) {
        return new Response(JSON.stringify({ answer: "Aucun projet assigné. Donne un code projet (ex: ACME-2025-001).", citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
      if (myIds.length > 1) {
        const { data: projs } = await admin.from("projects").select("code, name").in("id", myIds)
        const list = (projs || []).map((p: any) => `• ${p.code} — ${p.name}`).join("\n")
        return new Response(JSON.stringify({ answer: `Précise le projet (code) parmi:\n${list}`, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
      }
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

  // 6) Chiffres clés dashboards (hebdo)
  if ((q.includes("chiffre") && (q.includes("cle") || q.includes("cl"))) || q.includes("kpi") || (q.includes("dashboard") && (q.includes("resume") || q.includes("synthese")))) {
    const tcRes = await fetch(`${supabaseUrl}/functions/v1/time-cost-overview`, {
      method: "POST",
      headers: { Authorization: authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({ action: "overview" }),
    })
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

  // 7) Statut/validation du jour (“ai-je des heures à valider ?”)
  if ((q.includes("valider") || q.includes("validation")) && (q.includes("heure") || q.includes("jour") || q.includes("journee") || q.includes("aujourd"))) {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, "0")
    const d = String(today.getDate()).padStart(2, "0")
    const iso = `${y}-${m}-${d}`

    const [{ data: dv }, { data: plans }, { data: actuals }] = await Promise.all([
      userClient.from("day_validations").select("id").eq("employee_id", userId).eq("d", iso).maybeSingle(),
      userClient.from("plan_items").select("id").eq("employee_id", userId).eq("d", iso),
      userClient.from("actual_items").select("id").eq("employee_id", userId).eq("d", iso),
    ])

    const plannedCount = (plans ?? []).length
    const actualCount = (actuals ?? []).length
    const validated = !!dv

    let answer = ""
    if (validated) {
      answer = `Ta journée (${iso}) est déjà validée.`
    } else if (plannedCount > 0) {
      answer = `Tu as ${plannedCount} créneau(x) planifié(s) aujourd’hui (${iso})${actualCount ? ` et ${actualCount} réel(s)` : ""}. Tu peux valider depuis /today.`
    } else {
      answer = `Aucun créneau planifié pour aujourd’hui (${iso}). Ouvre /day pour planifier, puis valide.`
    }
    return new Response(JSON.stringify({ answer, citations: [] }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }

  // 8) Recherche RAG (FTS websearch) + fallback ILIKE + LLM si clé
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