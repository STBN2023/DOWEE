import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type Tariff = {
  id: string;
  label: string;
  rate_conception: number;
  rate_crea: number;
  rate_dev: number;
  created_at?: string;
};

export async function listTariffs(): Promise<Tariff[]> {
  const res = await supabase.functions.invoke("admin-tariffs", { body: { action: "list" } });
  const data = unwrapFunction<{ tariffs: Tariff[] }>(res);
  return data.tariffs;
}

export async function createTariff(input: { label: string; rate_conception: number; rate_crea: number; rate_dev: number }): Promise<Tariff> {
  const res = await supabase.functions.invoke("admin-tariffs", { body: { action: "create", tariff: input } });
  const data = unwrapFunction<{ tariff: Tariff }>(res);
  return data.tariff;
}

export async function updateTariff(tariff_id: string, patch: Partial<{ label: string; rate_conception: number; rate_crea: number; rate_dev: number }>): Promise<Tariff> {
  const res = await supabase.functions.invoke("admin-tariffs", { body: { action: "update", tariff_id, patch } });
  const data = unwrapFunction<{ tariff: Tariff }>(res);
  return data.tariff;
}

export async function deleteTariff(tariff_id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-tariffs", { body: { action: "delete", tariff_id } });
  return unwrapFunction<{ ok: true }>(res);
}