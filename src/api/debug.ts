import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type DebugSession = { id: string; email: string | null };

export async function getDebugSession(): Promise<DebugSession> {
  const res = await supabase.functions.invoke("debug-session", {
    body: { action: "whoami" },
  });
  return unwrapFunction<DebugSession>(res);
}