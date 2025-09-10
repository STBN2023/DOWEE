import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type PortfolioView = {
  scope: "global" | "team" | "me";
  year: number;
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

type GlobalParams = { scope: "global"; year?: number };
type TeamParams = { scope: "team"; team: string; year?: number };
type MeParams = { scope: "me"; year?: number };
type PVParams = GlobalParams | TeamParams | MeParams;

export async function getPortfolioView(params: GlobalParams): Promise<PortfolioView>;
export async function getPortfolioView(params: TeamParams): Promise<PortfolioView>;
export async function getPortfolioView(params: MeParams): Promise<PortfolioView>;
export async function getPortfolioView(params: PVParams): Promise<PortfolioView> {
  const body: Record<string, unknown> = { action: "overview", scope: params.scope };
  if ("year" in params && typeof params.year === "number") {
    body.year = params.year;
  }
  if (params.scope === "team") {
    body.team = params.team;
  }
  const res = await supabase.functions.invoke("portfolio-view", { body });
  return unwrapFunction<PortfolioView>(res);
}