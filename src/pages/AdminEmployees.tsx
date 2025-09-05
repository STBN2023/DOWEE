import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { listEmployees, type Employee, createEmployee, updateEmployee, deleteEmployee } from "@/api/adminEmployees";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { showError, showSuccess } from "@/utils/toast";
import { listTeams, type TeamRef, normalizeTeamSlug } from "@/api/teams";

const AdminEmployees = () => {
  const { loading: authLoading, employee } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [teams, setTeams] = React.useState<TeamRef[]>([]);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [createForm, setCreateForm] = React.useState<{
    id: string;
    display_name: string;
    first_name: string;
    last_name: string;
    role: "admin" | "manager" | "user";
    team: string; // slug sélectionné
  }>({ id: "", display_name: "", first_name: "", last_name: "", role: "user", team: "" });

  const [editFor, setEditFor] = React.useState<Employee | null>(null);
  const [editForm, setEditForm] = React.useState<{
    display_name: string;
    first_name: string;
    last_name: string;
    role: "admin" | "manager" | "user";
    team: string; // slug sélectionné
  }>({ display_name: "", first_name: "", last_name: "", role: "user", team: "" });

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [emps, tms] = await Promise.all([listEmployees(), listTeams()]);
      setEmployees(emps);
      setTeams(tms);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement des profils.");
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

  const fullName = (e: Employee) => {
    if (e.display_name && e.display_name.trim()) return e.display_name;
    const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
    return names || e.id;
  };

  const openEdit = (e: Employee) => {
    setEditFor(e);
    setEditForm({
      display_name: e.display_name ?? "",
      first_name: e.first_name ?? "",
      last_name: e.last_name ?? "",
      role: (e.role as any) ?? "user",
      team: e.team ?? "",
    });
  };

  const confirmCreate = async () => {
    const id = createForm.id.trim();
    if (!id) {
      showError("L’ID utilisateur (UUID) est requis.");
      return;
    }
    const normalizedTeam = normalizeTeamSlug(createForm.team);
    try {
      await createEmployee({
        id,
        display_name: createForm.display_name || null,
        first_name: createForm.first_name || null,
        last_name: createForm.last_name || null,
        role: createForm.role,
        team: normalizedTeam, // stocke le slug normalisé (ex: 'créa', 'dev', 'commercial', 'direction')
      });
      showSuccess("Profil créé.");
      setOpenCreate(false);
      setCreateForm({ id: "", display_name: "", first_name: "", last_name: "", role: "user", team: "" });
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Création impossible.");
    }
  };

  const confirmEdit = async () => {
    if (!editFor) return;
    const normalizedTeam = normalizeTeamSlug(editForm.team);
    try {
      await updateEmployee(editFor.id, {
        display_name: editForm.display_name || null,
        first_name: editForm.first_name || null,
        last_name: editForm.last_name || null,
        role: editForm.role,
        team: normalizedTeam,
      });
      showSuccess("Profil mis à jour.");
      setEditFor(null);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Mise à jour impossible.");
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteEmployee(id);
      showSuccess("Profil supprimé.");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Suppression impossible.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[#214A33]">Profils salariés</CardTitle>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90">Nouveau profil</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau profil</DialogTitle>
                <DialogDescription>Créer un profil à partir d’un ID utilisateur existant (auth.users).</DialogDescription>
              </DialogHeader>
              <div className="grid gap-3 py-2">
                <div className="grid gap-2">
                  <Label>ID utilisateur (UUID)</Label>
                  <Input value={createForm.id} onChange={(e) => setCreateForm((f) => ({ ...f, id: e.target.value }))} placeholder="ex: 00000000-0000-0000-0000-000000000000" />
                </div>
                <div className="grid gap-2">
                  <Label>Nom affiché</Label>
                  <Input value={createForm.display_name} onChange={(e) => setCreateForm((f) => ({ ...f, display_name: e.target.value }))} />
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Prénom</Label>
                    <Input value={createForm.first_name} onChange={(e) => setCreateForm((f) => ({ ...f, first_name: e.target.value }))} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Nom</Label>
                    <Input value={createForm.last_name} onChange={(e) => setCreateForm((f) => ({ ...f, last_name: e.target.value }))} />
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <div className="grid gap-2">
                    <Label>Rôle</Label>
                    <Select value={createForm.role} onValueChange={(v) => setCreateForm((f) => ({ ...f, role: v as any }))}>
                      <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin">admin</SelectItem>
                        <SelectItem value="manager">manager</SelectItem>
                        <SelectItem value="user">user</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Équipe (optionnel)</Label>
                    <Select
                      value={createForm.team || ""}
                      onValueChange={(v) => setCreateForm((f) => ({ ...f, team: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="Sélectionner une équipe" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">— Aucune —</SelectItem>
                        {teams.map((t) => (
                          <SelectItem key={t.id} value={t.slug}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenCreate(false)}>Annuler</Button>
                <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={confirmCreate}>Créer</Button>
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
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Nom</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Rôle</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Équipe</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Mise à jour</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-[#214A33]/60">Chargement…</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-[#214A33]/60">Aucun salarié pour le moment.</td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id} className="border-t border-[#BFBFBF]">
                      <td className="p-2 text-sm">{fullName(e)}</td>
                      <td className="p-2 text-sm">{e.role ?? "user"}</td>
                      <td className="p-2 text-sm">{e.team ?? "—"}</td>
                      <td className="p-2 text-sm">{e.updated_at ? new Date(e.updated_at).toLocaleString() : "—"}</td>
                      <td className="p-2 text-sm">
                        <div className="flex gap-2">
                          <Dialog open={editFor?.id === e.id} onOpenChange={(o) => (o ? openEdit(e) : setEditFor(null))}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">Modifier</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier le profil</DialogTitle>
                                <DialogDescription>Mettre à jour le nom, le rôle et l’équipe.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-3 py-2">
                                <div className="grid gap-2">
                                  <Label>Nom affiché</Label>
                                  <Input value={editForm.display_name} onChange={(e2) => setEditForm((f) => ({ ...f, display_name: e2.target.value }))} />
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label>Prénom</Label>
                                    <Input value={editForm.first_name} onChange={(e2) => setEditForm((f) => ({ ...f, first_name: e2.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Nom</Label>
                                    <Input value={editForm.last_name} onChange={(e2) => setEditForm((f) => ({ ...f, last_name: e2.target.value }))} />
                                  </div>
                                </div>
                                <div className="grid gap-2 md:grid-cols-2">
                                  <div className="grid gap-2">
                                    <Label>Rôle</Label>
                                    <Select value={editForm.role} onValueChange={(v) => setEditForm((f) => ({ ...f, role: v as any }))}>
                                      <SelectTrigger><SelectValue placeholder="Rôle" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="admin">admin</SelectItem>
                                        <SelectItem value="manager">manager</SelectItem>
                                        <SelectItem value="user">user</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Équipe (optionnel)</Label>
                                    <Select
                                      value={editForm.team || ""}
                                      onValueChange={(v) => setEditForm((f) => ({ ...f, team: v }))}
                                    >
                                      <SelectTrigger><SelectValue placeholder="Sélectionner une équipe" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="">— Aucune —</SelectItem>
                                        {teams.map((t) => (
                                          <SelectItem key={t.id} value={t.slug}>{t.label}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setEditFor(null)}>Annuler</Button>
                                <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={confirmEdit}>Enregistrer</Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">Supprimer</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer ce profil ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action supprimera aussi ses affectations et ses créneaux.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => confirmDelete(e.id)}>Supprimer</AlertDialogAction>
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
            Les équipes proposées proviennent du référentiel ref_teams. Les slugs sont normalisés pour rester cohérents avec les tableaux de bord.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmployees;