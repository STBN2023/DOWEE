import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type AlertItem = {
  id: string;
  project: { id: string; code: string; name: string };
  type: "deadline" | "budget_days" | "margin";
  severity: "critical" | "warning" | "info";
  short: string;
  source: "rule";
  meta?: Record<string, number | string | null>;
};

export type AlertsResponse = { items: AlertItem[] };

export async function getAlerts(scope: "me" | "team" | "global", limit = 20): Promise<AlertsResponse> {
  // Try LLM-enhanced first
  try {
    const res = await supabase.functions.invoke("alerts-ticker-llm", { body: { action: "list", scope, limit } });
    return unwrapFunction<AlertsResponse>(res);
  } catch {
    // Fallback to raw rules
    const res = await supabase.functions.invoke("alerts-ticker", { body: { action: "list", scope, limit } });
    return unwrapFunction<AlertsResponse>(res);
  }
}