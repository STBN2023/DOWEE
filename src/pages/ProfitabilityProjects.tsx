import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { getProjectsProfitability, type ProjectProfit } from "@/api/projectProfitability";
import HelpInfo from "@/components/HelpInfo";
import { Bot as BotIcon } from "lucide-react";

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

type SortKey = "code" | "client" | "sold" | "cost" | "margin" | "margin_pct";
type SortDir = "asc" | "desc";

const ProfitabilityProjects: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<ProjectProfit[]>([]);
  const [clientId, setClientId] = React.useState<string>("all");
  const [q, setQ] = React.useState("");
  const [sort, setSort] = React.useState<{ key: SortKey; dir: SortDir }>({ key: "margin_pct", dir: "desc" });
  const [exporting, setExporting] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getProjectsProfitability(clientId !== "all" ? { client_id: clientId } : undefined);
      setRows(data.projects);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement de la rentabilité projets.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  React.useEffect(() => { load(); }, [load]);

  const clients = React.useMemo(() => {
    const map = new Map<string, { id: string; label: string }>();
    for (const p of rows) {
      if (p.client) map.set(p.client.id, { id: p.client.id, label: `${p.client.code} — ${p.client.name}` });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [rows]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    let arr = [...rows];
    if (needle) {
      arr = arr.filter((r) => (r.code + " " + r.name).toLowerCase().includes(needle));
    }
    const dirMul = sort.dir === "asc" ? 1 : -1;
    arr.sort((a, b) => {
      const va = sort.key === "code" ? a.code
        : sort.key === "client" ? (a.client?.name ?? "")
        : sort.key === "sold" ? a.sold_ht
        : sort.key === "cost" ? a.cost_realized
        : sort.key === "margin" ? a.margin
        : (a.margin_pct ?? -Infinity);
      const vb = sort.key === "code" ? b.code
        : sort.key === "client" ? (b.client?.name ?? "")
        : sort.key === "sold" ? b.sold_ht
        : sort.key === "cost" ? b.cost_realized
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

  const exportCsv = async () => {
    try {
      setExporting(true);
      const body: any = { action: "export" };
      if (clientId !== "all") body.client_id = clientId;
      const res = await supabase.functions.invoke("export-projects-profitability", { body });
      const csv = res.data as string;
      if (!csv || typeof csv !== "string") throw new Error("Export vide.");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const today = new Date().toISOString().slice(0, 10);
      const suffix = clientId !== "all" ? `_client_${clientId.slice(0,8)}` : "";
      a.href = url;
      a.download = `projects_profitability_${today}${suffix}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showSuccess("Export CSV généré.");
    } catch (e: any) {
      showError(e?.message || "Export impossible.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-[#214A33]">Rentabilité — Projets</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-[260px]">
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher projet…" />
            </div>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="w-[320px] bg-white border-[#BFBFBF] text-[#214A33]">
                <SelectValue placeholder="Filtrer par client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les clients</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90" onClick={exportCsv} disabled={exporting}>
              {exporting ? "Export…" : "Exporter CSV"}
            </Button>
            <Button
              variant="outline"
              className="border-[#BFBFBF] text-[#214A33]"
              onClick={() => window.dispatchEvent(new Event("dowee:bot:open"))}
            >
              <BotIcon className="mr-2 h-4 w-4" />
              Ouvrir le bot
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Encart d’aide + lien vers bot */}
          <div className="mb-3 rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 text-sm text-[#214A33]">
            Besoin du détail du calcul ? Cliquez sur les badges (i) ou
            <button
              type="button"
              onClick={() => window.dispatchEvent(new Event("dowee:bot:open"))}
              className="ml-1 inline-flex items-center underline decoration-[#214A33]/40 underline-offset-2 hover:text-[#214A33]/80"
            >
              ouvrez le bot
            </button>
            {" "}pour poser vos questions.
          </div>

          {errorMsg && <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">{errorMsg}</div>}

          <div className="overflow-x-auto rounded-md border border-[#BFBFBF] bg-white">
            <table className="w-full border-collapse text-sm">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("code")}>
                    Projet
                  </th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33] cursor-pointer" onClick={() => setSortKey("client")}>
                    Client
                  </th>
                  <th className="p-2 text-right text-sm font-semibold text-[#214A33]">
                    <div className="inline-flex items-center">
                      CA vendu
                      <HelpInfo
                        title="CA vendu — mode de calcul"
                        botHint="Besoin de détails chiffrés ? Posez la question au bot."
                      >
                        <ul className="list-disc pl-4">
                          <li>Valeur HT vendue du projet.</li>
                          <li>Utilise projects.quote_amount si renseigné, sinon somme des budgets par service (conception + créa + dev).</li>
                        </ul>
                      </HelpInfo>
                    </div>
                  </th>
                  <th className="p-2 text-right text-sm font-semibold text-[#214A33]">
                    <div className="inline-flex items-center">
                      Coût
                      <HelpInfo
                        title="Coût — mode d’estimation"
                        botHint="Demandez au bot comment ce coût est estimé pour un projet donné."
                      >
                        <ul className="list-disc pl-4">
                          <li>Heures réelles (actual_items) × taux horaire par équipe.</li>
                          <li>À défaut d’heures réelles, on utilise les heures planifiées (plan_items).</li>
                          <li>Taux issus de ref_internal_costs (€/jour ÷ 8) — défaut: 800/500/800 €/j (conc./créa/dev).</li>
                        </ul>
                      </HelpInfo>
                    </div>
                  </th>
                  <th className="p-2 text-right text-sm font-semibold text-[#214A33]">
                    <div className="inline-flex items-center">
                      Marge
                      <HelpInfo
                        title="Marge — définition"
                        botHint="Le bot peut expliquer les écarts de marge projet par projet."
                      >
                        <ul className="list-disc pl-4">
                          <li>marge (€) = CA vendu − coût réalisé (estimé).</li>
                        </ul>
                      </HelpInfo>
                    </div>
                  </th>
                  <th className="p-2 text-right text-sm font-semibold text-[#214A33]">
                    <div className="inline-flex items-center">
                      Marge %
                      <HelpInfo
                        title="Marge % — calcul"
                        botHint="Posez au bot: “comment est la marge % de ACME-2025-001 ?”"
                      >
                        <ul className="list-disc pl-4">
                          <li>marge % = (marge / CA vendu) × 100.</li>
                          <li>Affichée uniquement si CA vendu &gt; 0.</li>
                        </ul>
                      </HelpInfo>
                    </div>
                  </th>
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
                  filtered.map((p) => (
                    <tr key={p.project_id} className="border-t border-[#BFBFBF]">
                      <td className="p-2">
                        <div className="text-[#214A33]"><span className="font-medium">{p.code}</span> — {p.name}</div>
                      </td>
                      <td className="p-2">{p.client ? `${p.client.code} — ${p.client.name}` : "—"}</td>
                      <td className="p-2 text-right">{eur(p.sold_ht)}</td>
                      <td className="p-2 text-right">{eur(p.cost_realized)}</td>
                      <td className="p-2 text-right">{eur(p.margin)}</td>
                      <td className="p-2 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="tabular-nums">{p.margin_pct == null ? "—" : `${p.margin_pct.toFixed(0)}%`}</span>
                          {marginBadge(p.margin_pct)}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[11px] text-[#214A33]/60">
            Astuce: sur mobile, cliquez le badge (i) pour ouvrir l’aide.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfitabilityProjects;