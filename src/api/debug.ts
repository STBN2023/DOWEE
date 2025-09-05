import { supabase } from "@/integrations/supabase/client";

export type DebugSession = { id: string; email: string | null };

export async function getDebugSession(): Promise<DebugSession> {
  const { data, error } = await supabase.functions.invoke("debug-session", {
    body: { action: "whoami" },
  });
  if (error) throw error;
  return data as DebugSession;
}