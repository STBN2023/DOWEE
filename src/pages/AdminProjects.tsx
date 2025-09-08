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
import { Pencil, Plus, Users, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import {
  createProject,
  listAdminProjects,
  setProjectAssignments,
  updateProject,
  deleteProject,
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
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

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

// Helpers score (cohérents avec l’edge function)
function sClient(segment?: string | null): number {
  if (!segment) return 50;
  const b = segment.toLowerCase();
  if (b.includes("super")) return 80;
  if (b.includes("pas")) return 20;
  return 50;
}
function sMarge(pct: number | null): number {
  if (pct == null) return 50;
  if (pct <= 0) return 0;
  if (pct < 20) return 20 + 2 * (pct - 1);
  if (pct < 40) return 60 + 2 * (pct - 20);
  return 100;
}
function daysLeftFromIso(iso?: string | null): number | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  const due = new Date(Date.UTC(y, m - 1, d));
  const today = new Date();
  const now = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays;
}
function sUrgence(daysLeft: number | null, effortDays: number | null): number {
  if (daysLeft == null || effortDays == null || effortDays <= 0) return 50;
  const B = daysLeft / effortDays;
  if (B <= 0) return 100;
  if (B < 1) return 90;
  if (B < 3) return 60;
  return 20;
}
function clamp100(n: number) { return Math.min(100, Math.max(0, n)); }

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
    due_date: string; // YYYY-MM-DD
    effort_days: string; // as text, convert to number
  }>({
    name: "",
    status: "active",
    client_id: "",
    tariff_id: null,
    quote_amount: "",
    due_date: "",
    effort_days: "",
  });

  // Affectations
  const [openAssignFor, setOpenAssignFor] = React.useState<string | null>(null);
  const [assignSelection, setAssignSelection] = React.useState<Record<string, boolean>>({});

  // Edition
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

  // Aide Score
  const [showScoreHelp, setShowScoreHelp] = React.useState<boolean>(false);
  // Détails par ligne
  const [openRows, setOpenRows] = React.useState<Record<string, boolean>>({});

  // Filtres + tri
  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"all" | Status>("all");
  const [clientFilter, setClientFilter] = React.useState<string>("all");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({ key: "score", dir: "desc" });

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

  const onCreateProject = async () => {
    const name = form.name.trim();
    const client_id = form.client_id;
    if (!name || !client_id) {
      showError("Nom et client requis.");
      return;
    }
    const quote = form.quote_amount ? Number(form.quote_amount.replace(",", ".")) : null;
    const due_date = form.due_date.trim() ? form.due_date.trim() : null;
    const effort_days_val = form.effort_days.trim() === "" ? null : Number(form.effort_days.replace(",", "."));
    const effort_days = isFinite(Number(effort_days_val)) ? Number(effort_days_val) : null;

    try {
      const created = await createProject({
        name,
        status: form.status,
        client_id,
        tariff_id: form.tariff_id || null,
        quote_amount: isFinite(Number(quote)) ? Number(quote) : null,
        due_date,
        effort_days,
      });
      showSuccess(`Projet créé: ${created.code}`);
      setForm({ name: "", status: "active", client_id: "", tariff_id: null, quote_amount: "", due_date: "", effort_days: "" });
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
    const quote = editForm.quote_amount ? Number(editForm.quote_amount.replace(",", ".")) : null;
    const due_date = editForm.due_date.trim() ? editForm.due_date.trim() : null;
    const effort_days_val = editForm.effort_days.trim() === "" ? null : Number(editForm.effort_days.replace(",", "."));
    const effort_days = isFinite(Number(effort_days_val)) ? Number(effort_days_val) : null;

    try {
      await updateProject(openEditFor.id, {
        name,
        status: editForm.status,
        client_id: editForm.client_id,
        tariff_id: editForm.tariff_id || null,
        quote_amount: isFinite(Number(quote)) ? Number(quote) : null,
        // budgets laissés à part ici; la modale actuelle se concentre sur champs principaux
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

  // Liste filtrée + triée
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

      // score
      const sa = scoreDetails[a.id]?.score ?? -Infinity;
      const sb = scoreDetails[b.id]?.score ?? -Infinity;
      return (sa - sb) * dirMul;
    });

    return arr;
  }, [projects, q, statusFilter, clientFilter, sort, scoreDetails]);

  const toggleRow = (id: string) => setOpenRows((prev) => ({ ...prev, [id]: !prev[id] }));

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
                <DialogDescription>Le code est généré (CLIENT-YYYY-NNN).</DialogDescription>
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
          {/* Aide Score + Toggle */}
          <div className="mb-3 rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 text-[12px] text-[#214A33]">
            <div className="flex items-center justify-between">
              <div className="font-medium">Comment est calculé le Score ?</div>
              <Button size="sm" variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setShowScoreHelp((v) => !v)}>
                {showScoreHelp ? (<><ChevronUp className="mr-2 h-4 w-4" />Masquer</>) : (<><ChevronDown className="mr-2 h-4 w-4" />Afficher</>)}
              </Button>
            </div>
            <ul className="mt-2 list-disc pl-5 space-y-0.5">
              <li>Score = (0,25×S_client + 0,35×S_marge + 0,20×S_urgence + 0,10×S_récurrence + 0,10×S_strat) × (★ ? 1,15 : 1).</li>
              <li>S_urgence utilise B = Jours restants / Effort (jours).</li>
            </ul>
          </div>

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
            <div className="col-span-2 flex items-center gap-2">
              <Select value={sort.key} onValueChange={(v) => setSort((s) => ({ ...s, key: v as SortKey }))}>
                <SelectTrigger className="bg-white border-[#BFBFBF] text-[#214A33]"><SelectValue placeholder="Tri" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="score">Score</SelectItem>
                  <SelectItem value="code">Code</SelectItem>
                  <SelectItem value="name">Nom</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sort.dir} onValueChange={(v) => setSort((s) => ({ ...s, dir: v as SortDir }))}>
                <SelectTrigger className="w-[130px] bg-white border-[#BFBFBF] text-[#214A33]"><SelectValue placeholder="Sens" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Croissant</SelectItem>
                  <SelectItem value="desc">Décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tableau compact */}
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
                    const seg = details?.segment ?? null;
                    const star = !!details?.star;
                    const margin_pct = details?.margin_pct ?? null;
                    const dueIso = details?.due_date ?? null;
                    const effortDays = details?.effort_days ?? null;
                    const dLeft = daysLeftFromIso(dueIso);
                    const B = (dLeft == null || effortDays == null || effortDays <= 0) ? null : (dLeft / effortDays);
                    const sClientVal = sClient(seg);
                    const sMargeVal = sMarge(margin_pct);
                    const sUrgVal = sUrgence(dLeft, effortDays);
                    const raw = 0.25 * sClientVal + 0.35 * sMargeVal + 0.20 * sUrgVal;
                    const final = clamp100(Math.round((raw * (star ? 1.15 : 1)) * 100) / 100);

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
                              <HoverCard>
                                <HoverCardTrigger asChild>
                                  <span className={cn("inline-flex cursor-help rounded-full px-2 py-0.5 text-xs font-semibold", scoreBadge(sc))}>
                                    {Math.round(sc).toString().padStart(2, "0")}
                                  </span>
                                </HoverCardTrigger>
                                <HoverCardContent className="w-80 text-xs">
                                  <div className="space-y-1 text-[#214A33]">
                                    <div className="font-medium">Détail du score</div>
                                    <div className="grid grid-cols-2 gap-1">
                                      <div>Segment client</div><div className="text-right">{seg ?? "—"} {star ? "★" : ""}</div>
                                      <div>S_client</div><div className="text-right">{sClientVal}</div>
                                      <div>Marge %</div><div className="text-right">{margin_pct == null ? "—" : `${margin_pct.toFixed(0)}%`}</div>
                                      <div>S_marge</div><div className="text-right">{Math.round(sMargeVal)}</div>
                                      <div>Échéance</div><div className="text-right">{dueIso ?? "—"}</div>
                                      <div>Effort (j)</div><div className="text-right">{effortDays ?? "—"}</div>
                                      <div>Ratio B</div><div className="text-right">{B == null ? "—" : B.toFixed(2)}</div>
                                      <div>S_urgence</div><div className="text-right">{sUrgVal}</div>
                                    </div>
                                  </div>
                                </HoverCardContent>
                              </HoverCard>
                            )}
                          </td>
                          <td className="p-2">
                            <Button variant="outline" size="sm" className="border-[#BFBFBF] text-[#214A33]" onClick={() => toggleRow(p.id)}>
                              {open ? (<><ChevronUp className="mr-2 h-4 w-4" />Masquer</>) : (<><ChevronDown className="mr-2 h-4 w-4" />Détails</>)}
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
                                  <Button className="bg-[#F2994A] hover:bg-[#F2994A]/90 text-white" onClick={confirmAssign}>Enregistrer</Button>
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
                                  <div className="text-xs text-[#214A33]/70">Effort (jours) / B</div>
                                  <div>{p.effort_days ?? "—"} {(() => {
                                    const dLeft = daysLeftFromIso(p.due_date ?? null);
                                    const eDays = p.effort_days ?? null;
                                    const b = (dLeft == null || eDays == null || eDays <= 0) ? null : (dLeft / eDays);
                                    return b != null ? `(B=${b.toFixed(2)})` : "";
                                  })()}</div>
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