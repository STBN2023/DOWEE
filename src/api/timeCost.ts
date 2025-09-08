import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type Agg = { hours_planned: number; hours_actual: number; cost_planned: number; cost_actual: number };
export type TimeCostOverview = {
  range: { start: string; end: string };
  global: Agg;
  byTeam: Array<{ team: "conception" | "créa" | "dev"; hours_planned: number; hours_actual: number; cost_planned: number; cost_actual: number }>;
  me: Agg;
};

export async function getTimeCostOverview(params?: { start?: string }): Promise<TimeCostOverview> {
  const res = await supabase.functions.invoke("time-cost-overview", {
    body: { action: "overview", ...(params?.start ? { start: params.start } : {}) },
  });
  return unwrapFunction<TimeCostOverview>(res);
}