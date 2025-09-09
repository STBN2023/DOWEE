import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { listInternalCosts, createInternalCost, updateInternalCost, deleteInternalCost, type InternalCost } from "@/api/adminInternalCosts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}

const AdminInternalCosts: React.FC = () => {
  const { loading: authLoading, employee } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<InternalCost[]>([]);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState<{ label: string; conc: string; crea: string; dev: string; effective_from: string }>(
    { label: "", conc: "800", crea: "500", dev: "800", effective_from: "" }
  );

  const [editFor, setEditFor] = React.useState<InternalCost | null>(null);
  const [editForm, setEditForm] = React.useState<{ label: string; conc: string; crea: string; dev: string; effective_from: string }>(
    { label: "", conc: "", crea: "", dev: "", effective_from: "" }
  );

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await listInternalCosts();
      setRows(data);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement des coûts internes.");
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

  const openEdit = (r: InternalCost) => {
    setEditFor(r);
    setEditForm({
      label: r.label,
      conc: String(r.rate_conception),
      crea: String(r.rate_crea),
      dev: String(r.rate_dev),
      effective_from: r.effective_from ?? "",
    });
  };

  const submitCreate = async () => {
    const label = form.label.trim();
    const rate_conception = Number(form.conc.replace(",", "."));
    const rate_crea = Number(form.crea.replace(",", "."));
    const rate_dev = Number(form.dev.replace(",", "."));
    const effective_from = form.effective_from.trim() ? form.effective_from : null;
    if (!label || !isFinite(rate_conception) || !isFinite(rate_crea) || !isFinite(rate_dev)) {
      showError("Veuillez saisir un libellé et des montants valides.");
      return;
    }
    try {
      await createInternalCost({ label, rate_conception, rate_crea, rate_dev, effective_from });
      showSuccess("Coûts enregistrés.");
      setOpenCreate(false);
      setForm({ label: "", conc: "800", crea: "500", dev: "800", effective_from: "" });
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Création impossible.");
    }
  };

  const submitEdit = async () => {
    if (!editFor) return;
    const label = editForm.label.trim();
    const rate_conception = Number(editForm.conc.replace(",", "."));
    const rate_crea = Number(editForm.crea.replace(",", "."));
    const rate_dev = Number(editForm.dev.replace(",", "."));
    const effective_from = editForm.effective_from.trim() ? editForm.effective_from : null;
    if (!label || !isFinite(rate_conception) || !isFinite(rate_crea) || !isFinite(rate_dev)) {
      showError("Veuillez saisir un libellé et des montants valides.");
      return;
    }
    try {
      await updateInternalCost(editFor.id, { label, rate_conception, rate_crea, rate_dev, effective_from });
      showSuccess("Coûts mis à jour.");
      setEditFor(null);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Mise à jour impossible.");
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteInternalCost(id);
      showSuccess("Entrée supprimée.");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Suppression impossible.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[#214A33]">Coûts internes (€/jour)</CardTitle>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90">Nouvelle entrée</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouvelle entrée</DialogTitle>
                <DialogDescription>Définissez les coûts internes journaliers. La dernière entrée sera utilisée par défaut.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Libellé</Label>
                  <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex: Coûts 2025 T1" />
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Conception (€/j)</Label>
                    <Input inputMode="decimal" value={form.conc} onChange={(e) => setForm((f) => ({ ...f, conc: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Créa (€/j)</Label>
                    <Input inputMode="decimal" value={form.crea} onChange={(e) => setForm((f) => ({ ...f, crea: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Dev (€/j)</Label>
                    <Input inputMode="decimal" value={form.dev} onChange={(e) => setForm((f) => ({ ...f, dev: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Effectif à partir du</Label>
                  <Input type="date" value={form.effective_from} onChange={(e) => setForm((f) => ({ ...f, effective_from: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenCreate(false)}>Annuler</Button>
                <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={submitCreate}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {errorMsg && <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>}

          <div className="overflow-x-auto rounded-md border border-[#BFBFBF] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left font-semibold text-[#214A33]">Libellé</th>
                  <th className="p-2 text-right font-semibold text-[#214A33]">Conception</th>
                  <th className="p-2 text-right font-semibold text-[#214A33]">Créa</th>
                  <th className="p-2 text-right font-semibold text-[#214A33]">Dev</th>
                  <th className="p-2 text-left font-semibold text-[#214A33]">Effectif</th>
                  <th className="p-2 text-left font-semibold text-[#214A33]">Créé le</th>
                  <th className="p-2 text-left font-semibold text-[#214A33]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="p-4 text-center text-[#214A33]/60">Chargement…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-[#214A33]/60">Aucune entrée pour l’instant.</td></tr>
                ) : (
                  rows.map((r) => (
                    <tr key={r.id} className="border-t border-[#BFBFBF]">
                      <td className="p-2">{r.label}</td>
                      <td className="p-2 text-right">{eur(r.rate_conception)}</td>
                      <td className="p-2 text-right">{eur(r.rate_crea)}</td>
                      <td className="p-2 text-right">{eur(r.rate_dev)}</td>
                      <td className="p-2">{r.effective_from || "—"}</td>
                      <td className="p-2">{r.created_at ? new Date(r.created_at).toLocaleString() : "—"}</td>
                      <td className="p-2">
                        <div className="flex gap-2">
                          <Dialog open={editFor?.id === r.id} onOpenChange={(o) => (o ? openEdit(r) : setEditFor(null))}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">Modifier</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier les coûts</DialogTitle>
                                <DialogDescription>Mettre à jour le libellé, les montants et la date d’effet.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-3 py-2">
                                <div className="grid gap-2">
                                  <Label>Libellé</Label>
                                  <Input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} />
                                </div>
                                <div className="grid gap-2 md:grid-cols-3">
                                  <div className="grid gap-2">
                                    <Label>Conception (€/j)</Label>
                                    <Input inputMode="decimal" value={editForm.conc} onChange={(e) => setEditForm((f) => ({ ...f, conc: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Créa (€/j)</Label>
                                    <Input inputMode="decimal" value={editForm.crea} onChange={(e) => setEditForm((f) => ({ ...f, crea: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Dev (€/j)</Label>
                                    <Input inputMode="decimal" value={editForm.dev} onChange={(e) => setEditForm((f) => ({ ...f, dev: e.target.value }))} />
                                  </div>
                                </div>
                                <div className="grid gap-2">
                                  <Label>Effectif à partir du</Label>
                                  <Input type="date" value={editForm.effective_from} onChange={(e) => setEditForm((f) => ({ ...f, effective_from: e.target.value }))} />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setEditFor(null)}>Annuler</Button>
                                <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={submitEdit}>Enregistrer</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">Supprimer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => confirmDelete(r.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-[#214A33]/60">
            La dernière entrée (par date d’effet puis date de création) est utilisée pour les calculs (coûts, marges, scores).
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminInternalCosts;