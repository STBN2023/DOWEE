-- DoWee - 009_roles_alignment_manager.sql
-- Idempotent migration to align role name from 'pm' to 'manager'
-- Safe to run multiple times.

-- 0) Ensure roles table has 'manager'; optionally clean orphan 'pm'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='roles'
  ) THEN
    INSERT INTO public.roles (code, label)
    VALUES ('manager', 'Manager')
    ON CONFLICT (code) DO NOTHING;

    -- Remove 'pm' role if it exists and nobody references it
    IF EXISTS (SELECT 1 FROM public.roles WHERE code='pm') THEN
      IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema='public' AND table_name='employees'
      ) THEN
        IF NOT EXISTS (SELECT 1 FROM public.employees WHERE role='pm') THEN
          DELETE FROM public.roles WHERE code='pm';
        END IF;
      END IF;
    END IF;
  END IF;
END $$ LANGUAGE plpgsql;

-- 1) Update data: employees.role = 'manager' where = 'pm'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='employees' AND column_name='role'
  ) THEN
    UPDATE public.employees SET role='manager' WHERE role='pm';
  END IF;
END $$ LANGUAGE plpgsql;

-- 2) Fix CHECK constraint on employees.role if it still mentions 'pm'
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='employees'
  ) THEN
    FOR r IN
      SELECT tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON cc.constraint_schema = tc.constraint_schema
       AND cc.constraint_name  = tc.constraint_name
      WHERE tc.table_schema='public'
        AND tc.table_name='employees'
        AND tc.constraint_type='CHECK'
        AND cc.check_clause ILIKE '%''pm''%'
    LOOP
      EXECUTE format('ALTER TABLE public.employees DROP CONSTRAINT %I', r.constraint_name);
    END LOOP;

    -- Ensure a CHECK exists that allows 'manager'
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON cc.constraint_schema = tc.constraint_schema
       AND cc.constraint_name  = tc.constraint_name
      WHERE tc.table_schema='public'
        AND tc.table_name='employees'
        AND cc.check_clause ILIKE '%''manager''%'
    ) THEN
      BEGIN
        ALTER TABLE public.employees
          ADD CONSTRAINT employees_role_check
          CHECK (role IN ('admin','manager','user'));
      EXCEPTION WHEN duplicate_object THEN
        NULL;
      END;
    END IF;
  END IF;
END $$ LANGUAGE plpgsql;

-- 3) Update RLS policies that still reference 'pm' -> 'manager'
-- Note: Postgres supports ALTER POLICY (v14+). We only update if the policy exists.
DO $$
BEGIN
  -- Helper function to test policy existence
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'clients' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clients' AND policyname='clients_write') THEN
      EXECUTE $ddl$ALTER POLICY clients_write ON public.clients USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'projects' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='projects' AND policyname='projects_write') THEN
      EXECUTE $ddl$ALTER POLICY projects_write ON public.projects USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'tasks' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND policyname='tasks_write') THEN
      EXECUTE $ddl$ALTER POLICY tasks_write ON public.tasks USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'agencies' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agencies' AND policyname='agencies_write') THEN
      EXECUTE $ddl$ALTER POLICY agencies_write ON public.agencies USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'services' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='services' AND policyname='services_write') THEN
      EXECUTE $ddl$ALTER POLICY services_write ON public.services USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'functions' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='functions' AND policyname='functions_write') THEN
      EXECUTE $ddl$ALTER POLICY functions_write ON public.functions USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_catalog.pg_class WHERE relname = 'project_employees' AND relnamespace = 'public'::regnamespace) THEN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='project_employees' AND policyname='project_employees_write') THEN
      EXECUTE $ddl$ALTER POLICY project_employees_write ON public.project_employees USING (public.has_role(ARRAY['admin','manager'])) WITH CHECK (public.has_role(ARRAY['admin','manager']))$ddl$;
    END IF;
  END IF;
END $$ LANGUAGE plpgsql;
