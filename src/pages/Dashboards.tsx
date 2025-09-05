import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/context/RoleContext";
import { mondayOf } from "@/utils/date";
import { getMetricsOverview } from "@/api/metrics";
import { getUserWeek } from "@/api/userWeek";

const Dashboards = () => {
  const { role } = useRole();
  const defaultTab = role === "admin" ? "global" : role === "manager" ? "team" : "me";

  const [globalStats, setGlobalStats] = React.useState<{ total: number; active: number; onhold: number }>({ total: 0, active: 0, onhold: 0 });
  const [teamStats, setTeamStats] = React.useState<{ commercial: number; crea: number; dev: number }>({ commercial: 0, crea: 0, dev: 0 });
  const [meProjects, setMeProjects] = React.useState<number>(0);
  const [meHours, setMeHours] = React.useState<number>(0);

  React.useEffect(() => {
    const load = async () => {
      const metrics = await getMetricsOverview();
      setGlobalStats({
        total: metrics.global.nb_projects_total,
        active: metrics.global.nb_projects_active,
        onhold: metrics.global.nb_projects_onhold,
      });
      const commercial = metrics.byTeam.find((t) => t.team === "commercial")?.nb_projects_active_distinct ?? 0;
      const crea = metrics.byTeam.find((t) => t.team === "créa")?.nb_projects_active_distinct ?? 0;
      const dev = metrics.byTeam.find((t) => t.team === "dev")?.nb_projects_active_distinct ?? 0;
      setTeamStats({ commercial, crea, dev });
      setMeProjects(metrics.me.nb_projects_mine);

      const week = await getUserWeek(mondayOf(new Date()));
      setMeHours(week.plans.length); // 1 plan = 1h
    };
    load();
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-[#214A33]">Tableaux de bord</h1>
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
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Commercial (actifs)" value={`${teamStats.commercial}`} />
            <StatCard title="Créa (actifs)" value={`${teamStats.crea}`} />
            <StatCard title="Dev (actifs)" value={`${teamStats.dev}`} />
          </div>
        </TabsContent>

        <TabsContent value="me" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <StatCard title="Mes projets (semaine)" value={`${meProjects}`} />
            <StatCard title="Heures planifiées (semaine)" value={`${meHours} h`} />
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

export default Dashboards;