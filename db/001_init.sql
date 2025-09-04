-- DoWee - Initial schema, views, and RLS policies (001_init.sql)
-- Run in Supabase (Postgres 15+). Idempotent where possible.

-- Extensions
create extension if not exists pgcrypto;

-- Employees (profile linked to auth.users)
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

-- Projects
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  client_id uuid not null references public.clients(id) on delete restrict,
  owner_id uuid references public.employees(id) on delete set null,
  status text not null default 'active' check (status in ('active','onhold','archived'))
);

-- Tasks
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

-- Day plan (forecast)
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

-- Day check-in/out
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

-- Actual allocations (source of truth for time)
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

-- Variance reasons
create table if not exists public.variance_reasons (
  id uuid primary key default gen_random_uuid(),
  day_check_id uuid not null references public.day_checks(id) on delete cascade,
  reason text not null check (reason in ('Urgence client','Dépendance bloquée','Réunion imprévue','Changement de priorité','Autre')),
  details text
);

-- Constraints & BI view
do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class t on t.oid = c.conrelid
    join pg_namespace n on n.oid = t.relnamespace
    where c.conname = 'projects_code_format'
      and n.nspname = 'public'
  ) then
    alter table public.projects
      add constraint projects_code_format
      check (code ~ '^[A-Z0-9]{2,8}-[0-9]{4}-[0-9]{3}$');
  end if;
end $$ language plpgsql;

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

-- RLS
alter table public.employees enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.plan_items enable row level security;
alter table public.day_checks enable row level security;
alter table public.allocations enable row level security;
alter table public.variance_reasons enable row level security;

-- Helper: check application role
create or replace function public.has_role(roles text[])
returns boolean language sql stable as $$
  select exists (
    select 1 from public.employees e
    where e.id = auth.uid() and e.active and e.role = any(roles)
  );
$$;

-- Policies
drop policy if exists employees_self_read on public.employees;
create policy employees_self_read on public.employees
for select to authenticated using (id = auth.uid());
drop policy if exists employees_admin_read_all on public.employees;
create policy employees_admin_read_all on public.employees
for select to authenticated using (public.has_role(array['admin']));

drop policy if exists clients_read on public.clients;
create policy clients_read on public.clients
for select to authenticated using (true);
drop policy if exists clients_write on public.clients;
create policy clients_write on public.clients
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

drop policy if exists projects_read on public.projects;
create policy projects_read on public.projects
for select to authenticated using (true);
drop policy if exists projects_write on public.projects;
create policy projects_write on public.projects
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

drop policy if exists tasks_read on public.tasks;
create policy tasks_read on public.tasks
for select to authenticated using (true);
drop policy if exists tasks_write on public.tasks;
create policy tasks_write on public.tasks
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

drop policy if exists plan_items_owner_select on public.plan_items;
create policy plan_items_owner_select on public.plan_items
for select to authenticated using (employee_id = auth.uid());
drop policy if exists plan_items_owner_write on public.plan_items;
create policy plan_items_owner_write on public.plan_items
for all to authenticated using (employee_id = auth.uid()) with check (employee_id = auth.uid());

drop policy if exists day_checks_owner_select on public.day_checks;
create policy day_checks_owner_select on public.day_checks
for select to authenticated using (employee_id = auth.uid());
drop policy if exists day_checks_owner_write on public.day_checks;
create policy day_checks_owner_write on public.day_checks
for all to authenticated using (employee_id = auth.uid()) with check (employee_id = auth.uid());

drop policy if exists allocations_owner_read on public.allocations;
create policy allocations_owner_read on public.allocations
for select to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);
drop policy if exists allocations_owner_write on public.allocations;
create policy allocations_owner_write on public.allocations
for all to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);

drop policy if exists variance_owner_read on public.variance_reasons;
create policy variance_owner_read on public.variance_reasons
for select to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);
drop policy if exists variance_owner_write on public.variance_reasons;
create policy variance_owner_write on public.variance_reasons
for all to authenticated using (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.day_checks dc where dc.id = day_check_id and dc.employee_id = auth.uid()
  )
);
