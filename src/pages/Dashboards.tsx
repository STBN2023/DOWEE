import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/context/RoleContext";
import { useEmployee } from "@/context/EmployeeContext";
import { mondayOf } from "@/utils/date";
import { format } from "date-fns";

type PlanItem = { id: string; d: string; hour: number; projectId: string };

const Dashboards = () => {
  const { role } = useRole();
  const { currentEmployee, currentEmployeeId } = useEmployee();
  const defaultTab = role === "admin" ? "global" : role === "manager" ? "team" : "me";

  const [meProjects, setMeProjects] = React.useState<number>(0);
  const [meHours, setMeHours] = React.useState<number>(0);

  React.useEffect(() => {
    if (!currentEmployeeId) {
      setMeProjects(0);
      setMeHours(0);
      return;
    }
    const weekStart = mondayOf(new Date());
    const storageKey = `dowee.plans.${currentEmployeeId}.${format(weekStart, "yyyy-MM-dd")}`;
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setMeProjects(0);
      setMeHours(0);
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, PlanItem> | PlanItem[];
    const entries: PlanItem[] = Array.isArray(parsed) ? parsed : Object.values(parsed);
    const projectSet = new Set(entries.map((p) => p.projectId));
    setMeProjects(projectSet.size);
    setMeHours(entries.length); // 1 entrée = 1h
  }, [currentEmployeeId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-1 text-2xl font-semibold text-[#214A33]">Tableaux de bord</h1>
      <p className="mb-4 text-sm text-[#214A33]/70">
        Utilisateur courant: {currentEmployee ? (currentEmployee.display_name || [currentEmployee.first_name, currentEmployee.last_name].filter(Boolean).join(" ") || currentEmployee.email) : "—"}
      </p>
      <Tabs defaultValue={defaultTab} className="w-full">
        <TabsList className="bg-[#F7F7F7]">
          <TabsTrigger value="global">Global</TabsTrigger>
          <TabsTrigger value="team">Équipe</TabsTrigger>
          <TabsTrigger value="me">Moi</TabsTrigger>
        </TabsList>

        <TabsContent value="global" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Projets total" value="—" />
            <StatCard title="Actifs" value="—" />
            <StatCard title="En pause" value="—" />
          </div>
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard title="Commercial (actifs)" value="—" />
            <StatCard title="Créa (actifs)" value="—" />
            <StatCard title="Dev (actifs)" value="—" />
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