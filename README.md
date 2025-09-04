# DoWee

Suite applicative POC (Proof of Concept) pour la planification journalière, le suivi AM/PM et un petit CRM (clients/projets/tâches), bâtie sur Supabase (PostgreSQL + Auth) et Next.js 14.

## Structure du dépôt
- `db/` — scripts SQL: schéma, contraintes, RLS, seeds et migrations
- `web/` — application Next.js 14 (Routes Handlers API, Auth Supabase, UI minimale)
- `CDC.md` — cahier des charges produit (POC)
- `DEVBOOK.md` — plan d’implémentation et checklist technique

## Prérequis
- PostgreSQL via Supabase (recommandé)
- Node.js 18+
- Git

## Mise en place — Base de données (Supabase)
1) Ouvrir l’éditeur SQL Supabase (ou utiliser `psql`)
2) Appliquer les scripts dans l’ordre suivant:

Obligatoires
```sql
-- Schéma de base + RLS + vue BI
-- (crée: employees, clients, projects, tasks, plan_items, day_checks, allocations,
--  variance_reasons, vw_time_entries, helpers RLS, etc.)
\i db/001_init.sql

-- Jeux de données minimaux (clients/projets/tâches). N’insère PAS d’employés.
\i db/002_seed.sql

-- Affectation simple des salariés aux projets (remplace les anciens "teams")
\i db/007_project_employees.sql
```

Optionnels (selon votre historique)
```sql
-- Si vous avez déjà appliqué d’anciens scripts de "teams", nettoyez-les
\i db/008_drop_teams.sql

-- Si votre base contenait encore le rôle 'pm', alignez vers 'manager'
\i db/009_roles_alignment_manager.sql
```

Notes importantes
- Les seeds ne créent pas d’employés. Créez d’abord les utilisateurs via Supabase Auth, puis insérez dans `public.employees` (`employees.id = auth.users.id`).
- RLS activée: effectuez les lectures/écritures avec une session authentifiée.

## Mise en place — Application Web (Next.js)
1) Copier le template d’environnement et le compléter
```bash
cd web
copy .env.example .env.local    # Windows
# ou: cp .env.example .env.local
```

Variables attendues dans `.env.local`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only)
- `SETUP_TOKEN` (secret partagé pour sécuriser le bootstrap admin)
- `BOOTSTRAP_ENABLED` — mettre `true` uniquement pendant le bootstrap, laisser vide/omis sinon

2) Installer et lancer
```bash
npm install
npm run dev
```

3) Bootstrap Admin (temporaire et sécurisé)
- Le routeur de bootstrap est protégé par `BOOTSTRAP_ENABLED` (retourne 410 si désactivé)
- Étapes:
  - Mettre `BOOTSTRAP_ENABLED=true` dans `.env.local`
  - Fournir `SETUP_TOKEN` côté requête (voir `web/README.md` pour l’exemple curl)
  - Vérifier la création de l’admin
  - Désactiver immédiatement `BOOTSTRAP_ENABLED` et redémarrer le serveur
  - Sécurité: ROTATION des clés `SUPABASE_SERVICE_ROLE_KEY` et `SETUP_TOKEN` après l’opération

## Commandes utiles
- Appliquer les scripts via `psql`:
```bash
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/001_init.sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/002_seed.sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/007_project_employees.sql
# si besoin
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/008_drop_teams.sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/009_roles_alignment_manager.sql
```

## Sécurité & bonnes pratiques
- Ne commitez jamais `.env.local` (déjà ignoré par `.gitignore`).
- Ne laissez pas `BOOTSTRAP_ENABLED` activé hors procédure de bootstrap.
- Après tout bootstrap, ROTATION de `SUPABASE_SERVICE_ROLE_KEY` et de `SETUP_TOKEN`.

## Dépannage rapide
- Erreur SQL dans `009_roles_alignment_manager.sql`: assurez-vous d’utiliser la version corrigée (EXECUTE avec `$ddl$...$ddl$`) et Postgres ≥ 14 (Supabase: 15).
- RLS: si vous ne lisez rien, vérifiez que votre session JWT est authentifiée et que vos policies couvrent bien le cas d’usage (`public.has_role(array['admin','manager'])`).

## Liens
- `db/README.md` — détails scripts SQL et upgrade
- `web/README.md` — quick start de l’app web et flow de bootstrap
- `CDC.md` — attentes produit
- `DEVBOOK.md` — plan de dev et checklist

---

© 2025 DoWee — POC interne. Usage sous licence de l’organisation. 
