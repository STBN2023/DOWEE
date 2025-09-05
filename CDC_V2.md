# CDC_V2 — DoWee

Version: 2.0
Rédigé le: 2025-09-05
Auteur: DoWee

Ce cahier des charges est destiné à une IA de développement. Il décrit de façon opérationnelle l’objectif, le périmètre, les besoins fonctionnels, le modèle de données, l’API, l’UX/UI, la sécurité et les critères d’acceptation du produit DoWee, avec un focus sur la planification horaire utilisateur avancée.


## 1. Contexte & Objectif

- DoWee est une application Next.js permettant de gérer des projets, les salariés et leur planification hebdomadaire.
- Objectif principal V2: fournir une planification horaire « fluide » centrée utilisateur, avec drag & drop avancé, gestion multi-heures, suppression par drag out, et simplification de l’UI (pas de sélection de durée dans les blocs).
 - Objectif métier (POC): réduire le temps de reporting quotidien des équipes (saisie plus rapide, drag & drop, actions groupées) et limiter les frictions.
 - Indicateurs & tableaux de bord: suivi du nombre de projets en global, par équipe (commercial, créa, dev) et individuel, avec vues dédiées.
 - Sécurité MVP allégée: pour le POC, réduire les contraintes tout en gardant un minimum (auth simple). Un sélecteur de rôle UI permet de choisir la vue (admin, manager, user) sans prétention sécuritaire.
 - Architecture:
  - Front: Next.js (App Router), React, Tailwind.
  - Auth: Supabase Auth (email/password), `@supabase/auth-helpers-nextjs`.
  - Données: Supabase (Postgres), RLS active.
  - Communication: API Route Handlers Next.js.


## 2. Périmètre V2

- Planification horaire hebdomadaire par utilisateur (semainier).
- Drag & drop depuis un « bandeau » projets assignés vers la grille horaire.
- Étirement d’une plage sur plusieurs heures (mono-jour) au survol pendant le drag.
- Suppression d’un créneau en le glissant hors de la grille (drag out delete).
- Retrait du sélecteur de durée dans les blocs (créneau = 60 min fixe).
- Multiples projets sur une même journée autorisés (une seule entrée par `(jour, heure)` et par salarié).
- Sécurité et fiabilité de la session: auto-signout si session orpheline (pas de ligne dans `employees`).
- Admin projets: afficher le nom complet des salariés affectés (plus de champ « rôle » dans l’UI d’affectation).
- Tableaux de bord: Global, Équipe (commercial, créa, dev), Individuel.
- Sélecteur de vue par rôle (admin, manager, user) dans l’UI pour choisir les vues affichées.
- Respect strict de la charte graphique: palette couleurs (Vert #214A33, Orange #F2994A, Gris #BFBFBF, Blanc crème #F7F7F7).
- Sécurité MVP allégée pour le POC: accès aux dashboards réservé aux utilisateurs connectés, sans granularité fine.

Hors périmètre immédiat (peut devenir V2+):
- Étirement multi-jours.
- Redimensionnement direct d’un créneau existant (resize handle).
- Granularité 30 minutes.
- Historisation/undo global.
- Notifications / toasts systématiques.


## 3. Règles Produit & Métier

- Un créneau correspond à 60 minutes sur une heure précise (ex: 09h-10h).
- Contrainte d’unicité: 1 seul créneau par `(employee_id, d, hour)`.
- Plusieurs projets possibles le même jour tant qu’ils se situent à des heures différentes.
- La grille couvre par défaut 7 jours (lundi → dimanche) et les heures « ouvrées » (ex: 08:00–18:00). Les bornes sont paramétrables.
- Les projets affichés dans le bandeau sont ceux assignés à l’utilisateur (table `project_employees`, statut projet ≠ archived).
- Rôles systèmes: `admin`, `manager`, `user` (alignés, pas de rôle « pm »).


## 4. Expérience Utilisateur (UX)

4.1. Grille Planning
- Affichage semaine courante, navigation semaine précédente/suivante.
- En-têtes de colonnes = jours (format local), lignes = heures.
- Chaque cellule représente un couple `(jour, heure)` et contient soit un bloc projet, soit un état vide « Glissez un projet ici… ».
- Mise en évidence (highlight) pendant le drag:
  - Le surlignage s’applique au `<td>` complet, via ring/fond léger.
  - La plage suivra l’heure d’entrée et s’étendra verticalement dans la même colonne (mono-jour) en fonction du survol.

4.2. Drag & Drop
- Source: « pilules » de projets dans un bandeau en haut de la page planning.
- Cible: cellules de la grille.
- Étirement:
  - Tant que le bouton est maintenu, survoler plusieurs cellules d’un même jour étire la sélection.
  - Au drop, la plage crée N créneaux de 60 min, un par heure couverte.
- Suppression:
  - Glisser un créneau existant hors de la grille et relâcher: suppression du créneau visé.
  - Pas de bouton « Retirer » dans la cellule (supprimé).

4.3. État & feedback
- États: `loading`, `saving`, `error` gérés côté React.
- En cas d’échec d’API, un message d’erreur textuel s’affiche (toast optionnel ultérieur).


## 5. Règles d’Interface (UI)

- Cohérence graphique via Tailwind; palette vert/ambre (voir `Charte graphique/`).
- Composant Header (`web/components/Header.tsx`):
  - Si session Supabase valide ET ligne `employees` trouvée: afficher initiale + nom, bouton « Déconnexion ».
  - Si session Supabase valide MAIS pas de `employees`: auto-signout (serveur + client) puis afficher « Se connecter ».
  - Si pas de session: « Se connecter ».
- Sélecteur de vue par rôle (Admin/Manager/User):
  - Accessible depuis le `Header` ou le `FloatingBurger`.
  - Impacte uniquement l’affichage (quelles sections sont visibles par défaut). Pour le POC, ce n’est pas un mécanisme d’autorisation.
  - Exemples de vues: Admin → Global; Manager → Équipe; User → Individuel.
- Charte graphique — Palette (obligatoire):
  - Vert foncé `#214A33` (logo, titres, fonds sombres)
  - Orange doux `#F2994A` (icônes check, CTA)
  - Gris neutre `#BFBFBF` (texte secondaire, bordures)
  - Blanc crème `#F7F7F7` (fonds, cartes, version claire)
- Page Admin Projets (`/admin/projects`):
  - Dans l’affectation, afficher le nom complet du salarié (ou email fallback). Aucun champ « rôle ».


## 6. Modèle de données (extrait)

Tables principales:

- `employees` (id = UUID = `auth.users.id`)
  - `id` (PK), `first_name`, `last_name`, `display_name`, `avatar_url`, `role` (enum: admin|manager|user), autres méta.
  - RLS: chaque employé peut voir sa propre ligne; admin/manager via politiques adaptées.

- `projects`
  - `id` (PK), `code` (unique), `name`, `client_id`, `owner_id` (FK employees), `status` (active|onhold|archived), etc.

- `project_employees`
  - `project_id` (FK projects), `employee_id` (FK employees), [optionnel `role` non géré par l’UI en V2].
  - Contrainte unique `(project_id, employee_id)`.

- `plan_items`
  - `id` (PK)
  - `employee_id` (FK employees)
  - `d` (date ISO yyyy-mm-dd)
  - `hour` (int, ex: 8..18)
  - `project_id` (FK projects)
  - `task_id` (optionnel, FK tasks si existant)
  - `planned_minutes` (int, défaut 60)
  - `note` (text, nullable)
  - Contrainte unique `(employee_id, d, hour)`
  - RLS: lecture/écriture sur ses propres entrées + admin/manager selon politiques.

Remarque migrations/README DB:
- Scripts SQL idempotents (`db/001_init.sql`, `db/002_seed.sql`, etc.).
- Migrations de réalignement des rôles vers `manager` effectuées (plus de « pm » hors migration dédiée).


## 7. API (Route Handlers Next.js)

Base: `/api/user/week`

- GET `/api/user/week?start=YYYY-MM-DD`
  - Rôle requis: `admin` | `manager` | `user` 
  - Utilise la session (cookies) via `createRouteHandlerClient`.
  - Logique:
    1) Détermine la semaine (lundi → dimanche) à partir de `start` ou de la date courante.
    2) Lit `plan_items` pour l’utilisateur courant sur l’intervalle.
    3) Récupère les `projects` assignés (non archivés) via `project_employees`.
  - Réponse JSON (ex):
```json
{
  "range": { "start": "2025-09-01", "end": "2025-09-07" },
  "plans": [
    { "id": "...", "d": "2025-09-03", "hour": 9, "project_id": "...", "planned_minutes": 60, "note": null }
  ],
  "projects": [
    { "id": "...", "code": "ACME-2025-001", "name": "Site vitrine", "status": "active" }
  ]
}
```

- PATCH `/api/user/week`
  - Rôle requis: `admin` | `manager` | `user`
  - Corps JSON:
```json
{
  "upserts": [ { "d": "2025-09-03", "hour": 9, "project_id": "...", "planned_minutes": 60, "note": null } ],
  "deletes": [ { "id": "..." }, { "d": "2025-09-03", "hour": 10 } ]
}
```
  - Comportement:
    - Pour chaque `upsert`: suppression préalable de toute ligne `(employee_id, d, hour)` puis insertion d’une ligne 60 min.
    - Pour chaque `delete`: suppression par `id` si fourni, sinon par `(d, hour)`.
  - Réponse: `{ "ok": true }` ou `{ "error": "..." }`.

- Autres endpoints utiles:
  - `/api/admin/employees` (lecture liste, protégée par rôle) — déjà présent.
  - `/auth/signout` (POST) — nettoie la session côté serveur.


## 8. Front-End — Détails d’implémentation

8.1. Page Planning `web/app/planning/page.tsx`
- États:
  - `plans`, `projects`, `grid` (indexation `"${d}|${hour}"` → item), `dragSel` (`active`, `start`, `end`, `project_id` ou plan en train de bouger), `loading/saving/error`.
- Drag depuis le bandeau projets:
  - `onDragStartProject(projectId)`: initialise `dragSel.active=true`.
  - `onDragEnterCell/OverCell(dIso, hour)`: met à jour la sélection étirée, verrouillée sur le premier jour d’entrée.
  - Surlignage appliqué sur `<td>` avec classes `ring-2 ring-amber-400 bg-amber-100/40`.
  - Au `drop`: création des `upserts` (1 ligne par heure sélectionnée). Durée fixée à 60 min.
- Drag d’un plan existant hors table: supprime le créneau (PATCH `deletes`).
- Plus de bouton « Retirer » dans les cellules.

8.2. Header `web/components/Header.tsx`
- Détermine la session via `supabaseBrowser.auth.getSession()` + fallback `getUser()`.
- Charge `employees` par `id`:
  - Si aucun `employees`: auto-signout (POST `/auth/signout` + `supabaseBrowser.auth.signOut()`), puis met l’état utilisateur à `null` ⇒ UI « Se connecter ».

8.3. Admin Projets `web/app/admin/projects/page.tsx`
- Liste projets + modales créer/modifier.
- Affectation salariés:
  - Affiche nom complet (`display_name` sinon « Nom Prénom » sinon email) — champ `label` pré-construit côté client.
  - Retire la saisie du « rôle » (l’UI ne gère plus la colonne `role`).


## 9. Sécurité & Sessions

- Auth Supabase avec cookies synchronisés par `@supabase/auth-helpers-nextjs` (client et route handlers).
- RLS activées sur les tables sensibles (`plan_items`, `employees`, etc.).
- Côté serveur, chaque route vérifie la session (401) puis la présence d’une ligne `employees` (sinon 403) via `supabaseAdmin`.
- Côté client, le Header déconnecte automatiquement une session sans entrée `employees` pour éviter les profils « fantômes ».
- Le service role key (`SUPABASE_SERVICE_ROLE_KEY`) n’est utilisé que côté serveur (dans `supabaseAdmin`).
- Mode MVP/POC (sécurité allégée):
  - Les endpoints de métriques (dashboards) peuvent exécuter des agrégations côté serveur via service role et être exposés aux utilisateurs connectés sans contrôle fin par ligne.
  - Le sélecteur de rôle est un outil d’aperçu des vues (UI), pas une barrière de sécurité.


## 10. Performances & Compatibilité

- Drag & drop basé sur les événements natifs HTML5, compatible Chrome/Edge/Firefox récents.
- Éviter la dépendance à `dataTransfer.getData()` pendant `dragover/dragenter`; s’appuyer sur l’état interne pour le highlight.
- Chargements parallèles via `Promise.all` (clients, employees, projects) côté admin.
- Pagination non nécessaire à ce stade (volumétrie modérée), mais prévoir tri et filtres simples.


## 11. Observabilité & Logs

- Logs console informatifs côté client pour les étapes d’auth et de drag (niveau `console.log`/`warn`).
- En cas d’erreur API (400/401/403/500), afficher un message d’erreur utilisateur.
- Route de debug: `/api/debug/session` retourne `user.id` et `email`.


## 12. Critères d’acceptation (AC)

- AC1: Drag d’un projet sur une heure unique crée un créneau 60 min.
- AC2: Étirement vertical mono-jour crée un créneau par heure couverte.
- AC3: Le surlignage suit le survol dans la même colonne et s’affiche au niveau de la cellule (`<td>`), visible et réactif.
- AC4: Glisser un créneau existant hors de la grille le supprime.
- AC5: Aucune sélection de durée visible dans les cellules ou les formulaires de la page planning.
- AC6: Plusieurs projets peuvent être posés la même journée s’ils ne partagent pas la même heure.
- AC7: Si une session Supabase est valide MAIS sans `employees`, l’UI se réinitialise pour afficher « Se connecter » (auto-signout).
- AC8: Sur `/admin/projects`, les salariés affectés s’affichent par nom complet; aucun champ « rôle ».
- AC9: Les routes `/api/user/week` répondent selon le schéma JSON précisé, avec gestion des erreurs.
- AC10: Les RLS empêchent un utilisateur d’accéder/écrire sur les données d’un autre.
- AC11: Les dashboards Global, Équipe (commercial, créa, dev) et Individuel affichent le nombre de projets conformément aux définitions produit.
- AC12: Le sélecteur de vue par rôle permet de basculer l’interface entre Admin/Manager/User (affichage), sans changer les autorisations serveur.


## 13. Définition de Done (DoD)

- Lancement local sans erreur, variables d’environnement renseignées (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
- Tous les AC validés sur Chrome/Edge récents.
- Lint/format OK, pas d’erreurs TS dans l’IDE.
- README/CDC à jour (ce document).


## 14. Évolutions V2+ (Backlog)

- Étirement multi-jours d’un seul geste.
- Redimensionnement direct d’un bloc existant.
- Undo/Redo local (par ex. dernière opération PATCH).
- Granularité 30 min ou « sous-blocs » (deux créneaux 30 min dans la même heure).
- Zone « poubelle » visuelle et confirmation/undo pour la suppression.
- Toasts système (succès/suppression/erreurs) harmonisés.
- Accessibilité clavier pour la navigation horaire.


## 15. Environnements & Configuration

- Fichier `.env.local` (côté web):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=... # utilisé uniquement côté serveur
```
- Les URL d’API Next.js (App Router) sont relatives (`/api/...`) et profitent du même domaine.
- Les images publiques (logo) dans `web/public/`.


## 16. Annexes — Exemples

- Exemple `upserts` sur 3 heures consécutives (09→11 inclus):
```json
{
  "upserts": [
    { "d": "2025-09-03", "hour": 9, "project_id": "proj-1" },
    { "d": "2025-09-03", "hour": 10, "project_id": "proj-1" },
    { "d": "2025-09-03", "hour": 11, "project_id": "proj-1" }
  ]
}
```

- Exemple suppression par `(d, hour)`:
```json
{ "deletes": [ { "d": "2025-09-03", "hour": 15 } ] }
```

- Exemple réponse GET semaine:
```json
{
  "range": { "start": "2025-09-01", "end": "2025-09-07" },
  "plans": [
    { "id": "abc", "d": "2025-09-02", "hour": 14, "project_id": "proj-1", "planned_minutes": 60, "note": null }
  ],
  "projects": [ { "id": "proj-1", "code": "ACME-2025-001", "name": "Site vitrine", "status": "active" } ]
}
```


## 17. Glossaire

- « Plage »: sélection d’un ensemble d’heures consécutives le même jour.
- « Orphelin »: utilisateur authentifié Supabase ne possédant pas de ligne correspondante dans `employees`.
- « RLS »: Row Level Security, politiques Postgres contrôlant l’accès par ligne.

## 18. Tableaux de bord & Reporting

- Objectif: réduire le temps de reporting quotidien et offrir une vision rapide des charges/projets.

- Vues cibles:
  - Global (Admin):
    - `nb_projects_total` (tous projets non archivés)
    - `nb_projects_active` (statut = active)
    - `nb_projects_onhold` (statut = onhold)
  - Équipe (Manager):
    - Par équipe: commercial, créa, dev
    - `nb_projects_active_distinct` = nb de projets non archivés avec au moins un salarié de l’équipe affecté (`project_employees` ∩ `employees.team`)
  - Individuel (User):
    - `nb_projects_mine` = nb de projets non archivés auxquels l’utilisateur est affecté (distinct sur `project_id`)

- Définitions produit:
  - Un « projet compté » est un enregistrement de `projects` dont `status` ≠ `archived`.
  - Pour la vue Équipe, un projet est rattaché à une équipe si au moins un `employee` de cette équipe est affecté au projet via `project_employees`.
  - L’appartenance d’un salarié à une équipe provient d’un champ ou d’un référentiel (ex: fonction/service) mappé en `{commercial|créa|dev}` via une vue ou un mapping applicatif.

- API (MVP):
  - GET `/api/metrics/overview`
    - Réponse (ex):
```
{
  "global": { "nb_projects_total": 120, "nb_projects_active": 98, "nb_projects_onhold": 12 },
  "byTeam": [
    { "team": "commercial", "nb_projects_active_distinct": 34 },
    { "team": "créa", "nb_projects_active_distinct": 41 },
    { "team": "dev", "nb_projects_active_distinct": 56 }
  ],
  "me": { "nb_projects_mine": 12 }
}
```
  - (Optionnel) GET `/api/metrics/teams?team=crea` → `{ team, nb_projects_active_distinct }`
  - (Optionnel) GET `/api/metrics/user?employee_id=...` (défaut: courant)

- Implémentation serveur (suggestion):
  - Agrégations via `supabaseAdmin` (service role) dans un route handler.
  - Vues SQL possibles:
    - `vw_metrics_projects_global` (compte par statut ≠ archived)
    - `vw_metrics_projects_by_team` (join `project_employees` × `employees` → group by équipe)
    - `vw_metrics_projects_by_employee` (group by employé)

- UI:
  - Page `Dashboards` avec onglets: Global | Équipe | Moi
  - Le sélecteur de rôle choisit l’onglet par défaut (Admin→Global, Manager→Équipe, User→Moi).
  - Respect strict de la charte (Vert #214A33 pour titres, Orange #F2994A pour CTA, fonds Blanc crème #F7F7F7, bordures Gris #BFBFBF).


---
Fin du document.
