import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

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
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "list" },
  });
  return unwrapFunction<{ employees: Employee[]; projects: Project[]; assignments: Assignments }>(res);
}

export async function createProject(input: { code: string; name: string; status: Status }): Promise<Project> {
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "create", project: input },
  });
  const data = unwrapFunction<{ project: Project }>(res);
  return data.project;
}

export async function updateProject(project_id: string, patch: Partial<{ code: string; name: string; status: Status }>): Promise<Project> {
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "update", project_id, patch },
  });
  const data = unwrapFunction<{ project: Project }>(res);
  return data.project;
}

export async function setProjectAssignments(project_id: string, employee_ids: string[]): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "assign", project_id, employee_ids },
  });
  return unwrapFunction<{ ok: true }>(res);
}