import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type ProjectProfit = {
  project_id: string;
  code: string;
  name: string;
  client: { id: string; code: string; name: string } | null;
  sold_ht: number;
  cost_realized: number;
  margin: number;
  margin_pct: number | null;
};

export async function getProjectsProfitability(params?: { client_id?: string }): Promise<{ generated_at: string; projects: ProjectProfit[] }> {
  const body: any = { action: "overview" };
  if (params?.client_id) body.client_id = params.client_id;
  const res = await supabase.functions.invoke("project-profitability", { body });
  return unwrapFunction<{ generated_at: string; projects: ProjectProfit[] }>(res);
}