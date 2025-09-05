import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";

const AdminReferences = () => {
  const [items, setItems] = React.useState<string[]>([]);
  const [label, setLabel] = React.useState("");

  const add = () => {
    const v = label.trim();
    if (!v) return;
    setItems((arr) => [...arr, v]);
    setLabel("");
    showSuccess("Référence ajoutée (simulation).");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Références — Ajouts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Libellé</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex: équipe 'créa', catégorie 'UX'" />
          </div>
          <div className="pt-2">
            <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={add}>
              Ajouter
            </Button>
          </div>
          {items.length > 0 && (
            <div className="mt-2 rounded-md border border-[#BFBFBF] bg-white p-3">
              <div className="text-sm font-medium text-[#214A33]">Références locales</div>
              <ul className="mt-2 list-disc pl-5 text-sm text-[#214A33]/80">
                {items.map((it, i) => (
                  <li key={`${it}-${i}`}>{it}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-[#214A33]/60">
            Note: stockage local pour l’instant; intégration serveur possible ensuite.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminReferences;