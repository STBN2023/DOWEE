import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type Employee = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  role?: "admin" | "manager" | "user";
  team?: string | null;
  updated_at?: string | null;
};

export async function listEmployees(): Promise<Employee[]> {
  const res = await supabase.functions.invoke("admin-employees", { body: { action: "list" } });
  const data = unwrapFunction<{ employees: Employee[] }>(res);
  return data.employees;
}

export async function createEmployee(input: {
  id: string;
  display_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  role?: "admin" | "manager" | "user";
  team?: string | null;
}): Promise<Employee> {
  const res = await supabase.functions.invoke("admin-employees", { body: { action: "create", employee: input } });
  const data = unwrapFunction<{ employee: Employee }>(res);
  return data.employee;
}

export async function updateEmployee(employee_id: string, patch: Partial<{
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  role: "admin" | "manager" | "user";
  team: string | null;
}>): Promise<Employee> {
  const res = await supabase.functions.invoke("admin-employees", { body: { action: "update", employee_id, patch } });
  const data = unwrapFunction<{ employee: Employee }>(res);
  return data.employee;
}

export async function deleteEmployee(employee_id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-employees", { body: { action: "delete", employee_id } });
  return unwrapFunction<{ ok: true }>(res);
}