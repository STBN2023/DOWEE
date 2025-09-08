import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type ClientProfit = {
  client_id: string;
  code: string;
  name: string;
  projects_count: number;
  sold_total_ht: number;
  cost_total: number;
  margin: number;
  margin_pct: number | null;
};

export async function getClientsProfitability(): Promise<{ generated_at: string; clients: ClientProfit[] }> {
  const res = await supabase.functions.invoke("client-profitability", { body: { action: "overview" } });
  return unwrapFunction<{ generated_at: string; clients: ClientProfit[] }>(res);
}