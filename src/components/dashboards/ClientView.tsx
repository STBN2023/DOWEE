import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientView, type ClientView } from "@/api/clientView";
import { listAdminProjects, type Project } from "@/api/adminProjects";
import { getProjectScores, type ProjectScore } from "@/api/projectScoring";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}

function marginBadge(pct: number | null) {
  if (pct == null) {
    return <Badge variant="secondary" className="border-[#BFBFBF] text-[#214A33]">—</Badge>;
  }
  if (pct <= 0) {
    return <Badge className="bg-red-50 text-red-700 border border-red-200">≤ 0%</Badge>;
  }
  if (pct < 20) {
    return <Badge className="bg-orange-50 text-orange-700 border border-orange-200">1–19%</Badge>;
  }
  if (pct < 40) {
    return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">20–39%</Badge>;
  }
  return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">≥ 40%</Badge>;
}

function scoreBadgeClass(score?: number | null) {
  if (score == null) return "bg-gray-100 text-gray-600 border border-gray-200";
  if (score >= 80) return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border border-amber-200";
  if (score >= 40) return "bg-orange-50 text-orange-700 border border-orange-200";
  return "bg-red-50 text-red-700 border border-red-200";
}

const months = ["JANVIER","FEVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOUT","SEPT.","OCT.","NOV.","DEC."];

const ClientView: React.FC = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = React.useState<number>(thisYear);
  const years = React.useMemo(() => [thisYear - 1, thisYear, thisYear + 1], [thisYear]);

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [projectId, setProjectId] = React.useState<string>("");

  const [data, setData] = React.useState<ClientView | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Scores de projets (map projet_id -> ProjectScore)
  const [scores, setScores] = React.useState<Record<string, ProjectScore>>({});

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const payload = await listAdminProjects();
        const active = payload.projects.filter((p) => p.status !== "archived");
        setProjects(active);
        setProjectId((prev) => prev || (active[0]?.id ?? ""));
      } catch (e: any) {
        setErrorMsg(e?.message || "Impossible de charger les projets.");
      }
    };
    loadProjects();
  }, []);

  // Charger tous les scores une fois
  React.useEffect(() => {
    const loadScores = async () => {
      try {
        const arr = await getProjectScores();
        const map: Record<string, ProjectScore> = {};
        arr.forEach((s) => { map[s.project_id] = s; });
        setScores(map);
      } catch {
        // silencieux: pas bloquant
      }
    };
    loadScores();
  }, []);

  const load = React.useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getClientView(projectId, year);
      setData(res);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement de la vue client.");
    } finally {
      setLoading(false);
    }
  }, [projectId, year]);

  React.useEffect(() => { load(); }, [load]);

  const weeklyByMonth = React.useMemo(() => {
    if (!data) return [];
    const buckets: Record<number, Array<{ week: number; hours: number }>> = {};
    data.weekly.weeks.forEach((w) => {
      if (!buckets[w.month]) buckets[w.month] = [];
      buckets[w.month].push({ week: w.week, hours: w.hours });
    });
    for (let m = 1; m <= 12; m++) {
      if (!buckets[m]) buckets[m] = [];
      buckets[m].sort((a, b) => a.week - b.week);
    }
    return buckets;
  }, [data]);

  const margin = React.useMemo(() => {
    if (!data) return { value: null as number | null, pct: null as number | null };
    const sold = data.sold.total_ht ?? 0;
    const cost = data.realized.total_cost ?? 0;
    const value = (sold || 0) - (cost || 0);
    const pct = sold ? (value / sold) * 100 : null;
    return { value, pct };
  }, [data]);

  const currentScore = React.useMemo(() => {
    if (!projectId) return null;
    const sc = scores[projectId]?.score;
    return typeof sc === "number" ? Math.round(sc) : null;
  }, [scores, projectId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[#214A33]">Projet</div>
        <Select value={projectId} onValueChange={(v) => setProjectId(v)}>
          <SelectTrigger className="w-[280px] bg-white border-[#BFBFBF] text-[#214A33]">
            <SelectValue placeholder="Choisir un projet" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-2 text-sm text-[#214A33]">Année</div>
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-[120px] bg-white border-[#BFBFBF] text-[#214A33]">
            <SelectValue placeholder="Année" />
          </SelectTrigger>
          <SelectContent>
            {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bandeau Note (score) */}
      {currentScore != null && (
        <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 inline-flex items-center gap-3">
          <div className="text-sm text-[#214A33]">Note (priorité)</div>
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-semibold", scoreBadgeClass(currentScore))}>
            {String(currentScore).padStart(2, "0")}
          </span>
          <div className="text-xs text-[#214A33]/70">Plus la note est haute, plus le projet est prioritaire.</div>
        </div>
      )}

      {errorMsg && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      )}

      {loading || !data ? (
        <div className="text-sm text-[#214A33]/70">Chargement…</div>
      ) : (
        <>
          {/* Bandeau Tarifs + Vendu/Réalisé */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-[#BFBFBF]">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Tarifs HT (par profil)</CardTitle></CardHeader>
              <CardContent>
                {data.project.tariff ? (
                  <div className="text-sm text-[#214A33]">
                    <div className="flex items-center justify-between border-b border-[#BFBFBF]/60 py-1"><span>Conception</span><span className="font-medium">{eur(data.project.tariff.rate_conception)}</span></div>
                    <div className="flex items-center justify-between border-b border-[#BFBFBF]/60 py-1"><span>Créa</span><span className="font-medium">{eur(data.project.tariff.rate_crea)}</span></div>
                    <div className="flex items-center justify-between py-1"><span>Dev</span><span className="font-medium">{eur(data.project.tariff.rate_dev)}</span></div>
                  </div>
                ) : (
                  <div className="text-sm text-[#214A33]/70">Aucun barème associé.</div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[#BFBFBF] md:col-span-2">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Synthèse financière</CardTitle></CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
                    <div className="text-sm text-[#214A33]/80">Total vendu HT</div>
                    <div className="text-2xl font-semibold text-[#214A33]">{eur(data.sold.total_ht)}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#214A33]">
                      <div>Conc.: <span className="font-medium">{eur(data.sold.by_section.conception)}</span></div>
                      <div>Créa: <span className="font-medium">{eur(data.sold.by_section.crea)}</span></div>
                      <div>Dev: <span className="font-medium">{eur(data.sold.by_section.dev)}</span></div>
                    </div>
                  </div>
                  <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
                    <div className="text-sm text-[#214A33]/80">Réalisé (coût)</div>
                    <div className="text-2xl font-semibold text-[#214A33]">{eur(data.realized.total_cost)}</div>
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#214A33]">
                      <div>Conc.: <span className="font-medium">{eur(data.realized.by_section.conception.cost)}</span></div>
                      <div>Créa: <span className="font-medium">{eur(data.realized.by_section.crea.cost)}</span></div>
                      <div>Dev: <span className="font-medium">{eur(data.realized.by_section.dev.cost)}</span></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rentabilité (marge et % avec badge couleur) */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-[#BFBFBF] md:col-span-1">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Rentabilité</CardTitle></CardHeader>
              <CardContent>
                <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
                  <div className="text-sm text-[#214A33]/80">Marge</div>
                  <div className="text-2xl font-semibold text-[#214A33]">{eur(margin.value)}</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-[#214A33]">
                    <span className="tabular-nums">{margin.pct == null ? "—" : `${margin.pct.toFixed(0)}%`}</span>
                    {marginBadge(margin.pct)}
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-[#214A33]/60">
                  Codes couleur: ≥40% vert, 20–39% jaune, 1–19% orange, ≤0% rouge.
                </div>
              </CardContent>
            </Card>

            {/* Equipe / Heures */}
            <Card className="border-[#BFBFBF] md:col-span-2">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Équipe — Temps passé</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-2 text-xs text-[#214A33]/70">en heures</div>
                <div className="space-y-1">
                  {data.team.members.slice(0, 8).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{m.name}</span>
                      <span className="tabular-nums">{m.hours.toFixed(1)} h</span>
                    </div>
                  ))}
                  {data.team.members.length === 0 && (
                    <div className="text-sm text-[#214A33]/60">Aucune saisie.</div>
                  )}
                </div>
                <div className="mt-3 border-t border-[#BFBFBF]/60 pt-2 text-sm text-[#214A33]">
                  <div className="flex justify-between"><span>Conception</span><span className="tabular-nums">{data.team.totals.conception.toFixed(1)} h</span></div>
                  <div className="flex justify-between"><span>Créa</span><span className="tabular-nums">{data.team.totals.crea.toFixed(1)} h</span></div>
                  <div className="flex justify-between"><span>Dev</span><span className="tabular-nums">{data.team.totals.dev.toFixed(1)} h</span></div>
                  <div className="mt-1 flex justify-between font-medium"><span>Total</span><span className="tabular-nums">{data.team.totals.total.toFixed(1)} h</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau hebdo S1..S52 */}
          <Card className="border-[#BFBFBF]">
            <CardHeader><CardTitle className="text-[#214A33] text-base">Répartition hebdomadaire — {year}</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-auto rounded-md border border-[#BFBFBF]">
                <table className="w-[900px] min-w-full border-collapse text-xs">
                  <thead>
                    <tr>
                      {months.map((m) => (
                        <th key={m} className="bg-[#F7F7F7] p-2 text-left font-semibold text-[#214A33]">{m}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {Array.from({ length: 12 }).map((_, mi) => {
                        const monthIdx = mi + 1;
                        const weeks = weeklyByMonth[monthIdx] ?? [];
                        return (
                          <td key={monthIdx} className="align-top border-t border-[#BFBFBF] p-1">
                            <div className="grid grid-cols-6 gap-1">
                              {weeks.map((w) => (
                                <div key={w.week} className={cn(
                                  "rounded-sm border border-[#BFBFBF]/60 px-1 py-0.5 text-center",
                                  w.hours > 0 ? "bg-[#F2994A]/10 text-[#214A33]" : "bg-white text-[#214A33]/60"
                                )}>
                                  <div className="text-[10px] font-medium">S{w.week}</div>
                                  <div className="tabular-nums">{w.hours.toFixed(1)}</div>
                                </div>
                              ))}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 text-[11px] text-[#214A33]/60">Astuce: survolez le tableau pour défiler horizontalement si besoin.</div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ClientView;