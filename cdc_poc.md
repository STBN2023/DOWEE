# DoWee — CDC POC (résumé simple)

1) Objet du POC
- Offrir une planification fluide des heures par utilisateur (drag & drop), un reporting rapide (validation quotidienne), et une visibilité portfolio (dashboards).
- Public cible: équipe interne (admin/manager/user) — sécurité allégée pour évaluer l’usage et la valeur.

2) Périmètre fonctionnel (MVP)
- Planning hebdomadaire (semaine) avec drag & drop de projets, étirement vertical, remplacement/insert, suppression par “drag out”.
- Édition de la journée (clic pour poser 1h, double‑clic pour supprimer), validation du jour (copie des plans → heures réelles).
- Superposition Google Calendar (beta):
  - Affiche vos événements du calendrier “primary” sur la grille semaine.
  - Toggle “Afficher Google Agenda”, bouton “Connecter Google Agenda”, bouton “Recharger”.
  - Indicateurs: badge “Gcal • n” dans la cellule, liseré bleu “all‑day” sur la colonne, motif rouge si conflit (évènement + créneau planifié).
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
- Superposition Google Calendar:
  - OAuth via Supabase (provider “google”), scope: https://www.googleapis.com/auth/calendar.readonly.
  - Récupération du provider_token de session pour appeler l’API REST Google Calendar (événements du calendrier “primary”).
  - Stockage du toggle en localStorage (“dowee.gcal.enabled”).
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

9) Paramétrage Google (OAuth & API Calendar)
- Objectif: afficher votre Google Calendar en superposition dans /planning.
- Étapes côté Google Cloud Console:
  1. Créer un projet (ou réutiliser un existant).
  2. Activer l’API “Google Calendar API” (APIs & Services > Library).
  3. Configurer l’écran de consentement OAuth (type “Internal” ou “External” selon votre besoin).
  4. Créer des identifiants “OAuth client ID” (type “Web application”).
  5. Autorized JavaScript origins (origines front):
     - https://votre-domaine (prod)
     - http://localhost:8080 (dev Vite)
  6. Authorized redirect URIs (pour Supabase):
     - https://jfvnedehksmxlyrmsnzc.supabase.co/auth/v1/callback
  7. Récupérer Client ID et Client Secret.
- Étapes côté Supabase:
  - Dashboard > Authentication > Providers > Google:
    - Renseigner Client ID et Client Secret.
    - Vérifier que l’URL de redirection affichée par Supabase correspond bien à: https://jfvnedehksmxlyrmsnzc.supabase.co/auth/v1/callback (déjà ajoutée côté Google).
- Étapes côté application:
  - Dans /planning:
    - Activer “Afficher Google Agenda”.
    - Cliquer “Connecter Google Agenda” (OAuth Google via Supabase).
    - Autoriser le scope “calendar.readonly”.
    - Utiliser “Recharger” pour forcer l’actualisation des évènements.
  - Notes:
    - Le token Google (provider_token) est récupéré via la session Supabase; s’il expire, reconnectez-vous.
    - Les événements “all-day” appliquent un liseré bleu sur la colonne.
    - Un badge “Gcal • n” indique le nombre d’évènements sur un créneau; un motif rouge signale un conflit avec un créneau planifié.

10) Acceptation (POC)
- Drag & drop opérationnel (ajout, étirement, déplacement, suppression).
- Validation quotidienne fonctionnelle (page Today + relance bot).
- Dashboards visibles et chiffres cohérents (heures/coûts/plans vs réels).
- Rentabilité listée avec exports CSV OK.
- Admin opérationnel (création/édition, affectations, coûts/tarifs).
- Ticker alimenté (alertes + météo), message personnalisable.
- Bot utile (navigation, explications, relance; LLM/RAG si clés configurées).
- Superposition Google Calendar fonctionnelle (connexion, affichage, badge & conflits).

11) Roadmap simple (V2+)
- Resize direct d’un créneau, demi‑heures, undo/redo, poubelle visuelle, métriques avancées, embeddings sémantiques pour RAG, autorisations fines par rôle.