import React from "react";
import PlanningGrid from "@/components/planning/PlanningGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEmployee } from "@/context/EmployeeContext";

type Status = "active" | "onhold" | "archived";
type Project = { id: string; code: string; name: string; status: Status };
type Assignments = Record<string, string[]>; // project_id -> employee_id[]

const LS_PROJECTS = "dowee.admin.projects";
const LS_ASSIGN = "dowee.admin.projectEmployees";

const PlanningPage = () => {
  const { currentEmployeeId, currentEmployee } = useEmployee();

  const projects = React.useMemo<Project[]>(() => {
    if (!currentEmployeeId) return [];
    const rawProjects = localStorage.getItem(LS_PROJECTS);
    const rawAssign = localStorage.getItem(LS_ASSIGN);
    if (!rawProjects || !rawAssign) return [];
    const allProjects = JSON.parse(rawProjects) as Project[];
    const assignments = JSON.parse(rawAssign) as Assignments;
    const assignedIds = new Set(
      Object.entries(assignments)
        .filter(([_, eids]) => Array.isArray(eids) && eids.includes(currentEmployeeId))
        .map(([pid]) => pid)
    );
    return allProjects.filter((p) => p.status !== "archived" && assignedIds.has(p.id));
  }, [currentEmployeeId]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF] bg-[#F7F7F7]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Planning hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent className="bg-white rounded-md p-4">
          {!currentEmployeeId ? (
            <div className="text-sm text-[#214A33]/70">
              Veuillez sélectionner un utilisateur dans l’en‑tête pour afficher son planning.
            </div>
          ) : projects.length === 0 ? (
            <div className="text-sm text-[#214A33]/70">
              Aucun projet affecté à {currentEmployee?.display_name || [currentEmployee?.first_name, currentEmployee?.last_name].filter(Boolean).join(" ") || currentEmployee?.email}. 
              Assignez des projets via “Admin Projets” (rôle Admin) pour les voir ici.
            </div>
          ) : (
            <PlanningGrid projects={projects} employeeId={currentEmployeeId} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningPage;