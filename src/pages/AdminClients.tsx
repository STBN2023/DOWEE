import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showError, showSuccess } from "@/utils/toast";
import { createClient, listClients, type Client } from "@/api/adminClients";
import { useAuth } from "@/context/AuthContext";

const AdminClients = () => {
  const { loading: authLoading, employee } = useAuth();
  const [form, setForm] = React.useState({ code: "", name: "" });
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [clients, setClients] = React.useState<Client[]>([]);

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await listClients();
      setClients(data);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement des clients.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (authLoading || !employee) {
      setLoading(true);
      return;
    }
    refresh();
  }, [authLoading, employee]);

  const submit = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) return;
    try {
      await createClient({ code, name });
      showSuccess("Client créé.");
      setForm({ code: "", name: "" });
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Création impossible.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Clients — Gestion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="grid gap-2">
              <Label>Code client</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="Ex: ACME"
              />
            </div>
            <div className="grid gap-2 md:col-span-2">
              <Label>Nom</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: ACME Corp."
              />
            </div>
          </div>
          <div>
            <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={submit}>
              Créer le client
            </Button>
          </div>

          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <div className="overflow-x-auto rounded-md border border-[#BFBFBF] bg-white">
            <table className="w-full border-collapse">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Code</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Nom</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Créé le</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-sm text-[#214A33]/60">Chargement…</td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-sm text-[#214A33]/60">Aucun client pour le moment.</td>
                  </tr>
                ) : (
                  clients.map((c) => (
                    <tr key={c.id} className="border-t border-[#BFBFBF]">
                      <td className="p-2 text-sm">{c.code}</td>
                      <td className="p-2 text-sm">{c.name}</td>
                      <td className="p-2 text-sm">{c.created_at ? new Date(c.created_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClients;