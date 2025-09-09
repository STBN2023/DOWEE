import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type InternalCost = {
  id: string;
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
  effective_from?: string | null;
  created_at?: string;
};

export async function listInternalCosts(): Promise<InternalCost[]> {
  const res = await supabase.functions.invoke("admin-internal-costs", { body: { action: "list" } });
  const data = unwrapFunction<{ costs: InternalCost[] }>(res);
  return data.costs;
}

export async function createInternalCost(input: {
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
  effective_from?: string | null;
}): Promise<InternalCost> {
  const res = await supabase.functions.invoke("admin-internal-costs", { body: { action: "create", cost: input } });
  const data = unwrapFunction<{ cost: InternalCost }>(res);
  return data.cost;
}

export async function updateInternalCost(id: string, patch: Partial<{
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
  effective_from: string | null;
}>): Promise<InternalCost> {
  const res = await supabase.functions.invoke("admin-internal-costs", { body: { action: "update", id, patch } });
  const data = unwrapFunction<{ cost: InternalCost }>(res);
  return data.cost;
}

export async function deleteInternalCost(id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-internal-costs", { body: { action: "delete", id } });
  return unwrapFunction<{ ok: true }>(res);
}