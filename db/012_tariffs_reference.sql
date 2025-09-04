-- 012_tariffs_reference.sql
-- Table des tarifs journaliers/horaires de référence
-- Objectif: stocker des tarifs publics de référence (EUR) pour catégories/types de prestations
-- Sécurité: RLS activé. Lecture pour tout utilisateur authentifié. Écriture limitée à admin/manager via public.has_role.

-- Dépendances:
--  - Fonction public.has_role(text[]) (010)
--  - GRANT EXECUTE sur public.has_role (011)

begin;

-- Table
create table if not exists public.tariffs_reference (
  id uuid primary key default gen_random_uuid(),
  name text not null unique, -- ex: Conception / Gestion de projet, Créa, Dev
  daily_rate numeric(10,2) not null, -- en EUR par jour
  hourly_rate numeric(10,2) not null, -- en EUR par heure
  currency text not null default 'EUR',
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_tariffs_reference_updated_at on public.tariffs_reference;
create trigger trg_tariffs_reference_updated_at
before update on public.tariffs_reference
for each row execute function public.set_updated_at();

-- RLS
alter table public.tariffs_reference enable row level security;

-- Lecture: tout utilisateur authentifié
create policy if not exists tariffs_ref_select_authenticated
on public.tariffs_reference for select
using ( auth.role() = 'authenticated' );

-- Écriture: admin/manager via has_role
create policy if not exists tariffs_ref_modify_admin_manager
on public.tariffs_reference for all
using ( public.has_role(array['admin','manager']::text[]) )
with check ( public.has_role(array['admin','manager']::text[]) );

-- Seed idempotent
insert into public.tariffs_reference as t (name, daily_rate, hourly_rate, currency, active)
values
  ('Conception / Gestion de projet', 1000.00, 133.00, 'EUR', true),
  ('Créa', 800.00, 106.00, 'EUR', true),
  ('Dev', 800.00, 106.00, 'EUR', true)
on conflict (name) do update set
  daily_rate = excluded.daily_rate,
  hourly_rate = excluded.hourly_rate,
  currency = excluded.currency,
  active = excluded.active,
  updated_at = now();

commit;
