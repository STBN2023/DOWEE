import React from "react";
import PlanningGrid from "@/components/planning/PlanningGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PlanningPage = () => {
  // Mock projets assignés (POC local, sans backend)
  const projects = React.useMemo(
    () => [
      { id: "p1", code: "ACME-001", name: "Site vitrine" },
      { id: "p2", code: "BRND-2025", name: "Refonte branding" },
      { id: "p3", code: "CRM-OPS", name: "Intégration CRM" },
    ],
    []
  );

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