import React from "react";
import PlanningGrid from "@/components/planning/PlanningGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/context/UserContext";

type Status = "active" | "onhold" | "archived";
type AdminProject = { id: string; code: string; name: string; status: Status };
type Assignments = Record<string, string[]>; // project_id -> employee_id[]

const LS_PROJECTS = "dowee.admin.projects";
const LS_ASSIGN = "dowee.admin.projectEmployees";

const PlanningPage = () => {
  const { currentEmployeeId } = useUser();

  const projects = React.useMemo(() => {
    // Lecture des projets et affectations depuis l’admin (localStorage)
    const rawP = localStorage.getItem(LS_PROJECTS);
    const rawA = localStorage.getItem(LS_ASSIGN);

    if (rawP && rawA && currentEmployeeId) {
      const projs = (JSON.parse(rawP) as AdminProject[]).filter((p) => p.status !== "archived");
      const assignments = JSON.parse(rawA) as Assignments;
      const mine = projs.filter((p) => (assignments[p.id] || []).includes(currentEmployeeId));
      if (mine.length > 0) {
        return mine.map((p) => ({ id: p.id, code: p.code, name: p.name }));
      }
    }

    // Fallback démo si aucun projet affecté ou données absentes
    return [
      { id: "p1", code: "ACME-001", name: "Site vitrine" },
      { id: "p2", code: "BRND-2025", name: "Refonte branding" },
      { id: "p3", code: "CRM-OPS", name: "Intégration CRM" },
    ];
  }, [currentEmployeeId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF] bg-[#F7F7F7]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Planning hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent className="bg-white rounded-md p-4">
          <PlanningGrid projects={projects} />
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningPage;