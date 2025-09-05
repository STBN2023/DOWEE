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
import { Plus, Users } from "lucide-react";
import { showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";

type Status = "active" | "onhold" | "archived";

type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email: string;
};

type Project = {
  id: string;
  code: string;
  name: string;
  status: Status;
};

type Assignments = Record<string, string[]>; // project_id -> employee_id[]

const LS_EMPLOYEES = "dowee.admin.employees";
const LS_PROJECTS = "dowee.admin.projects";
const LS_ASSIGN = "dowee.admin.projectEmployees";

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function fullName(e: Employee) {
  if (e.display_name && e.display_name.trim()) return e.display_name;
  const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return names || e.email;
}

const seedData = () => {
  const seeded = {
    employees: [
      { id: "e1", first_name: "Alice", last_name: "Martin", email: "alice@example.com" },
      { id: "e2", first_name: "Bruno", last_name: "Durand", email: "bruno@example.com" },
      { id: "e3", first_name: "Chloé", last_name: "Bernard", email: "chloe@example.com" },
      { id: "e4", first_name: "David", last_name: "Roux", email: "david@example.com" },
      { id: "e5", first_name: "Emma", last_name: "Petit", email: "emma@example.com" },
    ] as Employee[],
    projects: [
      { id: "p1", code: "ACME-001", name: "Site vitrine", status: "active" as Status },
      { id: "p2", code: "BRND-2025", name: "Refonte branding", status: "onhold" as Status },
      { id: "p3", code: "CRM-OPS", name: "Intégration CRM", status: "active" as Status },
    ] as Project[],
    assign: {
      p1: ["e1", "e3"],
      p2: ["e2"],
      p3: ["e4", "e5"],
    } as Assignments,
  };
  localStorage.setItem(LS_EMPLOYEES, JSON.stringify(seeded.employees));
  localStorage.setItem(LS_PROJECTS, JSON.stringify(seeded.projects));
  localStorage.setItem(LS_ASSIGN, JSON.stringify(seeded.assign));
};

const AdminProjects = () => {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [assignments, setAssignments] = React.useState<Assignments>({});

  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState<{ code: string; name: string; status: Status }>({
    code: "",
    name: "",
    status: "active",
  });

  const [openAssignFor, setOpenAssignFor] = React.useState<string | null>(null);
  const [assignSelection, setAssignSelection] = React.useState<Record<string, boolean>>({});

  // Load or seed
  React.useEffect(() => {
    const rawEmp = localStorage.getItem(LS_EMPLOYEES);
    const rawProj = localStorage.getItem(LS_PROJECTS);
    const rawAsg = localStorage.getItem(LS_ASSIGN);
    if (!rawEmp || !rawProj || !rawAsg) {
      seedData();
    }
    const emps = JSON.parse(localStorage.getItem(LS_EMPLOYEES) || "[]") as Employee[];
    const projs = JSON.parse(localStorage.getItem(LS_PROJECTS) || "[]") as Project[];
    const asg = JSON.parse(localStorage.getItem(LS_ASSIGN) || "{}") as Assignments;
    setEmployees(emps);
    setProjects(projs);
    setAssignments(asg);
  }, []);

  const saveProjects = (next: Project[]) => {
    setProjects(next);
    localStorage.setItem(LS_PROJECTS, JSON.stringify(next));
  };

  const saveAssignments = (next: Assignments) => {
    setAssignments(next);
    localStorage.setItem(LS_ASSIGN, JSON.stringify(next));
  };

  const onCreateProject = () => {
    const newProject: Project = {
      id: uid("p"),
      code: form.code.trim(),
      name: form.name.trim(),
      status: form.status,
    };
    if (!newProject.code || !newProject.name) return;
    const next = [newProject, ...projects];
    saveProjects(next);
    showSuccess("Projet créé.");
    setForm({ code: "", name: "", status: "active" });
    setOpenCreate(false);
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

  const confirmAssign = () => {
    if (!openAssignFor) return;
    const selected = Object.entries(assignSelection)
      .filter(([, v]) => v)
      .map(([k]) => k);
    const next = { ...assignments, [openAssignFor]: selected };
    saveAssignments(next);
    showSuccess("Affectations mises à jour.");
    setOpenAssignFor(null);
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
                {projects.length === 0 ? (
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
                        <td className="p-2">
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
                                    <span className="text-xs text-[#214A33]/50">({e.email})</span>
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