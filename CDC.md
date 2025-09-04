# POC Mini‑CRM & Outil de gestion de projet — **DoWee**

_Version_: **1.2**  
_Auteur_: Stéphane (avec appui IA)  
_Nom du projet_: **DoWee — Suivre le plan, ensemble**  
_Objectif (POC 2 semaines)**_: démontrer un mini‑CRM + gestion de projet avec **widget AM/PM** (alignement au planning) et **dashboard** (adhérence & raisons d’écart), prêt à être montré.

---

## 1) Vision & objectifs
- **Vision** : Centraliser salariés, clients, projets, planning; piloter le **quotidien** via un widget matin/soir et un **dashboard** clair.
- **Objectifs clés**
  - Enregistrer chaque jour un **check‑in AM** (valider/réorganiser) et un **check‑out PM** (réaliser/justifier).
  - Mesurer **taux d’adhérence** au plan + **top raisons d’écart**.
  - Permettre un **CRM light** (clients, projets, tâches assignées).
  - Déployer une **démo en ligne**.

---

## 2) Rôles & utilisateurs
- **Contributeur** : fait le check‑in/out, déclare ses allocations du jour.
- **Chef de projet** : crée projets/tâches, suit adhérence, valide les écarts.
- **Admin** : gère référentiels (salariés, clients), paramètres.

---

## 3) Parcours clés
1. **CRM light** : créer un client → un projet → des tâches (assignées à un utilisateur).
2. **Matin (AM)** : le widget affiche le plan du jour (seed/ics) → **Suivre** ou **Réorganiser** (ajuster projets/estimations).
3. **Soir (PM)** : **Suivi** ou **Écart** → saisir **heures décimales** par projet/tâche + **raison** si écart.
4. **Dashboard** : voir **adhérence** (planifié vs réalisé) + **top raisons** + derniers écarts.

---

## 4) Fonctionnalités (POC)
### 4.1 CRM (minimal)
- Clients (nom, contact), Projets (nom, **code**, client, statut), Tâches (titre, **assignee**, priorité, estimation).

### 4.2 Widget d’alignement planning (sans chrono)
- **AM** : affiche le plan (projets/tâches/estimations) → **Suivre** ou **Réorganiser**.
- **PM** : confirme le suivi ou déclare les **allocations** (heures décimales) + **raison d’écart** si déviation.
- Règles :
  - Saisie en **heures décimales** (ex. 1:30 → **1,5**).  
  - **Somme du jour** = **7,0 h** (par défaut, configurable) **OU** 100% (mode % post‑POC).
  - Raison obligatoire si écart (_Urgence client_, _Dépendance bloquée_, _Réunion imprévue_, _Changement de priorité_, _Autre_).
- Toolbox « Règles de saisie » : conversions (0,25=15 min, 0,5=30 min, 1,75=1h45), règle de somme, lien aide.

#### Saisie heures décimales — spécification
- __Formats acceptés__
  - Décimal: `H,M` ou `H.M` (ex: `1,5`, `0,25`, `7`).
  - Horaire: `H:MM` (ex: `1:30`, `0:15`).
  - Minutes: `MMm` ou `MM m` (ex: `90m`, `15 m`).
  - Mixte optionnel: `HhMM` (ex: `1h30`).
- __Bornes et pas__
  - Valeur individuelle: `0 ≤ minutes ≤ 420` (configurable). Pas: 1 minute.
  - Somme journalière: doit être exactement `target_minutes_per_day` (défaut `420` = 7h).
- __Conversion vers minutes (stockage source)__
  - Décimal: remplacer `,` par `.` puis `minutes = round(H*60)`.
  - `H:MM`: `minutes = H*60 + MM` (valider `0 ≤ MM < 60`).
  - Minutes: extraire entier avant `m` → `minutes = MM`.
  - `HhMM`: `minutes = H*60 + MM`.
- __Règles d’arrondi & affichage__
  - Arrondi au plus proche de la minute (demi-minute → arrondi supérieur).
  - Affichage en champ texte côté UI: normaliser en décimal local `H,MM` (fr) avec 2 décimales; infobulle rappelant équivalences.
- __Validation UI__
  - Blocage de la sauvegarde tant que `Σ allocations != target_minutes_per_day`.
  - Indicateur dynamique: `Reste X min` si inférieur, `Excédent X min` si supérieur.
  - Messages d’erreur:
    - `Format invalide ('…'). Exemples: 1,5  •  1:30  •  90m  •  1h30`.
    - `Minutes hors bornes (0 à 420)`.
    - `Les allocations du jour doivent totaliser 7,0 h` (valeur du paramètre si modifié).
- __Pseudo‑code de parsing (front)__
 
```ts
export function parseHoursToMinutes(input: string, locale: 'fr'|'en' = 'fr'): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase().replace(/\s+/g, '');
  // Minutes suffix: 90m
  const mMatch = s.match(/^([0-9]+)m$/);
  if (mMatch) return parseInt(mMatch[1], 10);
  // H:MM format
  const hm = s.match(/^([0-9]+):([0-5][0-9])$/);
  if (hm) return parseInt(hm[1],10)*60 + parseInt(hm[2],10);
  // HhMM format (1h30)
  const hhmm = s.match(/^([0-9]+)h([0-5]?[0-9])$/);
  if (hhmm) return parseInt(hhmm[1],10)*60 + parseInt(hhmm[2],10);
  // Decimal hours with , or .
  const dec = s.replace(',', '.');
  if (/^[0-9]+(\.[0-9]+)?$/.test(dec)) {
    return Math.round(parseFloat(dec) * 60);
  }
  return null; // invalide
}
 
### 4.3 Dashboard (POC)
- **Taux d’adhérence** (hebdo) = réalisé / planifié.  
- **Top raisons d’écart** (répartition).  
- **Liste des derniers écarts** (date, projet, raison, note).

---

## 5) Modèle de données (consolidé POC)
- **employees** : `id (auth.uid)`, `email`, `display_name`, `role (admin|manager|user)`, `active`.
- **clients** : `id`, `name`, `contact_email`.
- **projects** : `id`, `code` (**unique & requis**, format `CLIENT-ANNEE-SEQ`), `name`, `client_id`, `owner_id`, `status`.
- **tasks** : `id`, `project_id`, `title`, `priority (low|med|high)`, `estimate_minutes`, `assignee_id` (**obligatoire** côté UX lorsque la tâche passe en doing/done), `status (todo|doing|done)`.
- **plan_items** : `id`, `employee_id`, `d`, `project_id`, `task_id`, `planned_minutes`, `note`.
- **day_checks** : `id`, `employee_id`, `d`, `am_status (planned|replanned)`, `pm_status (followed|deviated)`, `comment`, `created_at`.
- **allocations** : `id`, `day_check_id`, `project_id`, `task_id`, `minutes` *(stockage source de vérité)*, `percent?`, `note`.
- **variance_reasons** : `id`, `day_check_id`, `reason`, `details`.
- **Vue BI** : `vw_time_entries` (dérive les lignes « temps » depuis `allocations` pour alimenter le dashboard).

**Contraintes clés** :
- `projects.code` **unique** + **regex** `^[A-Z0-9]{2,8}-[0-9]{4}-[0-9]{3}$`.
- 1 seul `day_check` par `(employee_id, d)`.
- RLS par utilisateur sur tables personnelles.
- **Stockage interne en minutes** ; UI en **heures décimales**.

#### SQL (Supabase — brouillon exécutable)

```sql
-- Générateurs UUID
create extension if not exists pgcrypto;

-- Employés (profil lié à auth.users)
create table if not exists public.employees (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  display_name text not null,
  role text not null check (role in ('admin','manager','user')),
  active boolean not null default true
);

-- Clients
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text
);

-- Projets
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  owner_id uuid references public.employees(id) on delete set null,
  status text not null default 'active' check (status in ('active','onhold','archived'))
);

-- Tâches
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  priority text not null default 'med' check (priority in ('low','med','high')),
  estimate_minutes integer not null default 0 check (estimate_minutes >= 0),
  assignee_id uuid references public.employees(id) on delete set null,
  status text not null default 'todo' check (status in ('todo','doing','done')),
  constraint assignee_required_when_not_todo
    check (status in ('todo') or assignee_id is not null)
);

-- Plan du jour (prévision)
create table if not exists public.plan_items (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  d date not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  planned_minutes integer not null default 0 check (planned_minutes >= 0),
  note text
);
create index if not exists plan_items_employee_date_idx on public.plan_items (employee_id, d);

-- Check-in/out du jour
create table if not exists public.day_checks (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  d date not null,
  am_status text not null check (am_status in ('planned','replanned')),
  pm_status text check (pm_status in ('followed','deviated')),
  comment text,
  created_at timestamptz not null default now(),
  constraint uniq_day_check unique (employee_id, d)
);

-- Allocations réalisées (source de vérité temps)
create table if not exists public.allocations (
  id uuid primary key default gen_random_uuid(),
  day_check_id uuid not null references public.day_checks(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  minutes integer not null check (minutes >= 0),
  percent numeric(5,2),
  note text
);
create index if not exists allocations_day_check_idx on public.allocations (day_check_id);

-- Raisons d'écart
create table if not exists public.variance_reasons (
  id uuid primary key default gen_random_uuid(),
  day_check_id uuid not null references public.day_checks(id) on delete cascade,
  reason text not null check (reason in ('Urgence client','Dépendance bloquée','Réunion imprévue','Changement de priorité','Autre')),
  details text
);

-- Contraintes & vues BI
alter table public.projects
  add constraint if not exists projects_code_format
  check (code ~ '^[A-Z0-9]{2,8}-[0-9]{4}-[0-9]{3}$');

create or replace view public.vw_time_entries as
select
  dc.d,
  dc.employee_id,
  a.project_id,
  a.task_id,
  a.minutes,
  vr.reason,
  coalesce(vr.details, a.note) as note
from public.allocations a
join public.day_checks dc on dc.id = a.day_check_id
left join public.variance_reasons vr on vr.day_check_id = dc.id;

---

## 6) API (MVP REST/JSON)
- **Auth** : JWT Supabase dans `Authorization: Bearer <token>` (scopes user standard).
- **CRUD** : `/clients`, `/projects`, `/tasks` (admin/manager écriture, tout utilisateur lecture).
- **Planning** : `GET /plans/daily?date=YYYY-MM-DD`, `POST /plans/daily/replan`.
- **Check‑ins** : `POST /day-checks` (AM), `PATCH /day-checks/{id}` (PM), `POST /day-checks/{id}/allocations`, `POST /day-checks/{id}/variance`.
- **Reports** : `/reports/adherence`, `/reports/reasons` (sur `vw_time_entries`).

Exemples (contrats simplifiés) :

- `GET /plans/daily?date=2025-09-02`

```json
{
  "date": "2025-09-02",
  "plan": [
    {"project_id": "...", "task_id": "...", "planned_minutes": 120, "note": "client A"}
  ],
  "copy_from_previous_available": true
}
```

- `POST /plans/daily/replan`

```json
{
  "date": "2025-09-02",
  "items": [
    {"project_id": "...", "task_id": "...", "planned_minutes": 180, "note": "spike"}
  ]
}
```

- `POST /day-checks` (AM)

```json
{ "date": "2025-09-02", "am_status": "planned" }
```

Réponse:

```json
{ "id": "<day_check_id>", "employee_id": "<me>", "d": "2025-09-02" }
```

- `PATCH /day-checks/{id}` (PM)

```json
{ "pm_status": "deviated", "comment": "urgence prod" }
```

- `POST /day-checks/{id}/allocations`

```json
{
  "allocations": [
    {"project_id": "...", "task_id": "...", "minutes": 210, "note": "rework"},
    {"project_id": "...", "task_id": null, "minutes": 210}
  ]
}
```

- `POST /day-checks/{id}/variance`

```json
{ "reason": "Urgence client", "details": "incident P1" }
```

- `GET /reports/adherence?from=2025-09-01&to=2025-09-07`

```json
{ "from": "2025-09-01", "to": "2025-09-07", "adherence_rate": 0.82 }
```

- `GET /reports/reasons?from=2025-09-01&to=2025-09-07`

```json
{
  "from": "2025-09-01", "to": "2025-09-07",
  "items": [
    {"reason": "Urgence client", "minutes": 240},
    {"reason": "Réunion imprévue", "minutes": 120}
  ]
}
```

---

## 7) UI/UX & identité
- **Charte DoWee** (palette inspirée Sydo) : Vert `#214A33`, Orange `#F2994A`, Crème `#F7F7F7`, Gris `#BFBFBF`.
- **Composants** : shadcn/ui, formulaires RHF+Zod, état TanStack Query.
- **Accessibilité** : contraste AA, navigation clavier, toasts lisibles.
- **Assets** : logos clair/foncé + icône check + **GIF** check animé (loader/feedback).

---

## 8) Sécurité & RGPD
- Auth Supabase (JWT), RLS strict par `employee_id`.
- Sauvegardes automatiques (Supabase).
- Mentions légales minimales (projet école), export des données utilisateur sur demande.

#### RLS & Policies (Supabase)

```sql
-- Activer RLS
alter table public.employees enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.plan_items enable row level security;
alter table public.day_checks enable row level security;
alter table public.allocations enable row level security;
alter table public.variance_reasons enable row level security;

-- Helper: vérifie le rôle applicatif
create or replace function public.has_role(roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.employees e
    where e.id = auth.uid() and e.active and e.role = any(roles)
  );
$$;

-- Employees: soi-même en lecture; admin en lecture complète
create policy if not exists employees_self_read on public.employees
for select to authenticated using (id = auth.uid());
create policy if not exists employees_admin_read_all on public.employees
for select to authenticated using (public.has_role(array['admin']));

-- Catalogues (lecture pour tous les authentifiés, écriture admin/manager)
create policy if not exists clients_read on public.clients
for select to authenticated using (true);
create policy if not exists clients_write on public.clients
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

create policy if not exists projects_read on public.projects
for select to authenticated using (true);
create policy if not exists projects_write on public.projects
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

create policy if not exists tasks_read on public.tasks
for select to authenticated using (true);
create policy if not exists tasks_write on public.tasks
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

-- Données personnelles par utilisateur
create policy if not exists plan_items_owner_select on public.plan_items
for select to authenticated using (employee_id = auth.uid());
create policy if not exists plan_items_owner_write on public.plan_items
for all to authenticated using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy if not exists day_checks_owner_select on public.day_checks
for select to authenticated using (employee_id = auth.uid());
create policy if not exists day_checks_owner_write on public.day_checks
for all to authenticated using (employee_id = auth.uid()) with check (employee_id = auth.uid());

create policy if not exists allocations_owner_read on public.allocations
for select to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);
create policy if not exists allocations_owner_write on public.allocations
for all to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);

create policy if not exists variance_owner_read on public.variance_reasons
for select to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);
create policy if not exists variance_owner_write on public.variance_reasons
for all to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);

---

## 9) Stack & déploiement
- **Front** : Next.js (TS) + Tailwind + shadcn/ui.
- **Data** : Supabase (Postgres + Auth + RLS).
- **Libs** : React Hook Form, Zod, TanStack Query, date‑fns.
- **Hébergement** : Vercel (front) + Supabase Cloud (DB/API).

---

## 10) Roadmap POC (10 jours ouvrés)
- **J1** : Setup Supabase + Next.js, schéma, RLS.
- **J2** : Auth + CRUD Clients/Projets/Tâches (assignee inclus).
- **J3** : API `/plans/daily` + UI **Check‑in AM**.
- **J4** : **Check‑out PM** (allocations + variance reasons).
- **J5** : Validations (heures décimales, somme jour, règles UX).
- **J6** : **Dashboard** (adhérence + top raisons) via `vw_time_entries`.
- **J7** : Polish UX (toolbox règles, copier la veille, raccourcis).
- **J8** : Tests manuels & fixes.
- **J9** : Déploiement Vercel/Supabase (dataset seed).
- **J10** : Script de démo, revue & ajustements.

---

## 11) KPI & critères d’acceptation
- **Check‑in** + **Check‑out** complétés en **< 3 clics** chacun.
- **Adhérence** et **Raisons** visibles en **< 2 s**.
- **Création** client→projet→tâche **< 1 min**.

---

## 12) Backlog post‑POC
- Import calendrier réel (Google/O365, 2‑way), Kanban/Gantt, budgets & facturation.
- `time_entries` matériel si exports/BI externes, code projet auto‑généré (fonction + trigger).
- Notifications (Slack/Teams), préférences utilisateur avancées, mode **%** en alternative.

