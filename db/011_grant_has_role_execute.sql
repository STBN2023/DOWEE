-- DoWee - 011_grant_has_role_execute.sql
-- Assure les droits d'exécution sur public.has_role(text[]) pour tous les rôles nécessaires.
-- Idempotent (GRANT est sans effet s'il existe déjà).

grant execute on function public.has_role(text[]) to authenticated;
grant execute on function public.has_role(text[]) to anon;
grant execute on function public.has_role(text[]) to service_role;
