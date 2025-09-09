import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type LlmStatus = { configured: boolean; provider: string | null; updated_at?: string | null };

export async function getLlmStatus(): Promise<LlmStatus> {
  const res = await supabase.functions.invoke("admin-llm", { body: { action: "status" } });
  return unwrapFunction<LlmStatus>(res);
}

export async function setOpenAIKey(api_key: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-llm", { body: { action: "set", provider: "openai", api_key } });
  return unwrapFunction<{ ok: true }>(res);
}

export async function clearLlmKey(): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-llm", { body: { action: "clear" } });
  return unwrapFunction<{ ok: true }>(res);
}