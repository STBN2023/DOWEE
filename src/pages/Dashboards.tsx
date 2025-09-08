import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRole } from "@/context/RoleContext";
import { mondayOf } from "@/utils/date";
import { getMetricsOverview } from "@/api/metrics";
import { useAuth } from "@/context/AuthContext";
import { getTimeCostOverview, type TimeCostOverview } from "@/api/timeCost";
import ClientView from "@/components/dashboards/ClientView";
import GlobalPortfolio from "@/components/dashboards/GlobalPortfolio";
import TeamPortfolio from "@/components/dashboards/TeamPortfolio";
import MePortfolio from "@/components/dashboards/MePortfolio";
import { addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Home } from "lucide-react";

const Dashboards = () => {
  const { role } = useRole();
  const { loading: authLoading, employee } = useAuth();
  const defaultTab = role === "admin" ? "global" : role === "manager" ? "team" : "me";

  const [globalStats, setGlobalStats] = React.useState<{ total: number; active: number; onhold: number }>({ total: 0, active: 0, onhold: 0 });
  const [teamStats, setTeamStats] = React.useState<{ conception: number; crea: number; dev: number }>({ conception: 0, crea: 0, dev: 0 });

  const [tc, setTc] = React.useState<TimeCostOverview | null>(null);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [showGlobalDetails, setShowGlobalDetails] = React.useState(false);

  // Nouvelle navigation de semaine
  const [weekStart, setWeekStart] = React.useState<Date>(() => mondayOf(new Date()));

  React.useEffect(() => {
    if (authLoading || !employee) return;

    const load = async () => {
      setErrorMsg(null);
      try {
        const [metrics, timeCost] = await Promise.all([
          getMetricsOverview(),
          getTimeCostOverview({ start: weekStart.toISOString().slice(0, 10) }),
        ]);

        setGlobalStats({
          total: metrics.global.nb_projects_total,
          active: metrics.global.nb_projects_active,
          onhold: metrics.global.nb_projects_onhold,
        });
        const conception = metrics.byTeam.find((t) => t.team === "conception")?.nb_projects_active_distinct ?? 0;
        const crea = metrics.byTeam.find((t) => t.team === "créa")?.nb_projects_active_distinct ?? 0;
        const dev = metrics.byTeam.find((t) => t.team === "dev")?.nb_projects_active_distinct ?? 0;
        setTeamStats({ conception, crea, dev });

        setTc(timeCost);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erreur lors du chargement des métriques.");
      }
    };
    load();
  }, [authLoading, employee, weekStart]);

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
    <div className="mx-auto max-w-6xl px-4 py-3">
      <h1 className="mb-1 text-lg font-semibold text-[#214A33]">Tableaux de bord</h1>

      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-[#214A33]/70">
          Semaine: {rangeLabel || "—"}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédente
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => setWeekStart(mondayOf(new Date()))}
          >
            <Home className="mr-2 h-4 w-4" />
            Cette semaine
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            Suivante
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
      )}

      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-[#F7F7F7]">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="client">Client</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="me">Moi</TabsTrigger>
        </TabsList>

        {/* GLOBAL — compact */}
        <TabsContent value="global" className="mt-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <StatCard compact title="Projets total" value={`${globalStats.total}`} />
            <StatCard compact title="Actifs" value={`${globalStats.active}`} />
            <StatCard compact title="En pause" value={`${globalStats.onhold}`} />
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <StatCard compact title="Heures planifiées (semaine)" value={`${tc?.global.hours_planned?.toFixed(1) ?? "0.0"} h`} />
            <StatCard compact title="Heures réelles (semaine)" value={`${tc?.global.hours_actual?.toFixed(1) ?? "0.0"} h`} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <StatCard compact title="Coût planifié (semaine)" value={eur(tc?.global.cost_planned)} />
            <StatCard compact title="Coût réel (semaine)" value={eur(tc?.global.cost_actual)} />
          </div>

          <div className="mt-2 flex justify-end">
            <button
              className="text-[11px] underline text-[#214A33] hover:text-[#214A33]/80"
              onClick={() => setShowGlobalDetails((v) => !v)}
            >
              {showGlobalDetails ? "Masquer les détails annuels" : "Afficher les détails annuels"}
            </button>
          </div>

          {showGlobalDetails && (
            <div className="mt-2">
              <GlobalPortfolio />
            </div>
          )}
        </TabsContent>

        {/* CLIENT */}
        <TabsContent value="client" className="mt-3">
          <ClientView />
        </TabsContent>

        {/* TEAM — compact */}
        <TabsContent value="team" className="mt-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <StatCard compact title="Conception (actifs)" value={`${teamStats.conception}`} />
            <StatCard compact title="Créa (actifs)" value={`${teamStats.crea}`} />
            <StatCard compact title="Dev (actifs)" value={`${teamStats.dev}`} />
          </div>
          <div className="mt-2">
            <TeamPortfolio />
          </div>
        </TabsContent>

        {/* ME — compact */}
        <TabsContent value="me" className="mt-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <StatCard compact title="Mes heures planifiées (semaine)" value={`${tc?.me.hours_planned?.toFixed(1) ?? "0.0"} h`} />
            <StatCard compact title="Mes heures réelles (semaine)" value={`${tc?.me.hours_actual?.toFixed(1) ?? "0.0"} h`} />
          </div>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <StatCard compact title="Mon coût planifié (semaine)" value={eur(tc?.me.cost_planned)} />
            <StatCard compact title="Mon coût réel (semaine)" value={eur(tc?.me.cost_actual)} />
          </div>
          <div className="mt-2">
            <MePortfolio />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const StatCard = ({ title, value, compact = false }: { title: string; value: string; compact?: boolean }) => (
  <Card className="border-[#BFBFBF]">
    <CardHeader className={compact ? "py-1" : "py-2"}>
      <CardTitle className={`${compact ? "text-[11px]" : "text-sm"} text-[#214A33]/80`}>{title}</CardTitle>
    </CardHeader>
    <CardContent className={compact ? "py-1" : "py-2"}>
      <div className={`${compact ? "text-xl" : "text-3xl"} font-bold text-[#214A33] tabular-nums`}>{value}</div>
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