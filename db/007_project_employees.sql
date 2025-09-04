-- Simple assignment of employees to projects (director assigns resources)
create table if not exists public.project_employees (
  project_id uuid not null references public.projects(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  role text,
  constraint project_employees_pk primary key (project_id, employee_id)
);

alter table public.project_employees enable row level security;

-- Policies: everyone authenticated can read; only admin/manager can modify
drop policy if exists project_employees_read on public.project_employees;
create policy project_employees_read on public.project_employees
for select to authenticated using (true);

drop policy if exists project_employees_write on public.project_employees;
create policy project_employees_write on public.project_employees
for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));
