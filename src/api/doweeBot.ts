import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type ChatResponse = {
  answer: string;
  citations: Array<{ section: string | null; snippet: string }>;
};

export async function doweeChat(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>
): Promise<ChatResponse> {
  const res = await supabase.functions.invoke("dowee-chat", { body: { messages } });
  return unwrapFunction<ChatResponse>(res);
}

export async function submitFeedback(input: {
  type: "bug" | "suggestion";
  title: string;
  description: string;
  severity?: string;
  impact?: string;
  page_url?: string;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("dowee-feedback", { body: input });
  return unwrapFunction<{ ok: true }>(res);
}

export async function kbIndex(params: {
  text: string;
  name?: string;
  version?: string;
  activate?: boolean;
  chunkSize?: number;
  overlap?: number;
}): Promise<{ ok: true; document_id: string; chunks: number }> {
  const res = await supabase.functions.invoke("kb-index", { body: params });
  return unwrapFunction<{ ok: true; document_id: string; chunks: number }>(res);
}

export async function kbListDocs(): Promise<{
  documents: Array<{ id: string; name: string; version: string; active: boolean; chunks_count: number; created_at: string }>;
}> {
  const res = await supabase.functions.invoke("kb-list-docs", { body: { action: "list" } });
  return unwrapFunction<{
    documents: Array<{ id: string; name: string; version: string; active: boolean; chunks_count: number; created_at: string }>;
  }>(res);
}

export async function kbActivate(document_id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("kb-list-docs", { body: { action: "activate", document_id } });
  return unwrapFunction<{ ok: true }>(res);
}