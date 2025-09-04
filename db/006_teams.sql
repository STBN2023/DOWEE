-- DEPRECATED: Do NOT apply. Kept for historical reference only.
-- Use 007_project_employees.sql (and optionally 008_drop_teams.sql) instead.
-- Teams model: teams, team_members, project_teams with RLS
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);

create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  constraint team_members_pk primary key (team_id, employee_id)
);

create table if not exists public.project_teams (
  project_id uuid not null references public.projects(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  constraint project_teams_pk primary key (project_id, team_id)
);

-- RLS enable
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.project_teams enable row level security;

-- Policies
-- teams
drop policy if exists teams_read on public.teams;
create policy teams_read on public.teams
for select to authenticated using (true);
drop policy if exists teams_write on public.teams;
create policy teams_write on public.teams
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

-- team_members
drop policy if exists team_members_read on public.team_members;
create policy team_members_read on public.team_members
for select to authenticated using (true);
drop policy if exists team_members_write on public.team_members;
create policy team_members_write on public.team_members
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

-- project_teams
drop policy if exists project_teams_read on public.project_teams;
create policy project_teams_read on public.project_teams
for select to authenticated using (true);
drop policy if exists project_teams_write on public.project_teams;
create policy project_teams_write on public.project_teams
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));
