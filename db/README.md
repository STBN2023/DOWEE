# DoWee DB Scripts

These SQL files set up the database schema, RLS policies, and a minimal catalog seed for the DoWee POC.

- 001_init.sql — schema + constraints + view `vw_time_entries` + RLS + policies
- 002_seed.sql — minimal, idempotent sample data (clients, projects, tasks)
- 006_teams.sql — DEPRECATED, do not apply (replaced by direct employee assignments)
- 007_project_employees.sql — simple assignment of employees to projects (with `role`) + RLS
- 008_drop_teams.sql — removes deprecated `teams`, `team_members`, `project_teams`
- 009_roles_alignment_manager.sql — idempotent migration to align old role `pm` to `manager` and update legacy policies/constraints

## How to apply in Supabase

Option A — SQL Editor (recommended for POC)
1. Open Supabase project > SQL Editor
2. Paste contents of `db/001_init.sql` and run
3. Paste contents of `db/002_seed.sql` and run
4. Paste contents of `db/007_project_employees.sql` and run
5. If you previously applied teams tables, paste `db/008_drop_teams.sql` and run to clean them up

Option B — psql (if you have a direct connection string)
```sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/001_init.sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/002_seed.sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/007_project_employees.sql
# Only if teams were previously applied
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/008_drop_teams.sql
```

### Upgrading an existing database that used role 'pm'
- If your environment was initialized before the role rename, run `db/009_roles_alignment_manager.sql` to migrate existing data and policies.
- This migration is idempotent and safe to run multiple times.

Upgrade via SQL Editor (Supabase):
1. Open SQL Editor
2. Paste contents of `db/009_roles_alignment_manager.sql`
3. Run

Upgrade via psql:
```sql
psql "<SUPABASE_DB_URL>" -v ON_ERROR_STOP=1 -f db/009_roles_alignment_manager.sql
```

Notes
- `employees.id` references `auth.users(id)`. Seed does not create employees; create users via Supabase Auth, then add rows to `public.employees`.
- RLS is enabled. Use an authenticated session to read/write user-scoped tables.
- `projects.code` must match: `^[A-Z0-9]{2,8}-[0-9]{4}-[0-9]{3}$`.

### Resources assignment (projects ⇄ employees)
- Use table `public.project_employees(project_id uuid, employee_id uuid, role text)` for assigning resources to projects.
- RLS allows reads for any authenticated user, and writes for roles `admin` and `manager` via `public.has_role(array['admin','manager'])`.
- UI: Admin > Projets > bouton "Ressources" ouvre une modale avec glisser-déposer + édition du champ rôle par salarié.

### Deprecated: teams
- The teams model (`teams`, `team_members`, `project_teams`) has been deprecated in favor of simple employee assignment.
- Do NOT run `db/006_teams.sql` on new environments.
- If previously applied, run `db/008_drop_teams.sql` to remove the deprecated tables.

## Admin bootstrap
See `DEVBOOK.md` > "Bootstrap Admin (Front + API)" for the secured front/API flow to create the first admin.

Manual SQL fallback (after creating a user in Supabase Auth):
```sql
insert into public.employees (id, email, display_name, role)
select u.id, u.email, 'Admin', 'admin'
from auth.users u
where u.email = 'admin@exemple.test'
  and not exists (select 1 from public.employees e where e.id = u.id);
