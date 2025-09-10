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
import { Pencil, Plus, Users, Trash2, Archive, Play } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import {
  createProject,
  listAdminProjects,
  setProjectAssignments,
  updateProject,
  deleteProject,
  finalizeProject,
  type Employee,
  type Project,
  type Status,
  type Client,
  type Tariff,
} from "@/api/adminProjects";
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
import { getProjectCosts, type ProjectCostsMap } from "@/api/projectCosts";
import { getProjectScores, type ProjectScore } from "@/api/projectScoring";

type Assignments = Record<string, string[]>;

function fullName(e: Employee) {
  if (e.display_name && e.display_name.trim()) return e.display_name;
  const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return names || "Utilisateur";
}
function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}
function scoreBadge(score?: number) {
  if (score == null) return "bg-gray-100 text-gray-600 border border-gray-200";
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border border-amber-200";
  if (score >= 40) return "bg-orange-50 text-orange-700 border border-orange-200";
  return "bg-red-50 text-red-700 border border-red-200";
}

type SortKey = "code" | "name" | "score";
type SortDir = "asc" | "desc";

const AdminProjects = () => {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [assignments, setAssignments] = React.useState<Assignments>({});
  const [clients, setClients] = React.useState<Client[]>([]);
  const [tariffs, setTariffs] = React.useState<Tariff[]>([]);
  const [costs, setCosts] = React.useState<ProjectCostsMap>({});
  const [scoreDetails, setScoreDetails] = React.useState<Record<string, ProjectScore>>({});

  const [loading, setLoading] = React.useState<boolean>(true);

  const [openCreate, setOpenCreate] = React.useState(false);
  const [form, setForm] = React.useState<{
    name: string;
    status: Status;
    client_id: string;
    tariff_id: string | null;
    quote_amount: string;
    budget_conception: string;
    budget_crea: string;
    budget_dev: string;
    due_date: string;
    effort_days: string;
  }>({
    name: "",
    status: "active",
    client_id: "",
    tariff_id: null,
    quote_amount: "",
    budget_conception: "",
    budget_crea: "",
    budget_dev: "",
    due_date: "",
    effort_days: "",
  });

  const [openAssignFor, setOpenAssignFor] = React.useState<string | null>(null);
  const [assignSelection, setAssignSelection] = React.useState<Record<string, boolean>>({});

  const [openEditFor, setOpenEditFor] = React.useState<Project | null>(null);
  const [editForm, setEditForm] = React.useState<{
    name: string;
    status: Status;
    client_id: string;
    tariff_id: string | null;
    quote_amount: string;
    budget_conception: string;
    budget_crea: string;
    budget_dev: string;
    due_date: string;
    effort_days: string;
  }>({
    name: "",
    status: "active",
    client_id: "",
    tariff_id: null,
    quote_amount: "",
    budget_conception: "",
    budget_crea: "",
    budget_dev: "",
    due_date: "",
    effort_days: "",
  });

  const [showScoreHelp, setShowScoreHelp] = React.useState<boolean>(false);
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | Status>("all");
  const [clientFilter, setClientFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({ key: "score", dir: "desc" });

  const [finalizeFor, setFinalizeFor] = React.useState<Project | null>(null);

  const refresh = async () => {
    setLoading(true);
    const data = await listAdminProjects();
    setEmployees(data.employees);
    setProjects(data.projects);
    setAssignments(data.assignments || {});
    setClients(data.clients);
    setTariffs(data.tariffs);

    try {
      const [c, sc] = await Promise.all([getProjectCosts(), getProjectScores()]);
      setCosts(c);
      const map: Record<string, ProjectScore> = {};
      sc.forEach((s) => { map[s.project_id] = s; });
      setScoreDetails(map);
    } catch (e) {
      console.warn("getProjectCosts/getProjectScores error", e);
    }

    setLoading(false);
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      await refresh();
      if (!mounted) return;
    })();
    return () => { mounted = false; };
  }, []);

  // Helpers calcul heures max (budget / tarif) — viseur indicatif
  const computeHoursMax = (tariff: Tariff | undefined | null, budgets: { conc?: string; crea?: string; dev?: string }) => {
    if (!tariff) return { conc: null, crea: null, dev: null, total: null as number | null };
    const n = (v?: string) => {
      if (!v) return 0;
      const x = Number(v.replace(",", "."));
      return isFinite(x) ? x : 0;
    };
    const hConc = tariff.rate_conception > 0 ? n(budgets.conc) / tariff.rate_conception : 0;
    const hCrea = tariff.rate_crea > 0 ? n(budgets.crea) / tariff.rate_crea : 0;
    const hDev = tariff.rate_dev > 0 ? n(budgets.dev) / tariff.rate_dev : 0;
    const total = hConc + hCrea + hDev;
    const rnd = (x: number) => Math.round(x * 10) / 10;
    return { conc: rnd(hConc), crea: rnd(hCrea), dev: rnd(hDev), total: rnd(total) };
  };

  const onCreateProject = async () => {
    const name = form.name.trim();
    const client_id = form.client_id;
    if (!name || !client_id) {
      showError("Nom et client requis.");
      return;
    }
    const num = (s: string) => {
      if (!s.trim()) return null;
      const v = Number(s.replace(",", "."));
      return isFinite(v) ? v : null;
    };
    const quote = num(form.quote_amount);
    const due_date = form.due_date.trim() ? form.due_date.trim() : null;
    const effort_days_val = form.effort_days.trim() === "" ? null : Number(form.effort_days.replace(",", "."));
    const effort_days = isFinite(Number(effort_days_val)) ? Number(effort_days_val) : null;

    // Budgets par service
    const budget_conception = num(form.budget_conception);
    const budget_crea = num(form.budget_crea);
    const budget_dev = num(form.budget_dev);

    try {
      const created = await createProject({
        name,
        status: form.status,
        client_id,
        tariff_id: form.tariff_id || null,
        quote_amount: quote,
        budget_conception,
        budget_crea,
        budget_dev,
        due_date,
        effort_days,
      });
      showSuccess(`Projet créé: ${created.code}`);
      setForm({
        name: "",
        status: "active",
        client_id: "",
        tariff_id: null,
        quote_amount: "",
        budget_conception: "",
        budget_crea: "",
        budget_dev: "",
        due_date: "",
        effort_days: "",
      });
      setOpenCreate(false);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Création impossible.");
    }
  };

  const openAssignDialog = (projectId: string) => {
    setOpenAssignFor(projectId);
    const current = new Set(assignments[projectId] || []);
    const initSel: Record<string, boolean> = {};
    employees.forEach((e) => { initSel[e.id] = current.has(e.id); });
    setAssignSelection(initSel);
  };

  const confirmAssign = async () => {
    if (!openAssignFor) return;
    const selected = Object.entries(assignSelection).filter(([, v]) => v).map(([k]) => k);
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
    setEditForm({
      name: p.name,
      status: p.status,
      client_id: p.client_id || "",
      tariff_id: p.tariff_id || null,
      quote_amount: p.quote_amount != null ? String(p.quote_amount) : "",
      budget_conception: p.budget_conception != null ? String(p.budget_conception) : "",
      budget_crea: p.budget_crea != null ? String(p.budget_crea) : "",
      budget_dev: p.budget_dev != null ? String(p.budget_dev) : "",
      due_date: p.due_date ?? "",
      effort_days: p.effort_days != null ? String(p.effort_days) : "",
    });
  };

  const confirmEdit = async () => {
    if (!openEditFor) return;
    const name = editForm.name.trim();
    if (!name || !editForm.client_id) {
      showError("Nom et client requis.");
      return;
    }
    const num = (s: string) => {
      if (!s.trim()) return null;
      const v = Number(s.replace(",", "."));
      return isFinite(v) ? v : null;
    };
    const quote = num(editForm.quote_amount);
    const due_date = editForm.due_date.trim() ? editForm.due_date.trim() : null;
    const effort_days_val = editForm.effort_days.trim() === "" ? null : Number(editForm.effort_days.replace(",", "."));
    const effort_days = isFinite(Number(effort_days_val)) ? Number(effort_days_val) : null;

    const budget_conception = num(editForm.budget_conception);
    const budget_crea = num(editForm.budget_crea);
    const budget_dev = num(editForm.budget_dev);

    try {
      await updateProject(openEditFor.id, {
        name,
        status: editForm.status,
        client_id: editForm.client_id,
        tariff_id: editForm.tariff_id || null,
        quote_amount: quote,
        budget_conception,
        budget_crea,
        budget_dev,
        due_date,
        effort_days,
      });
      showSuccess("Projet modifié.");
      setOpenEditFor(null);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Modification impossible.");
    }
  };

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = [...projects];

    if (statusFilter !== "all") arr = arr.filter((p) => p.status === statusFilter);
    if (clientFilter !== "all") arr = arr.filter((p) => p.client_id === clientFilter);
    if (needle) {
      arr = arr.filter((p) => (p.code + " " + p.name).toLowerCase().includes(needle));
    }

    const dirMul = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      if (sort.key === "code") return a.code.localeCompare(b.code) * dirMul;
      if (sort.key === "name") return a.name.localeCompare(b.name) * dirMul;
      const sa = scoreDetails[a.id]?.score ?? -Infinity;
      const sb = scoreDetails[b.id]?.score ?? -Infinity;
      return (sa - sb) * dirMul;
    });

    return arr;
  }, [projects, q, statusFilter, clientFilter, sort, scoreDetails]);

  const toggleRow = (id: string) => setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));

  const onFinalize = async () => {
    if (!finalizeFor) return;
    try {
      const res = await finalizeProject(finalizeFor.id, { delete_future_plans: true });
      showSuccess(`Projet mis en pause. ${res.deleted_future ? `${res.deleted_future} créneau(x) futur(s) supprimé(s).` : ""}`);
      setFinalizeFor(null);
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Finalisation impossible.");
    }
  };

  const reopen = async (p: Project) => {
    try {
      await updateProject(p.id, { status: "active" });
      showSuccess("Projet rouvert.");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Réouverture impossible.");
    }
  };

  // Trouver barèmes sélectionnés pour calcul “heures max”
  const selectedCreateTariff = React.useMemo(
    () => tariffs.find((t) => t.id === form.tariff_id) || null,
    [tariffs, form.tariff_id]
  );
  const selectedEditTariff = React.useMemo(
    () => tariffs.find((t) => t.id === (editForm.tariff_id || "")) || null,
    [tariffs, editForm.tariff_id]
  );
  const hCreate = computeHoursMax(selectedCreateTariff, {
    conc: form.budget_conception,
    crea: form.budget_crea,
    dev: form.budget_dev,
  });
  const hEdit = computeHoursMax(selectedEditTariff, {
    conc: editForm.budget_conception,
    crea: editForm.budget_crea,
    dev: editForm.budget_dev,
  });

  return (
    <div className="mx-auto max-w-[1280px] px-6 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
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
                <DialogDescription>Le code est généré (CLIENT‑YYYY‑NNN).</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-2">
                <div className="grid gap-2">
                  <Label>Nom</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex: Site vitrine" />
                </div>
                <div className="grid gap-2">
                  <Label>Client</Label>
                  <Select value={form.client_id} onValueChange={(v) => setForm((f) => ({ ...f, client_id: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Barème tarifs</Label>
                  <Select value={form.tariff_id ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, tariff_id: v === "none" ? null : v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Sans barème (optionnel)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Aucun —</SelectItem>
                      {tariffs.map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Montant total du devis (HT)</Label>
                  <Input inputMode="decimal" placeholder="ex: 12000" value={form.quote_amount} onChange={(e) => setForm((f) => ({ ...f, quote_amount: e.target.value }))} />
                </div>

                {/* Budgets par service */}
                <div className="col-span-2 grid gap-2">
                  <Label>Budgets par service (HT)</Label>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="grid gap-1">
                      <Label className="text-xs text-[#214A33]/80">Conception</Label>
                      <Input inputMode="decimal" placeholder="ex: 5000" value={form.budget_conception} onChange={(e) => setForm((f) => ({ ...f, budget_conception: e.target.value }))} />
                      <div className="text-[11px] text-[#214A33]/60">Heures max: {hCreate.conc ?? "—"}</div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-[#214A33]/80">Créa</Label>
                      <Input inputMode="decimal" placeholder="ex: 3000" value={form.budget_crea} onChange={(e) => setForm((f) => ({ ...f, budget_crea: e.target.value }))} />
                      <div className="text-[11px] text-[#214A33]/60">Heures max: {hCreate.crea ?? "—"}</div>
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs text-[#214A33]/80">Dev</Label>
                      <Input inputMode="decimal" placeholder="ex: 4000" value={form.budget_dev} onChange={(e) => setForm((f) => ({ ...f, budget_dev: e.target.value }))} />
                      <div className="text-[11px] text-[#214A33]/60">Heures max: {hCreate.dev ?? "—"}</div>
                    </div>
                  </div>
                  <div className="text-[11px] text-[#214A33]/60">
                    Total heures max (indicatif): {hCreate.total ?? "—"} h {selectedCreateTariff ? "" : "(sélectionnez un barème pour calculer)"} 
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label>Échéance</Label>
                  <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>Effort (jours)</Label>
                  <Input inputMode="decimal" placeholder="ex: 12" value={form.effort_days} onChange={(e) => setForm((f) => ({ ...f, effort_days: e.target.value }))} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenCreate(false)}>Annuler</Button>
                <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={onCreateProject}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardHeader>

        <CardContent>
          {/* Filtres & tri */}
          <div className="mb-3 grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (code ou nom)..." />
            </div>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="bg-white border-[#BFBFBF] text-[#214A33]"><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="onhold">En pause</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="bg-white border-[#BFBFBF] text-[#214A33]"><SelectValue placeholder="Client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border border-[#BFBFBF]">
            <table className="w-full border-collapse">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Code</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Nom</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Statut</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Score</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Détails</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="p-4 text-center text-sm text-[#214A33]/60">Chargement…</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="p-4 text-center text-sm text-[#214A33]/60">Aucun résultat.</td></tr>
                ) : (
                  filtered.map((p) => {
                    const assigned = (assignments[p.id] || []).map((eid) => employees.find((e) => e.id === eid)).filter(Boolean) as Employee[];
                    const client = clients.find((c) => c.id === p.client_id) || null;

                    const cst = costs[p.id];
                    const costPlanned = cst?.cost_planned ?? null;
                    const costActual = cst?.cost_actual ?? null;

                    const details = scoreDetails[p.id];
                    const sc = details?.score;

                    const open = !!openRows[p.id];

                    return (
                      <React.Fragment key={p.id}>
                        <tr className="border-t border-[#BFBFBF]">
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
                          <td className="p-2 text-sm">
                            {sc == null ? (
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", scoreBadge(undefined))}>—</span>
                            ) : (
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", scoreBadge(sc))}>
                                {Math.round(sc).toString().padStart(2, "0")}
                              </span>
                            )}
                          </td>
                          <td className="p-2">
                            <Button variant="outline" size="sm" className="border-[#BFBFBF] text-[#214A33]" onClick={() => toggleRow(p.id)}>
                              {open ? "Masquer" : "Détails"}
                            </Button>
                          </td>
                          <td className="p-2 flex flex-wrap gap-2">
                            <Dialog open={openAssignFor === p.id} onOpenChange={(o) => (o ? openAssignDialog(p.id) : setOpenAssignFor(null))}>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">
                                  <Users className="mr-2 h-4 w-4" />
                                  Affecter
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Affectations — {p.code}</DialogTitle>
                                  <DialogDescription>Sélectionnez les salariés affectés à ce projet.</DialogDescription>
                                </DialogHeader>
                                <div className="max-h-[60vh] overflow-auto rounded-md border border-[#BFBFBF] p-2">
                                  <ul className="space-y-2">
                                    {employees.map((e) => {
                                      const checked = !!assignSelection[e.id];
                                      return (
                                        <li key={e.id} className="flex items-center gap-2">
                                          <Checkbox
                                            checked={checked}
                                            onCheckedChange={(val) => setAssignSelection((s) => ({ ...s, [e.id]: !!val }))}
                                          />
                                          <span className="text-sm text-[#214A33]">{fullName(e)}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenAssignFor(null)}>Annuler</Button>
                                  <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={async () => { await confirmAssign(); }}>Enregistrer</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            <Dialog open={openEditFor?.id === p.id} onOpenChange={(o) => (o ? openEditDialog(p) : setOpenEditFor(null))}>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Modifier
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Modifier — {p.code}</DialogTitle>
                                  <DialogDescription>Mettre à jour les informations du projet.</DialogDescription>
                                </DialogHeader>
                                <div className="grid grid-cols-2 gap-4 py-2">
                                  <div className="grid gap-2">
                                    <Label>Nom</Label>
                                    <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Client</Label>
                                    <Select value={editForm.client_id} onValueChange={(v) => setEditForm((f) => ({ ...f, client_id: v }))}>
                                      <SelectTrigger className="w-full"><SelectValue placeholder="Choisir un client" /></SelectTrigger>
                                      <SelectContent>
                                        {clients.map((c) => (<SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Barème tarifs</Label>
                                    <Select value={editForm.tariff_id ?? "none"} onValueChange={(v) => setEditForm((f) => ({ ...f, tariff_id: v === "none" ? null : v }))}>
                                      <SelectTrigger className="w-full"><SelectValue placeholder="Sans barème (optionnel)" /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="none">— Aucun —</SelectItem>
                                        {tariffs.map((t) => (<SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Montant total du devis (HT)</Label>
                                    <Input inputMode="decimal" value={editForm.quote_amount} onChange={(e) => setEditForm((f) => ({ ...f, quote_amount: e.target.value }))} />
                                  </div>

                                  {/* Budgets par service en édition */}
                                  <div className="col-span-2 grid gap-2">
                                    <Label>Budgets par service (HT)</Label>
                                    <div className="grid gap-3 md:grid-cols-3">
                                      <div className="grid gap-1">
                                        <Label className="text-xs text-[#214A33]/80">Conception</Label>
                                        <Input inputMode="decimal" value={editForm.budget_conception} onChange={(e) => setEditForm((f) => ({ ...f, budget_conception: e.target.value }))} />
                                        <div className="text-[11px] text-[#214A33]/60">Heures max: {hEdit.conc ?? "—"}</div>
                                      </div>
                                      <div className="grid gap-1">
                                        <Label className="text-xs text-[#214A33]/80">Créa</Label>
                                        <Input inputMode="decimal" value={editForm.budget_crea} onChange={(e) => setEditForm((f) => ({ ...f, budget_crea: e.target.value }))} />
                                        <div className="text-[11px] text-[#214A33]/60">Heures max: {hEdit.crea ?? "—"}</div>
                                      </div>
                                      <div className="grid gap-1">
                                        <Label className="text-xs text-[#214A33]/80">Dev</Label>
                                        <Input inputMode="decimal" value={editForm.budget_dev} onChange={(e) => setEditForm((f) => ({ ...f, budget_dev: e.target.value }))} />
                                        <div className="text-[11px] text-[#214A33]/60">Heures max: {hEdit.dev ?? "—"}</div>
                                      </div>
                                    </div>
                                    <div className="text-[11px] text-[#214A33]/60">
                                      Total heures max (indicatif): {hEdit.total ?? "—"} h {selectedEditTariff ? "" : "(sélectionnez un barème pour calculer)"} 
                                    </div>
                                  </div>

                                  <div className="grid gap-2">
                                    <Label>Échéance</Label>
                                    <Input type="date" value={editForm.due_date} onChange={(e) => setEditForm((f) => ({ ...f, due_date: e.target.value }))} />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Effort (jours)</Label>
                                    <Input inputMode="decimal" value={editForm.effort_days} onChange={(e) => setEditForm((f) => ({ ...f, effort_days: e.target.value }))} />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setOpenEditFor(null)}>Annuler</Button>
                                  <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={confirmEdit}>Enregistrer</Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>

                            {/* Finaliser (actif -> pause) */}
                            {p.status === "active" && (
                              <AlertDialog open={finalizeFor?.id === p.id} onOpenChange={(o) => (o ? setFinalizeFor(p) : setFinalizeFor(null))}>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">
                                    <Archive className="mr-2 h-4 w-4" />
                                    Finaliser
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Finaliser ce projet ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cela met le projet en pause (statut “on hold”) et supprime les créneaux planifiés à venir. L’historique passé est conservé.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                                    <AlertDialogAction onClick={onFinalize}>Finaliser</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}

                            {/* Rouvrir (pause/archivé -> actif) */}
                            {(p.status === "onhold" || p.status === "archived") && (
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => reopen(p)}>
                                <Play className="mr-2 h-4 w-4" />
                                Rouvrir
                              </Button>
                            )}

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
                                  <AlertDialogDescription>Les affectations et créneaux liés seront supprimés.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteProject(p.id).then(() => refresh()).then(() => showSuccess("Projet supprimé.")).catch((e) => showError(e?.message || "Suppression impossible."))}>Supprimer</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </td>
                        </tr>

                        {open && (
                          <tr className="border-t border-[#BFBFBF]/60 bg-white/60">
                            <td colSpan={6} className="p-3">
                              <div className="grid grid-cols-3 gap-3 text-sm text-[#214A33]">
                                <div className="rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Client</div>
                                  <div>{client ? `${client.code} — ${client.name}` : "—"}</div>
                                </div>
                                <div className="rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Devis HT</div>
                                  <div className="tabular-nums">{eur(p.quote_amount)}</div>
                                </div>
                                <div className="rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Coût planifié</div>
                                  <div className="tabular-nums">{eur(costPlanned)}</div>
                                </div>
                                <div className="rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Coût actuel</div>
                                  <div className="tabular-nums">{eur(costActual)}</div>
                                </div>
                                <div className="rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Échéance</div>
                                  <div>{p.due_date ?? "—"}</div>
                                </div>
                                <div className="rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Effort (jours)</div>
                                  <div>{p.effort_days ?? "—"}</div>
                                </div>
                                <div className="col-span-3 rounded-md border border-[#BFBFBF]/60 bg-[#F7F7F7] p-2">
                                  <div className="text-xs text-[#214A33]/70">Salariés affectés</div>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {assigned.length === 0 ? (
                                      <span className="text-xs text-[#214A33]/60">Aucun</span>
                                    ) : (
                                      assigned.map((e) => (
                                        <Badge key={e.id} variant="secondary" className="border-[#BFBFBF] text-[#214A33]">
                                          {fullName(e)}
                                        </Badge>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
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