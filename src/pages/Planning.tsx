import React from "react";
import PlanningGrid from "@/components/planning/PlanningGrid";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const PlanningPage = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF] bg-[#F7F7F7]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Planning hebdomadaire</CardTitle>
        </CardHeader>
        <CardContent className="bg-white rounded-md p-4">
          <PlanningGrid />
        </CardContent>
      </Card>
    </div>
  );
};

export default PlanningPage;