import { supabase } from "@/integrations/supabase/client";
import { unwrapFunction } from "@/api/edge";

export type Client = {
  id: string;
  code: string;
  name: string;
  created_at?: string;
};

export async function listClients(): Promise<Client[]> {
  const res = await supabase.functions.invoke("admin-clients", {
    body: { action: "list" },
  });
  const data = unwrapFunction<{ clients: Client[] }>(res);
  return data.clients;
}

export async function createClient(input: { code: string; name: string }): Promise<Client> {
  const res = await supabase.functions.invoke("admin-clients", {
    body: { action: "create", client: input },
  });
  const data = unwrapFunction<{ client: Client }>(res);
  return data.client;
}