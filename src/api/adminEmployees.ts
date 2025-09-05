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
  const res = await supabase.functions.invoke("admin-employees", {
    body: { action: "list" },
  });
  const data = unwrapFunction<{ employees: Employee[] }>(res);
  return data.employees;
}