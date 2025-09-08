import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getClientView, type ClientView } from "@/api/clientView";
import { listAdminProjects, type Project } from "@/api/adminProjects";
import { cn } from "@/lib/utils";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
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

  React.useEffect(() => {
    const loadProjects = async () => {
      try {
        const payload = await listAdminProjects();
        setProjects(payload.projects.filter((p) => p.status !== "archived"));
        setProjectId((prev) => prev || (payload.projects.find((p) => p.status !== "archived")?.id ?? ""));
      } catch (e: any) {
        setErrorMsg(e?.message || "Impossible de charger les projets.");
      }
    };
    loadProjects();
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

          {/* Equipe / Heures */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-[#BFBFBF] md:col-span-1">
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

            {/* Tableau hebdo S1..S52 */}
            <Card className="border-[#BFBFBF] md:col-span-2">
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
          </div>
        </>
      )}
    </div>
  );
};

export default ClientView;