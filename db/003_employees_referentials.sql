-- DoWee - Employees referentials and fields (003_employees_referentials.sql)
-- Idempotent migration. Run in Supabase.

-- Agencies
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);
alter table public.agencies enable row level security;

-- Services
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);
alter table public.services enable row level security;

-- Functions (job functions)
create table if not exists public.functions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  active boolean not null default true
);
alter table public.functions enable row level security;

-- Employees additional fields
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='first_name'
  ) then
    alter table public.employees add column first_name text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='last_name'
  ) then
    alter table public.employees add column last_name text;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='agency_id'
  ) then
    alter table public.employees add column agency_id uuid references public.agencies(id) on delete set null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='service_id'
  ) then
    alter table public.employees add column service_id uuid references public.services(id) on delete set null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='function_id'
  ) then
    alter table public.employees add column function_id uuid references public.functions(id) on delete set null;
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='contract_start_date'
  ) then
    alter table public.employees add column contract_start_date date;
  end if;
end $$ language plpgsql;

-- Helpful indexes
create index if not exists employees_name_idx on public.employees (last_name, first_name);
create index if not exists employees_agency_idx on public.employees (agency_id);
create index if not exists employees_service_idx on public.employees (service_id);
create index if not exists employees_function_idx on public.employees (function_id);

-- Simple RLS: allow select to authenticated; write to admin/manager via has_role
drop policy if exists agencies_read on public.agencies;
create policy agencies_read on public.agencies for select to authenticated using (true);
drop policy if exists agencies_write on public.agencies;
create policy agencies_write on public.agencies for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

drop policy if exists services_read on public.services;
create policy services_read on public.services for select to authenticated using (true);
drop policy if exists services_write on public.services;
create policy services_write on public.services for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));

drop policy if exists functions_read on public.functions;
create policy functions_read on public.functions for select to authenticated using (true);
drop policy if exists functions_write on public.functions;
create policy functions_write on public.functions for all to authenticated using (public.has_role(array['admin','manager'])) with check (public.has_role(array['admin','manager']));
