import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortfolioView, type PortfolioView } from "@/api/portfolioView";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}
const months = ["JANVIER","FEVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOUT","SEPT.","OCT.","NOV.","DEC."];

const GlobalPortfolio: React.FC = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = React.useState<number>(thisYear);
  const years = React.useMemo(() => [thisYear - 1, thisYear, thisYear + 1], [thisYear]);

  const [data, setData] = React.useState<PortfolioView | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getPortfolioView({ scope: "global", year });
      setData(res);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement de la vue globale.");
    } finally {
      setLoading(false);
    }
  }, [year]);

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
    <div className="mt-2 space-y-3">
      <div className="flex items-center gap-2">
        <div className="text-xs text-[#214A33]">Année</div>
        <div className="flex gap-1">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className={`rounded md:rounded-md border px-2 py-1 text-xs ${year === y ? "border-[#214A33] bg-[#214A33] text-white" : "border-[#BFBFBF] bg-white text-[#214A33]"}`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {errorMsg && <div className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">{errorMsg}</div>}

      {loading || !data ? (
        <div className="text-sm text-[#214A33]/70">Chargement…</div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-2">
            <Card className="border-[#BFBFBF]">
              <CardHeader className="py-2"><CardTitle className="text-[#214A33] text-sm">Total vendu HT</CardTitle></CardHeader>
              <CardContent className="py-2">
                <div className="text-xl font-semibold text-[#214A33]">{eur(data.sold.total_ht)}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-[#214A33]">
                  <div>Conc.: <span className="font-medium">{eur(data.sold.by_section.conception)}</span></div>
                  <div>Créa: <span className="font-medium">{eur(data.sold.by_section.crea)}</span></div>
                  <div>Dev: <span className="font-medium">{eur(data.sold.by_section.dev)}</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-[#BFBFBF]">
              <CardHeader className="py-2"><CardTitle className="text-[#214A33] text-sm">Réalisé (coût)</CardTitle></CardHeader>
              <CardContent className="py-2">
                <div className="text-xl font-semibold text-[#214A33]">{eur(data.realized.total_cost)}</div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-[11px] text-[#214A33]">
                  <div>Conc.: <span className="font-medium">{eur(data.realized.by_section.conception.cost)}</span></div>
                  <div>Créa: <span className="font-medium">{eur(data.realized.by_section.crea.cost)}</span></div>
                  <div>Dev: <span className="font-medium">{eur(data.realized.by_section.dev.cost)}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Card className="border-[#BFBFBF] md:col-span-1">
              <CardHeader className="py-2"><CardTitle className="text-[#214A33] text-sm">Top membres — Heures</CardTitle></CardHeader>
              <CardContent className="py-2">
                <div className="mb-1 text-[11px] text-[#214A33]/70">en heures</div>
                <div className="space-y-1">
                  {data.team.members.slice(0, 6).map((m) => (
                    <div key={m.id} className="flex items-center justify-between text-xs">
                      <span className="truncate">{m.name}</span>
                      <span className="tabular-nums">{m.hours.toFixed(1)} h</span>
                    </div>
                  ))}
                  {data.team.members.length === 0 && (
                    <div className="text-xs text-[#214A33]/60">Aucune saisie.</div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[#BFBFBF] md:col-span-2">
              <CardHeader className="py-2"><CardTitle className="text-[#214A33] text-sm">Répartition hebdomadaire — {year}</CardTitle></CardHeader>
              <CardContent className="py-2">
                <div className="overflow-auto rounded-md border border-[#BFBFBF]">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        {months.map((m) => (
                          <th key={m} className="bg-[#F7F7F7] p-1.5 text-left font-semibold text-[#214A33]">{m}</th>
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
                                  <div key={w.week} className="rounded-sm border border-[#BFBFBF]/60 px-1 py-0.5 text-center bg-white text-[#214A33]">
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
                <div className="mt-1 text-[10px] text-[#214A33]/60">Astuce: défilez horizontalement si besoin.</div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default GlobalPortfolio;