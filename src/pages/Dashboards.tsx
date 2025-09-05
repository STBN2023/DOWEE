import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRole } from "@/context/RoleContext";

const Dashboards = () => {
  const { role } = useRole();

  const defaultTab =
    role === "admin" ? "global" : role === "manager" ? "team" : "me";

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-[#214A33]">Dashboards</h1>
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
            <StatCard title="Mes projets" value="—" />
            <StatCard title="Heures planifiées (semaine)" value="—" />
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