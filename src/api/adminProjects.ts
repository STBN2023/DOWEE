import { supabase } from "@/integrations/supabase/client";

export type Status = "active" | "onhold" | "archived";

export type Employee = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  status: Status;
};

export type Assignments = Record<string, string[]>;

export async function listAdminProjects(): Promise<{
  employees: Employee[];
  projects: Project[];
  assignments: Assignments;
}> {
  const { data, error } = await supabase.functions.invoke("admin-projects", {
    body: { action: "list" },
  });
  if (error) throw error;
  return data as { employees: Employee[]; projects: Project[]; assignments: Assignments };
}

export async function createProject(input: { code: string; name: string; status: Status }): Promise<Project> {
  const { data, error } = await supabase.functions.invoke("admin-projects", {
    body: { action: "create", project: input },
  });
  if (error) throw error;
  return (data as any).project as Project;
}

export async function setProjectAssignments(project_id: string, employee_ids: string[]): Promise<{ ok: true }> {
  const { data, error } = await supabase.functions.invoke("admin-projects", {
    body: { action: "assign", project_id, employee_ids },
  });
  if (error) throw error;
  return data as { ok: true };
}