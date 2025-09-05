import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type Status = "active" | "onhold" | "archived";

export type Employee = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
};

export type Client = {
  id: string;
  code: string;
  name: string;
};

export type Tariff = {
  id: string;
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
};

export type Project = {
  id: string;
  code: string;
  name: string;
  status: Status;
  client_id: string | null;
  tariff_id: string | null;
  quote_amount: number | null;
};

export type Assignments = Record<string, string[]>;

export async function listAdminProjects(): Promise<{
  employees: Employee[];
  projects: Project[];
  assignments: Assignments;
  clients: Client[];
  tariffs: Tariff[];
}> {
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "list" },
  });
  return unwrapFunction<{ employees: Employee[]; projects: Project[]; assignments: Assignments; clients: Client[]; tariffs: Tariff[] }>(res);
}

export async function createProject(input: {
  name: string;
  status: Status;
  client_id: string;
  tariff_id?: string | null;
  quote_amount?: number | null;
}): Promise<Project> {
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "create", project: input },
  });
  const data = unwrapFunction<{ project: Project }>(res);
  return data.project;
}

export async function updateProject(project_id: string, patch: Partial<{
  name: string;
  status: Status;
  client_id: string;
  tariff_id: string | null;
  quote_amount: number | null;
}>): Promise<Project> {
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

export async function deleteProject(project_id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-projects", {
    body: { action: "delete", project_id },
  });
  return unwrapFunction<{ ok: true }>(res);
}