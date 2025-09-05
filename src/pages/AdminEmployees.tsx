import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

const AdminEmployees = () => {
  const [form, setForm] = React.useState({
    first_name: "",
    last_name: "",
    display_name: "",
    email: "",
  });

  const submit = () => {
    if (!form.first_name || !form.last_name || !form.email) return;
    showSuccess("Profil salarié — création simulée (UI prête).");
    setForm({ first_name: "", last_name: "", display_name: "", email: "" });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Profils salariés — Création rapide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label>Prénom</Label>
              <Input value={form.first_name} onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Nom</Label>
              <Input value={form.last_name} onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Nom d’affichage (optionnel)</Label>
            <Input value={form.display_name} onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))} />
          </div>
          <div className="grid gap-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="pt-2">
            <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={submit}>
              Créer le profil
            </Button>
          </div>
          <p className="text-xs text-[#214A33]/60">
            Note: cette page gère l’UI; le branchement Supabase pourra être ajouté ultérieurement.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmployees;