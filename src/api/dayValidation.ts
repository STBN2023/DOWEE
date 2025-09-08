import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type DayStatus = {
  d: string;
  validated: boolean;
  plannedCount: number;
  actualCount: number;
  canSuggestCopy: boolean;
};

export async function getDayStatus(dIso: string): Promise<DayStatus> {
  const res = await supabase.functions.invoke("day-validation", { body: { action: "status", d: dIso } });
  return unwrapFunction<DayStatus>(res);
}

export async function confirmDay(dIso: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("day-validation", { body: { action: "confirm", d: dIso } });
  return unwrapFunction<{ ok: true }>(res);
}