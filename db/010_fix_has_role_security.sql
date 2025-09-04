-- DoWee - 010_fix_has_role_security.sql
-- Corrige la récursion RLS: public.has_role() devient SECURITY DEFINER
-- Effet: la fonction lit public.employees en tant que propriétaire, contournant les policies,
-- ce qui évite l’appel récursif (has_role -> employees policy -> has_role ...).

-- Recommandé: exécuter avec un rôle propriétaire du schéma public et des tables concernées.
-- Supabase: exécuter dans SQL Editor avec permissions d’admin.

create or replace function public.has_role(roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.employees e
    where e.id = auth.uid()
      and e.active
      and e.role = any(roles)
  );
$$;

-- Donner le droit d’exécution à tous les utilisateurs authentifiés
grant execute on function public.has_role(text[]) to authenticated;

-- Optionnel: vérifier que FORCE RLS n'est pas activé sur employees (par défaut non)
-- Si activé, la fonction SECURITY DEFINER ne bypassera pas la RLS.
-- alter table public.employees no force row level security;
