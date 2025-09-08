import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortfolioView, type PortfolioView } from "@/api/portfolioView";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}
const months = ["JANVIER","FEVRIER","MARS","AVRIL","MAI","JUIN","JUILLET","AOUT","SEPT.","OCT.","NOV.","DEC."];

const MePortfolio: React.FC = () => {
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
      const res = await getPortfolioView({ scope: "me", year });
      setData(res);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement de ma vue.");
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
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-sm text-[#214A33]">Année</div>
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
              <CardHeader><CardTitle className="text-[#214A33] text-base">Total vendu HT (mes projets)</CardTitle></CardHeader>
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
              <CardHeader><CardTitle className="text-[#214A33] text-base">Réalisé (mon coût)</CardTitle></CardHeader>
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
              <div className="mt-2 text-[11px] text-[#214A33]/60">Astuce: survolez le tableau pour défiler horizontalement.</div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default MePortfolio;