-- Deprecation migration: remove teams model in favor of direct employee assignments
-- Run this AFTER ensuring no data is needed from teams/team_members/project_teams.

-- Safety: wrap in a transaction
begin;

-- Drop project_teams first due to FK dependencies
drop table if exists public.project_teams cascade;
-- Drop team_members
drop table if exists public.team_members cascade;
-- Drop teams
drop table if exists public.teams cascade;

commit;
