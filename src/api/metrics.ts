import { supabase } from "@/integrations/supabase/client";

export type MetricsOverview = {
  global: { nb_projects_total: number; nb_projects_active: number; nb_projects_onhold: number };
  byTeam: { team: "commercial" | "créa" | "dev"; nb_projects_active_distinct: number }[];
  me: { nb_projects_mine: number };
};

export async function getMetricsOverview(): Promise<MetricsOverview> {
  const { data, error } = await supabase.functions.invoke("metrics-overview", {
    body: { action: "overview" },
  });
  if (error) throw error;
  return data as MetricsOverview;
}