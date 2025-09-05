import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { listTariffs, createTariff, updateTariff, deleteTariff, type Tariff } from "@/api/adminTariffs";
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
  try {
    return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  } catch {
    return `${n} €`;
  }
}

const AdminTariffs = () => {
  const { loading: authLoading, employee } = useAuth();

  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [tariffs, setTariffs] = React.useState<Tariff[]>([]);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState<{ label: string; conception: string; crea: string; dev: string }>({
    label: "",
    conception: "",
    crea: "",
    dev: "",
  });

  const [editFor, setEditFor] = React.useState<Tariff | null>(null);
  const [editForm, setEditForm] = React.useState<{ label: string; conception: string; crea: string; dev: string }>({
    label: "",
    conception: "",
    crea: "",
    dev: "",
  });

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await listTariffs();
      setTariffs(data);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement des barèmes.");
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

  const submitCreate = async () => {
    const label = form.label.trim();
    if (!label) {
      showError("Le libellé est requis.");
      return;
    }
    const rate_conception = Number(form.conception.replace(",", "."));
    const rate_crea = Number(form.crea.replace(",", "."));
    const rate_dev = Number(form.dev.replace(",", "."));
    if (!isFinite(rate_conception) || !isFinite(rate_crea) || !isFinite(rate_dev)) {
      showError("Les tarifs doivent être des nombres.");
      return;
    }
    try {
      await createTariff({ label, rate_conception, rate_crea, rate_dev });
      showSuccess("Barème créé.");
      setOpenCreate(false);
      setForm({ label: "", conception: "", crea: "", dev: "" });
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Création impossible.");
    }
  };

  const openEdit = (t: Tariff) => {
    setEditFor(t);
    setEditForm({
      label: t.label,
      conception: String(t.rate_conception),
      crea: String(t.rate_crea),
      dev: String(t.rate_dev),
    });
  };

  const submitEdit = async () => {
    if (!editFor) return;
    const label = editForm.label.trim();
    const rate_conception = Number(editForm.conception.replace(",", "."));
    const rate_crea = Number(editForm.crea.replace(",", "."));
    const rate_dev = Number(editForm.dev.replace(",", "."));
    if (!label || !isFinite(rate_conception) || !isFinite(rate_crea) || !isFinite(rate_dev)) {
      showError("Veuillez renseigner un libellé et des tarifs valides.");
      return;
    }
    try {
      await updateTariff(editFor.id, { label, rate_conception, rate_crea, rate_dev });
      showSuccess("Barème mis à jour.");
      setEditFor(null);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Mise à jour impossible.");
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteTariff(id);
      showSuccess("Barème supprimé.");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Suppression impossible.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[#214A33]">Barèmes (tarifs)</CardTitle>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90">Nouveau barème</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau barème</DialogTitle>
                <DialogDescription>Définissez les tarifs horaires HT par profil.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>Libellé</Label>
                  <Input value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="Ex: Barème 2025" />
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Conception (HT)</Label>
                    <Input inputMode="decimal" value={form.conception} onChange={(e) => setForm((f) => ({ ...f, conception: e.target.value }))} placeholder="ex: 133" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Créa (HT)</Label>
                    <Input inputMode="decimal" value={form.crea} onChange={(e) => setForm((f) => ({ ...f, crea: e.target.value }))} placeholder="ex: 75" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Dev (HT)</Label>
                    <Input inputMode="decimal" value={form.dev} onChange={(e) => setForm((f) => ({ ...f, dev: e.target.value }))} placeholder="ex: 106" />
                  </div>
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
          {errorMsg && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
          )}
          <div className="overflow-x-auto rounded-md border border-[#BFBFBF] bg-white">
            <table className="w-full border-collapse">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Libellé</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Conception</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Créa</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Dev</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Créé le</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-[#214A33]/60">Chargement…</td>
                  </tr>
                ) : tariffs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-sm text-[#214A33]/60">Aucun barème pour le moment.</td>
                  </tr>
                ) : (
                  tariffs.map((t) => (
                    <tr key={t.id} className="border-t border-[#BFBFBF]">
                      <td className="p-2 text-sm">{t.label}</td>
                      <td className="p-2 text-sm">{eur(t.rate_conception)}</td>
                      <td className="p-2 text-sm">{eur(t.rate_crea)}</td>
                      <td className="p-2 text-sm">{eur(t.rate_dev)}</td>
                      <td className="p-2 text-sm">{t.created_at ? new Date(t.created_at).toLocaleString() : "—"}</td>
                      <td className="p-2 text-sm">
                        <div className="flex gap-2">
                          <Dialog open={editFor?.id === t.id} onOpenChange={(o) => (o ? openEdit(t) : setEditFor(null))}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">Modifier</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier le barème</DialogTitle>
                                <DialogDescription>Mettre à jour le libellé et les tarifs.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-3 py-2">
                                <div className="grid gap-2">
                                  <Label>Libellé</Label>
                                  <Input value={editForm.label} onChange={(e) => setEditForm((f) => ({ ...f, label: e.target.value }))} />
                                </div>
                                <div className="grid gap-2 md:grid-cols-3">
                                  <div className="grid gap-2">
                                    <Label>Conception (HT)</Label>
                                    <Input inputMode="decimal" value={editForm.conception} onChange={(e) => setEditForm((f) => ({ ...f, conception: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Créa (HT)</Label>
                                    <Input inputMode="decimal" value={editForm.crea} onChange={(e) => setEditForm((f) => ({ ...f, crea: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Dev (HT)</Label>
                                    <Input inputMode="decimal" value={editForm.dev} onChange={(e) => setEditForm((f) => ({ ...f, dev: e.target.value }))} />
                                  </div>
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
                                <AlertDialogTitle>Supprimer ce barème ?</AlertDialogTitle>
                                <AlertDialogDescription>Les projets référencés seront détachés (tariff_id null).</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => confirmDelete(t.id)}>Supprimer</AlertDialogAction>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTariffs;