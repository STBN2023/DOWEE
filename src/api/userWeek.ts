import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { unwrapFunction } from "@/api/edge";

export type PlanDTO = { id: string; d: string; hour: number; project_id: string; planned_minutes: number; note: string | null };
export type WeekResponse = {
  range: { start: string; end: string };
  plans: PlanDTO[];
  projects: { id: string; code: string; name: string; status: string }[];
};

export async function getUserWeek(startDate: Date): Promise<WeekResponse> {
  const startIso = format(startDate, "yyyy-MM-dd");
  const res = await supabase.functions.invoke("user-week", {
    body: { action: "get", start: startIso },
  });
  return unwrapFunction<WeekResponse>(res);
}

export async function patchUserWeek(payload: {
  upserts?: Array<{ d: string; hour: number; project_id: string; planned_minutes?: number; note?: string | null }>;
  deletes?: Array<{ id?: string; d?: string; hour?: number }>;
}): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("user-week", {
    body: { action: "patch", ...payload },
  });
  return unwrapFunction<{ ok: true }>(res);
}