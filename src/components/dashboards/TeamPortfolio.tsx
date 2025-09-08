import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getPortfolioView, type PortfolioView } from "@/api/portfolioView";
import { listTeams, type TeamRef, normalizeTeamSlug } from "@/api/teams";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}
const months = ["JANVIER","FEVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOUT","SEPT.","OCT.","NOV.","DEC."];

const fallbackTeams = [
  { slug: "conception", label: "Conception" },
  { slug: "créa", label: "Créa" },
  { slug: "dev", label: "Dev" },
];

const TeamPortfolio: React.FC = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = React.useState<number>(thisYear);
  const years = React.useMemo(() => [thisYear - 1, thisYear, thisYear + 1], [thisYear]);

  const [teams, setTeams] = React.useState<Array<{ slug: string; label: string }>>(fallbackTeams);
  const [team, setTeam] = React.useState<string>("conception");

  const [data, setData] = React.useState<PortfolioView | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadTeams = async () => {
      try {
        const refs = await listTeams();
        const normalized = refs.map((t: TeamRef) => ({ slug: normalizeTeamSlug(t.slug) || t.slug, label: t.label }));
        const uniq = new Map<string, string>();
        for (const t of normalized) { if (!uniq.has(t.slug)) uniq.set(t.slug, t.label); }
        const arr = Array.from(uniq.entries())
          .filter(([slug]) => ["conception", "créa", "dev"].includes(slug))
          .map(([slug, label]) => ({ slug, label }));
        if (arr.length > 0) setTeams(arr);
      } catch {
        // fallback already set
      }
    };
    loadTeams();
  }, []);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getPortfolioView({ scope: "team", team, year });
      setData(res);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement de la vue équipe.");
    } finally {
      setLoading(false);
    }
  }, [team, year]);

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
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-sm text-[#214A33]">Équipe</div>
        <Select value={team} onValueChange={(v) => setTeam(v)}>
          <SelectTrigger className="w-[220px] bg-white border-[#BFBFBF] text-[#214A33]">
            <SelectValue placeholder="Choisir une équipe" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (<SelectItem key={t.slug} value={t.slug}>{t.label}</SelectItem>))}
          </SelectContent>
        </Select>

        <div className="ml-2 text-sm text-[#214A33]">Année</div>
        <div className="flex gap-2">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`rounded-md border px-2 py-1 text-sm ${year === y ? "border-[#214A33] bg-[#214A33] text-white" : "border-[#BFBFBF] bg-white text-[#214A33]"}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>}

      {loading || !data ? (
        <div className="text-sm text-[#214A33]/70">Chargement…</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="border-[#BFBFBF]">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Total vendu HT</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-[#214A33]">{eur(data.sold.total_ht)}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#214A33]">
                  <div>Conc.: <span className="font-medium">{eur(data.sold.by_section.conception)}</span></div>
                  <div>Créa: <span className="font-medium">{eur(data.sold.by_section.crea)}</span></div>
                  <div>Dev: <span className="font-medium">{eur(data.sold.by_section.dev)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#BFBFBF]">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Réalisé (coût)</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold text-[#214A33]">{eur(data.realized.total_cost)}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-[#214A33]">
                  <div>Conc.: <span className="font-medium">{eur(data.realized.by_section.conception.cost)}</span></div>
                  <div>Créa: <span className="font-medium">{eur(data.realized.by_section.crea.cost)}</span></div>
                  <div>Dev: <span className="font-medium">{eur(data.realized.by_section.dev.cost)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-[#BFBFBF] md:col-span-1">
              <CardHeader><CardTitle className="text-[#214A33] text-base">Top membres — Heures</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-2 text-xs text-[#214A33]/70">en heures</div>
                <div className="space-y-1">
                  {data.team.members.slice(0, 10).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{m.name}</span>
                      <span className="tabular-nums">{m.hours.toFixed(1)} h</span>
                    </div>
                  ))}
                  {data.team.members.length === 0 && (
                    <div className="text-sm text-[#214A33]/60">Aucune saisie.</div>
                  )}
                </div>
              </CardContent>
            </Card>

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
                          const weeks = (data.weekly.weeks.filter((w) => w.month === monthIdx)).sort((a, b) => a.week - b.week);
                          return (
                            <td key={monthIdx} className="align-top border-t border-[#BFBFBF] p-1">
                              <div className="grid grid-cols-6 gap-1">
                                {weeks.map((w) => (
                                  <div key={w.week} className={`rounded-sm border px-1 py-0.5 text-center ${w.hours > 0 ? "border-[#BFBFBF]/60 bg-[#F2994A]/10 text-[#214A33]" : "border-[#BFBFBF]/40 bg-white text-[#214A33]/60"}`}>
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
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default TeamPortfolio;