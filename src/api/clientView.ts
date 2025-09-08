import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type ClientView = {
  project: {
    id: string;
    code: string;
    name: string;
    client: { id: string; code: string; name: string } | null;
    quote_amount: number | null;
    budgets: { conception: number | null; crea: number | null; dev: number | null };
    tariff: { id: string; label: string; rate_conception: number; rate_crea: number; rate_dev: number } | null;
  };
  sold: { total_ht: number | null; by_section: { conception: number | null; crea: number | null; dev: number | null } };
  realized: {
    total_hours: number;
    total_cost: number;
    by_section: {
      conception: { hours: number; cost: number };
      crea: { hours: number; cost: number };
      dev: { hours: number; cost: number };
    };
  };
  team: {
    members: Array<{ id: string; name: string; team: string | null; hours: number }>;
    totals: { conception: number; crea: number; dev: number; total: number };
  };
  weekly: {
    year: number;
    weeks: Array<{ week: number; month: number; hours: number }>;
    monthlyTotals: Array<{ month: number; hours: number }>;
  };
};

export async function getClientView(project_id: string, year?: number): Promise<ClientView> {
  const res = await supabase.functions.invoke("client-view", {
    body: { action: "overview", project_id, ...(year ? { year } : {}) },
  });
  return unwrapFunction<ClientView>(res);
}