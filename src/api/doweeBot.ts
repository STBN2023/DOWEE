import { supabase } from "@/integrations/supabase/client";

export async function doweeChat(messages: Array<{ role: "user"|"assistant"|"system"; content: string }>): Promise<{ answer: string; citations: Array<{ section: string | null; snippet: string }> }> {
  const res = await supabase.functions.invoke("dowee-chat", { body: { messages } });
  if (res.error) throw res.error;
  return res.data as any;
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
  if (res.error) throw res.error;
  return res.data as any;
}

export async function kbIndex(params: { text: string; name?: string; version?: string; activate?: boolean; chunkSize?: number; overlap?: number }): Promise<{ ok: true; document_id: string; chunks: number }> {
  const res = await supabase.functions.invoke("kb-index", { body: params });
  if (res.error) throw res.error;
  return res.data as any;
}

export async function kbListDocs(): Promise<{ documents: Array<{ id: string; name: string; version: string; active: boolean; chunks_count: number; created_at: string }> }> {
  const res = await supabase.functions.invoke("kb-list-docs", { body: { action: "list" } });
  if (res.error) throw res.error;
  return res.data as any;
}

export async function kbActivate(document_id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("kb-list-docs", { body: { action: "activate", document_id } });
  if (res.error) throw res.error;
  return res.data as any;
}