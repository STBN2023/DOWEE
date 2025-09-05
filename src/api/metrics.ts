import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type MetricsOverview = {
  global: { nb_projects_total: number; nb_projects_active: number; nb_projects_onhold: number };
  byTeam: { team: "commercial" | "créa" | "dev"; nb_projects_active_distinct: number }[];
  me: { nb_projects_mine: number };
};

export async function getMetricsOverview(): Promise<MetricsOverview> {
  const res = await supabase.functions.invoke("metrics-overview", {
    body: { action: "overview" },
  });
  return unwrapFunction<MetricsOverview>(res);
}