import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type ProjectCostsMap = Record<string, { cost_planned: number; cost_actual: number }>;

export async function getProjectCosts(): Promise<ProjectCostsMap> {
  const res = await supabase.functions.invoke("project-costs", {
    body: { action: "overview" },
  });
  const data = unwrapFunction<{ costs: ProjectCostsMap }>(res);
  return data.costs;
}