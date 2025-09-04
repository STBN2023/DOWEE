-- DoWee - Roles and Service-Function linkage (004_roles_and_service_function_link.sql)
-- Idempotent migration. Run in Supabase.

-- 1) Roles table and FK from employees.role
create table if not exists public.roles (
  code text primary key,
  label text not null
);

-- Seed roles
insert into public.roles (code, label) values
  ('admin', 'Administrateur'),
  ('manager', 'Manager'),
  ('user', 'Utilisateur')
on conflict (code) do nothing;

-- Ensure employees.role references roles(code)
-- Create the column if not exists (should already exist), then add FK constraint if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='employees' and column_name='role'
  ) then
    alter table public.employees add column role text not null default 'user';
  end if;
  begin
    alter table public.employees
      add constraint employees_role_fk foreign key (role) references public.roles(code) on update cascade;
  exception when duplicate_object then
    -- constraint already exists
    null;
  end;
end $$ language plpgsql;

-- 2) Link functions to services
-- Add nullable service_id to functions and unique(name, service_id)
 do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='functions' and column_name='service_id'
  ) then
    alter table public.functions add column service_id uuid references public.services(id) on delete cascade;
  end if;
end $$ language plpgsql;

-- Adjust uniqueness: name per service
-- Drop previous unique on name if exists, then add unique on (service_id, name)
DO $$
BEGIN
  IF exists (
    select 1 from pg_indexes
    where schemaname='public' and tablename='functions' and indexname='functions_name_key'
  ) THEN
    -- The implicit unique index name may differ; attempt drop constraint instead
    BEGIN
      alter table public.functions drop constraint functions_name_key;
    EXCEPTION WHEN undefined_object THEN
      -- try drop index
      BEGIN
        drop index if exists public.functions_name_key;
      EXCEPTION WHEN undefined_object THEN null; END;
    END;
  END IF;
END $$;

-- Create unique constraint on (service_id, name)
DO $$
BEGIN
  BEGIN
    alter table public.functions add constraint functions_service_name_key unique (service_id, name);
  EXCEPTION WHEN duplicate_object THEN null; END;
END $$;

-- 3) Seed examples for services and functions under services
-- Services: Direction, Commercial, Artistique
insert into public.services (id, name, active)
select gen_random_uuid(), 'Direction', true
where not exists (select 1 from public.services where name='Direction');

insert into public.services (id, name, active)
select gen_random_uuid(), 'Commercial', true
where not exists (select 1 from public.services where name='Commercial');

insert into public.services (id, name, active)
select gen_random_uuid(), 'Artistique', true
where not exists (select 1 from public.services where name='Artistique');

-- Helper upsert function under a given service by name
create or replace function public.upsert_function_under_service(p_service text, p_function text)
returns uuid as $$
DECLARE
  v_service_id uuid;
  v_function_id uuid;
BEGIN
  select id into v_service_id from public.services where name = p_service limit 1;
  if v_service_id is null then
    insert into public.services(name, active) values (p_service, true) returning id into v_service_id;
  end if;

  select id into v_function_id from public.functions where service_id = v_service_id and name = p_function limit 1;
  if v_function_id is null then
    insert into public.functions(name, service_id, active) values (p_function, v_service_id, true) returning id into v_function_id;
  end if;

  return v_function_id;
END;
$$ language plpgsql security definer;

-- Seed sample functions
select public.upsert_function_under_service('Direction', 'Directeur');
select public.upsert_function_under_service('Direction', 'Manager');
select public.upsert_function_under_service('Commercial', 'Commercial');
select public.upsert_function_under_service('Commercial', 'Consultant');
select public.upsert_function_under_service('Artistique', 'Directeur Artistique');
select public.upsert_function_under_service('Artistique', 'Illustrateur');

-- 4) Keep RLS as defined previously: read for authenticated; write via has_role('admin','manager')
-- (No change needed here; refer to 003 migration)
