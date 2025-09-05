import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type Client = {
  id: string;
  code: string;
  name: string;
  created_at?: string;
};

export async function listClients(): Promise<Client[]> {
  const res = await supabase.functions.invoke("admin-clients", { body: { action: "list" } });
  const data = unwrapFunction<{ clients: Client[] }>(res);
  return data.clients;
}

export async function createClient(input: { code: string; name: string }): Promise<Client> {
  const res = await supabase.functions.invoke("admin-clients", { body: { action: "create", client: input } });
  const data = unwrapFunction<{ client: Client }>(res);
  return data.client;
}

export async function updateClient(client_id: string, patch: Partial<{ code: string; name: string }>): Promise<Client> {
  const res = await supabase.functions.invoke("admin-clients", { body: { action: "update", client_id, patch } });
  const data = unwrapFunction<{ client: Client }>(res);
  return data.client;
}

export async function deleteClient(client_id: string): Promise<{ ok: true }> {
  const res = await supabase.functions.invoke("admin-clients", { body: { action: "delete", client_id } });
  return unwrapFunction<{ ok: true }>(res);
}