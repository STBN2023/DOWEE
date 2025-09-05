import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Pencil, Plus, Users, Trash2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { createProject, listAdminProjects, setProjectAssignments, updateProject, deleteProject, type Employee, type Project, type Status } from "@/api/adminProjects";
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

type Assignments = Record<string, string[]>; // project_id -> employee_id[]

function fullName(e: Employee) {
  if (e.display_name && e.display_name.trim()) return e.display_name;
  const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return names || "Utilisateur";
}

const AdminProjects = () => {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [assignments, setAssignments] = React.useState<Assignments>({});

  const [loading, setLoading] = React.useState<boolean>(true);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState<{ code: string; name: string; status: Status }>({
    code: "",
    name: "",
    status: "active",
  });

  const [openAssignFor, setOpenAssignFor] = React.useState<string | null>(null);
  const [assignSelection, setAssignSelection] = React.useState<Record<string, boolean>>({});

  const [openEditFor, setOpenEditFor] = React.useState<Project | null>(null);
  const [editForm, setEditForm] = React.useState<{ code: string; name: string; status: Status }>({
    code: "",
    name: "",
    status: "active",
  });

  const refresh = async () => {
    setLoading(true);
    const data = await listAdminProjects();
    setEmployees(data.employees);
    setProjects(data.projects);
    setAssignments(data.assignments || {});
    setLoading(false);
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const onCreateProject = async () => {
    const code = form.code.trim();
    const name = form.name.trim();
    if (!code || !name) return;
    await createProject({ code, name, status: form.status });
    showSuccess("Projet créé.");
    setForm({ code: "", name: "", status: "active" });
    setOpenCreate(false);
    await refresh();
  };

  const openAssignDialog = (projectId: string) => {
    setOpenAssignFor(projectId);
    const current = new Set(assignments[projectId] || []);
    const initSel: Record<string, boolean> = {};
    employees.forEach((e) => {
      initSel[e.id] = current.has(e.id);
    });
    setAssignSelection(initSel);
  };

  const confirmAssign = async () => {
    if (!openAssignFor) return;
    const selected = Object.entries(assignSelection)
      .filter(([, v]) => v)
      .map(([k]) => k);
    try {
      await setProjectAssignments(openAssignFor, selected);
      showSuccess("Affectations mises à jour.");
      setOpenAssignFor(null);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Mise à jour des affectations impossible.");
    }
  };

  const openEditDialog = (p: Project) => {
    setOpenEditFor(p);
    setEditForm({ code: p.code, name: p.name, status: p.status });
  };

  const confirmEdit = async () => {
    if (!openEditFor) return;
    const code = editForm.code.trim();
    const name = editForm.name.trim();
    if (!code || !name) return;
    await updateProject(openEditFor.id, { code, name, status: editForm.status });
    showSuccess("Projet modifié.");
    setOpenEditFor(null);
    await refresh();
  };

  const confirmDelete = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      showSuccess("Projet supprimé.");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Suppression impossible.");
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-[#214A33]">Admin — Projets</CardTitle>
          <Dialog open={openCreate} onOpenChange={setOpenCreate}>
            <DialogTrigger asChild>
              <Button className="bg-[#214A33] hover:bg-[#214A33]/90 text-white">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau projet
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau projet</DialogTitle>
                <DialogDescription>Renseignez le code, le nom et le statut du projet.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="code">Code</Label>
                  <Input
                    id="code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    placeholder="Ex: ACME-2025-001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="name">Nom</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="Ex: Site vitrine"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Statut</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as Status }))}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choisir un statut" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="onhold">En pause</SelectItem>
                      <SelectItem value="archived">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenCreate(false)}>
                  Annuler
                </Button>
                <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={onCreateProject}>
                  Créer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-[#BFBFBF]">
            <table className="w-full border-collapse">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Code</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Nom</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Statut</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Salariés affectés</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-[#214A33]/60">Chargement…</td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-center text-sm text-[#214A33]/60">
                      Aucun projet pour le moment.
                    </td>
                  </tr>
                ) : (
                  projects.map((p) => {
                    const assigned = (assignments[p.id] || []).map(
                      (eid) => employees.find((e) => e.id === eid)
                    ).filter(Boolean) as Employee[];
                    return (
                      <tr key={p.id} className="border-t border-[#BFBFBF]">
                        <td className="p-2 text-sm">{p.code}</td>
                        <td className="p-2 text-sm">{p.name}</td>
                        <td className="p-2 text-sm">
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                              p.status === "active" && "bg-emerald-50 text-emerald-700 border border-emerald-200",
                              p.status === "onhold" && "bg-amber-50 text-amber-700 border border-amber-200",
                              p.status === "archived" && "bg-gray-100 text-gray-600 border border-gray-200"
                            )}
                          >
                            {p.status === "active" ? "Actif" : p.status === "onhold" ? "En pause" : "Archivé"}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1">
                            {assigned.length === 0 ? (
                              <span className="text-xs text-[#214A33]/50">Aucun salarié</span>
                            ) : (
                              assigned.map((e) => (
                                <Badge key={e.id} variant="secondary" className="border-[#BFBFBF] text-[#214A33]">
                                  {fullName(e)}
                                </Badge>
                              ))
                            )}
                          </div>
                        </td>
                        <td className="p-2 flex gap-2">
                          <Dialog open={openEditFor?.id === p.id} onOpenChange={(o) => (o ? openEditDialog(p) : setOpenEditFor(null))}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">
                                <Pencil className="mr-2 h-4 w-4" />
                                Modifier
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Modifier le projet — {p.code}</DialogTitle>
                                <DialogDescription>Mettre à jour le code, le nom ou le statut du projet.</DialogDescription>
                              </DialogHeader>
                              <div className="grid gap-4 py-2">
                                <div className="grid gap-2">
                                  <Label htmlFor={`edit-code-${p.id}`}>Code</Label>
                                  <Input
                                    id={`edit-code-${p.id}`}
                                    value={editForm.code}
                                    onChange={(e) => setEditForm((f) => ({ ...f, code: e.target.value }))}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label htmlFor={`edit-name-${p.id}`}>Nom</Label>
                                  <Input
                                    id={`edit-name-${p.id}`}
                                    value={editForm.name}
                                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                                  />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Statut</Label>
                                  <Select
                                    value={editForm.status}
                                    onValueChange={(v) => setEditForm((f) => ({ ...f, status: v as Status }))}
                                  >
                                    <SelectTrigger className="w-full">
                                      <SelectValue placeholder="Choisir un statut" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Actif</SelectItem>
                                      <SelectItem value="onhold">En pause</SelectItem>
                                      <SelectItem value="archived">Archivé</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenEditFor(null)}>
                                  Annuler
                                </Button>
                                <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={confirmEdit}>
                                  Enregistrer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <Dialog open={openAssignFor === p.id} onOpenChange={(o) => (o ? openAssignDialog(p.id) : setOpenAssignFor(null))}>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">
                                <Users className="mr-2 h-4 w-4" />
                                Affecter
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Affecter des salariés — {p.code}</DialogTitle>
                                <DialogDescription>Sélectionnez les collaborateurs à affecter à ce projet.</DialogDescription>
                              </DialogHeader>
                              <div className="max-h-[300px] overflow-auto pr-1">
                                {employees.map((e) => (
                                  <label key={e.id} className="flex items-center gap-3 py-2">
                                    <Checkbox
                                      checked={!!assignSelection[e.id]}
                                      onCheckedChange={(v) =>
                                        setAssignSelection((sel) => ({
                                          ...sel,
                                          [e.id]: Boolean(v),
                                        }))
                                      }
                                    />
                                    <span className="text-sm text-[#214A33]">{fullName(e)}</span>
                                  </label>
                                ))}
                              </div>
                              <DialogFooter>
                                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenAssignFor(null)}>
                                  Annuler
                                </Button>
                                <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={confirmAssign}>
                                  Enregistrer
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Supprimer
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Supprimer le projet ?</AlertDialogTitle>
                                <AlertDialogDescription>Cette action supprimera aussi les affectations et créneaux liés.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Annuler</AlertDialogCancel>
                                <AlertDialogAction onClick={() => confirmDelete(p.id)}>Supprimer</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminProjects;