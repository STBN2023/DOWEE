# DoWee — CDC POC (résumé simple)

1) Objet du POC
- Offrir une planification fluide des heures par utilisateur (drag & drop), un reporting rapide (validation quotidienne), et une visibilité portfolio (dashboards).
- Public cible: équipe interne (admin/manager/user) — sécurité allégée pour évaluer l’usage et la valeur.

2) Périmètre fonctionnel (MVP)
- Planning hebdomadaire (semaine) avec drag & drop de projets, étirement vertical, remplacement/insert, suppression par “drag out”.
- Édition de la journée (clic pour poser 1h, double‑clic pour supprimer), validation du jour (copie des plans → heures réelles).
- Dashboards: Global, Équipe (conception/​créa/​dev), Moi (heures & coûts semaine + vue annuelle).
- Rentabilité: vues Clients et Projets (CA vendu, coût estimé, marge €/%), export CSV.
- Admin: Profils salariés, Clients, Projets (code auto, affectations), Barèmes (tarifs), Coûts internes, Références simples.
- Bandeau d’infos (ticker): alertes internes + météo (WeatherAPI), message personnalisé.
- Bot (assistant): Q/R sur l’app, relance validation (après‑midi ou à la connexion), RAG sur le guide (si indexé), LLM optionnel (OpenAI).
- Authentification: Supabase Auth (email/mot de passe + Google OAuth), redirections et contrôle session “orpheline”.

3) Techno & architecture
- Front: React 18 + TypeScript + Vite, React Router (SPA), Tailwind CSS, shadcn/ui (Radix), lucide-react (icônes).
- DnD: @dnd-kit/core (planning + day).
- Animation/UX: framer-motion (bot), sonner + toasts shadcn.
- State/serveur: TanStack Query (bootstrap), appels via Supabase client (JS v2) + Edge Functions.
- UI responsive, palette: Vert #214A33, Orange #F2994A, Gris #BFBFBF, Blanc crème #F7F7F7.

4) Données & backend (Supabase)
- Base: Postgres gérée par Supabase (RLS activées).
- Tables principales: employees, projects, project_employees, plan_items (prévisionnel), actual_items (réel), day_validations, clients, ref_tariffs, ref_internal_costs, planning_change_logs, feedbacks, kb_documents/kb_chunks.
- Auth: Supabase Auth; “orphan check” (session sans ligne employees) ⇒ déconnexion/403.
- Edge Functions (API):
  - Planning: user-week (GET/PATCH), day-validation.
  - Dashboards/portefeuille: metrics-overview, time-cost-overview, portfolio-view, project-costs.
  - Rentabilité/exports: client-profitability, project-profitability, export-*. 
  - Administration: admin-employees, admin-clients, admin-projects (création/affectation/finalisation), admin-tariffs, admin-internal-costs, admin-llm.
  - Bot & alerts: dowee-chat (LLM/RAG), alerts-ticker (+ variante LLM), dowee-feedback (retours), kb-index/kb-list-docs (RAG), weatherapi.
- Sécurité: RLS sur données sensibles; service role utilisé uniquement dans les Edge Functions côté serveur.

5) Authentification & rôles (POC)
- Auth: email/password + Google OAuth. 
- Rôles UI: admin | manager | user (sélecteur visuel, influence l’affichage, pas une barrière de sécurité).
- Règle produit: si session valide mais profil employees absent ⇒ auto‑signout (évite profils “fantômes”).

6) Développement avec Dyad
- Dév assisté en ligne: génération/édition de fichiers, aperçu live, composants shadcn prêts à l’emploi.
- Bonnes pratiques: petits composants/cohérents, Tailwind systématique, code simple (pas d’over‑engineering).
- Actions utiles dans l’UI: Restart / Rebuild / Refresh pour relancer l’aperçu (pas de commandes shell).

7) CI/CD, hébergement & environnements
- Dépôt: GitHub (CI: lint, type-check, build).
- Hébergement: Vercel (SPA Vite) avec rewrite vers /index.html (vercel.json).
- Variables d’environnement (Vercel / local):
  - SUPABASE_URL, SUPABASE_ANON_KEY (publishable), SUPABASE_SERVICE_ROLE_KEY (Edge only), WEATHERAPI_KEY.
- Supabase: Project ID (référence interne), gestion des secrets côté Edge Functions (déjà câblé).

8) Comportements clés (règles métier)
- Créneau = 60 minutes; unicité par (employee_id, date, heure).
- Étirement vertical mono‑jour: crée N créneaux d’1h.
- Déplacement d’un créneau: supprime l’ancien, crée le nouveau (log en base).
- Validation du jour: copie des plans → actuals, puis marque validé (réversible par réédition).
- Dashboards & coûts: coût horaire dérivé des coûts internes journaliers (€/j ÷ 8) par équipe.

9) Acceptation (POC)
- Drag & drop opérationnel (ajout, étirement, déplacement, suppression).
- Validation quotidienne fonctionnelle (page Today + relance bot).
- Dashboards visibles et chiffres cohérents (heures/coûts/plans vs réels).
- Rentabilité listée avec exports CSV OK.
- Admin opérationnel (création/édition, affectations, coûts/tarifs).
- Ticker alimenté (alertes + météo), message personnalisable.
- Bot utile (navigation, explications, relance; LLM/RAG si clés configurées).

10) Roadmap simple (V2+)
- Resize direct d’un créneau, demi‑heures, undo/redo, poubelle visuelle, métriques avancées, embeddings sémantiques pour RAG, autorisations fines par rôle.