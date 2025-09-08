import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getClientsProfitability, type ClientProfit } from "@/api/clientProfitability";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}
function marginBadge(pct: number | null) {
  if (pct == null) return <Badge variant="secondary" className="border-[#BFBFBF] text-[#214A33]">—</Badge>;
  if (pct <= 0) return <Badge className="bg-red-50 text-red-700 border border-red-200">≤ 0%</Badge>;
  if (pct < 20) return <Badge className="bg-orange-50 text-orange-700 border border-orange-200">1–19%</Badge>;
  if (pct < 40) return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">20–39%</Badge>;
  return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">≥ 40%</Badge>;
}

type SortKey = "name" | "projects" | "sold" | "cost" | "margin" | "margin_pct";
type SortDir = "asc" | "desc";

const ProfitabilityClients: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ClientProfit[]>([]);
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({ key: "margin_pct", dir: "desc" });

  React.useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getClientsProfitability();
        setRows(data.clients);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erreur lors du chargement de la rentabilité clients.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = [...rows];
    if (needle) {
      arr = arr.filter((r) => (r.name || "").toLowerCase().includes(needle) || (r.code || "").toLowerCase().includes(needle));
    }
    const dirMul = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const va = sort.key === "name" ? a.name
        : sort.key === "projects" ? a.projects_count
        : sort.key === "sold" ? a.sold_total_ht
        : sort.key === "cost" ? a.cost_total
        : sort.key === "margin" ? a.margin
        : (a.margin_pct ?? -Infinity);
      const vb = sort.key === "name" ? b.name
        : sort.key === "projects" ? b.projects_count
        : sort.key === "sold" ? b.sold_total_ht
        : sort.key === "cost" ? b.cost_total
        : sort.key === "margin" ? b.margin
        : (b.margin_pct ?? -Infinity);

      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dirMul;
      const na = Number(va ?? 0), nb = Number(vb ?? 0);
      return (na - nb) * dirMul;
    });
    return arr;
  }, [rows, q, sort]);

  const setSortKey = (key: SortKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[#214A33]">Rentabilité — Clients</CardTitle>
          <div className="w-[260px]">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher client…" />
          </div>
        </CardHeader>
        <CardContent>
          {errorMsg && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMsg}</div>}

          <div className="overflow-x-auto rounded-md border border-[#BFBFBF] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("name")}>Client</th>
                  <th className="p-2 text-right font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("projects")}>Projets</th>
                  <th className="p-2 text-right font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("sold")}>CA vendu</th>
                  <th className="p-2 text-right font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("cost")}>Coût</th>
                  <th className="p-2 text-right font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("margin")}>Marge</th>
                  <th className="p-2 text-right font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("margin_pct")}>Marge %</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[#214A33]/60">Chargement…</td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-[#214A33]/60">Aucun résultat.</td>
                  </tr>
                ) : (
                  filtered.map((r) => (
                    <tr key={r.client_id} className="border-t border-[#BFBFBF]">
                      <td className="p-2">
                        <div className="text-[#214A33]"><span className="font-medium">{r.code}</span> — {r.name}</div>
                      </td>
                      <td className="p-2 text-right">{r.projects_count}</td>
                      <td className="p-2 text-right">{eur(r.sold_total_ht)}</td>
                      <td className="p-2 text-right">{eur(r.cost_total)}</td>
                      <td className="p-2 text-right">{eur(r.margin)}</td>
                      <td className="p-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="tabular-nums">{r.margin_pct == null ? "—" : `${r.margin_pct.toFixed(0)}%`}</span>
                          {marginBadge(r.margin_pct)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[11px] text-[#214A33]/60">
            Codes couleur: ≥40% vert, 20–39% jaune, 1–19% orange, ≤0% rouge (cf. document).
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityClients;