import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

const AdminClients = () => {
  const [form, setForm] = React.useState({ code: "", name: "" });

  const submit = () => {
    if (!form.code.trim() || !form.name.trim()) return;
    showSuccess("Client — création simulée (UI prête).");
    setForm({ code: "", name: "" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Clients — Création</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Code client</Label>
            <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="Ex: ACME" />
          </div>
          <div className="grid gap-2">
            <Label>Nom</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: ACME Corp." />
          </div>
          <div className="pt-2">
            <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={submit}>
              Créer le client
            </Button>
          </div>
          <p className="text-xs text-[#214A33]/60">
            Note: branchement base de données possible ensuite (Supabase).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClients;