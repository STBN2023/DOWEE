import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/context/RoleContext";
import { mondayOf } from "@/utils/date";
import { getMetricsOverview } from "@/api/metrics";
import { useAuth } from "@/context/AuthContext";
import { getTimeCostOverview, type TimeCostOverview } from "@/api/timeCost";

const Dashboards = () => {
  const { role } = useRole();
  const { loading: authLoading, employee } = useAuth();
  const defaultTab = role === "admin" ? "global" : role === "manager" ? "team" : "me";

  const [globalStats, setGlobalStats] = React.useState<{ total: number; active: number; onhold: number }>({ total: 0, active: 0, onhold: 0 });
  const [teamStats, setTeamStats] = React.useState<{ commercial: number; crea: number; dev: number }>({ commercial: 0, crea: 0, dev: 0 });

  const [tc, setTc] = React.useState<TimeCostOverview | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (authLoading || !employee) return;

    const load = async () => {
      setErrorMsg(null);
      try {
        const [metrics, timeCost] = await Promise.all([
          getMetricsOverview(),
          getTimeCostOverview({ start: mondayOf(new Date()).toISOString().slice(0, 10) }),
        ]);

        setGlobalStats({
          total: metrics.global.nb_projects_total,
          active: metrics.global.nb_projects_active,
          onhold: metrics.global.nb_projects_onhold,
        });
        const commercial = metrics.byTeam.find((t) => t.team === "commercial")?.nb_projects_active_distinct ?? 0;
        const crea = metrics.byTeam.find((t) => t.team === "créa")?.nb_projects_active_distinct ?? 0;
        const dev = metrics.byTeam.find((t) => t.team === "dev")?.nb_projects_active_distinct ?? 0;
        setTeamStats({ commercial, crea, dev });

        setTc(timeCost);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erreur lors du chargement des métriques.");
      }
    };
    load();
  }, [authLoading, employee]);

  const rangeLabel = React.useMemo(() => {
    if (!tc?.range) return "";
    try {
      const s = new Date(tc.range.start);
      const e = new Date(tc.range.end);
      return `${s.toLocaleDateString("fr-FR")} – ${e.toLocaleDateString("fr-FR")}`;
    } catch {
      return `${tc?.range.start} – ${tc?.range.end}`;
    }
  }, [tc?.range]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold text-[#214A33]">Tableaux de bord</h1>
      <div className="mb-4 text-xs text-[#214A33]/70">
        Semaine: {rangeLabel || "—"}
      </div>
      {errorMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      )}
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-[#F7F7F7]">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="me">Moi</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Projets total" value={`${globalStats.total}`} />
            <StatCard title="Actifs" value={`${globalStats.active}`} />
            <StatCard title="En pause" value={`${globalStats.onhold}`} />
          </div>
          <h2 className="mt-6 mb-2 text-lg font-semibold text-[#214A33]">Temps (semaine)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Heures planifiées" value={`${tc?.global.hours_planned?.toFixed(1) ?? "0.0"} h`} />
            <StatCard title="Heures réelles" value={`${tc?.global.hours_actual?.toFixed(1) ?? "0.0"} h`} />
          </div>
          <h2 className="mt-6 mb-2 text-lg font-semibold text-[#214A33]">Coûts (semaine)</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Coût planifié" value={eur(tc?.global.cost_planned)} />
            <StatCard title="Coût réel" value={eur(tc?.global.cost_actual)} />
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Commercial (actifs)" value={`${teamStats.commercial}`} />
            <StatCard title="Créa (actifs)" value={`${teamStats.crea}`} />
            <StatCard title="Dev (actifs)" value={`${teamStats.dev}`} />
          </div>
          <h2 className="mt-6 mb-2 text-lg font-semibold text-[#214A33]">Temps & Coûts par équipe (semaine)</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {["commercial", "créa", "dev"].map((t) => {
              const row = tc?.byTeam.find((x) => x.team === t);
              return (
                <Card key={t} className="border-[#BFBFBF]">
                  <CardHeader>
                    <CardTitle className="text-sm text-[#214A33]/80 capitalize">{t}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm text-[#214A33]">
                      <div className="mb-1">
                        <span className="font-medium">Heures:</span>{" "}
                        {row ? `${row.hours_planned.toFixed(1)} h plan / ${row.hours_actual.toFixed(1)} h réelles` : "—"}
                      </div>
                      <div>
                        <span className="font-medium">Coût:</span>{" "}
                        {row ? `${eur(row.cost_planned)} plan / ${eur(row.cost_actual)} réel` : "—"}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="me" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Mes heures planifiées (semaine)" value={`${tc?.me.hours_planned?.toFixed(1) ?? "0.0"} h`} />
            <StatCard title="Mes heures réelles (semaine)" value={`${tc?.me.hours_actual?.toFixed(1) ?? "0.0"} h`} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 mt-4">
            <StatCard title="Mon coût planifié (semaine)" value={eur(tc?.me.cost_planned)} />
            <StatCard title="Mon coût réel (semaine)" value={eur(tc?.me.cost_actual)} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ title, value }: { title: string; value: string }) => (
  <Card className="border-[#BFBFBF]">
    <CardHeader>
      <CardTitle className="text-sm text-[#214A33]/80">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl font-bold text-[#214A33]">{value}</div>
    </CardContent>
  </Card>
);

function eur(n: number | null | undefined): string {
  if (n == null) return "—";
  try {
    return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
  } catch {
    return `${n} €`;
  }
}

export default Dashboards;