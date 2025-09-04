-- DoWee - Minimal seed data (002_seed.sql)
-- Safe to re-run: uses WHERE NOT EXISTS patterns

-- Clients
insert into public.clients (id, name, contact_email)
select gen_random_uuid(), 'Acme Corp', 'ops@acme.test'
where not exists (
  select 1 from public.clients where name = 'Acme Corp'
);

insert into public.clients (id, name, contact_email)
select gen_random_uuid(), 'Globex', 'contact@globex.test'
where not exists (
  select 1 from public.clients where name = 'Globex'
);

-- Projects
insert into public.projects (id, code, name, client_id, owner_id, status)
select gen_random_uuid(), 'ACME-2025-001', 'Acme Website Revamp', c.id, null, 'active'
from public.clients c
where c.name = 'Acme Corp'
and not exists (
  select 1 from public.projects p where p.code = 'ACME-2025-001'
);

insert into public.projects (id, code, name, client_id, owner_id, status)
select gen_random_uuid(), 'GLOBEX-2025-001', 'Globex Mobile App', c.id, null, 'active'
from public.clients c
where c.name = 'Globex'
and not exists (
  select 1 from public.projects p where p.code = 'GLOBEX-2025-001'
);

-- Tasks
insert into public.tasks (id, project_id, title, priority, estimate_minutes, assignee_id, status)
select gen_random_uuid(), p.id, 'Design wireframes', 'med', 240, null, 'todo'
from public.projects p
where p.code = 'ACME-2025-001'
and not exists (
  select 1 from public.tasks t where t.project_id = p.id and t.title = 'Design wireframes'
);

insert into public.tasks (id, project_id, title, priority, estimate_minutes, assignee_id, status)
select gen_random_uuid(), p.id, 'API groundwork', 'high', 360, null, 'todo'
from public.projects p
where p.code = 'GLOBEX-2025-001'
and not exists (
  select 1 from public.tasks t where t.project_id = p.id and t.title = 'API groundwork'
);
