import React from "react";

type Props = {
  planKey: string; // `${d}|${hour}`
  labelCode: string | undefined;
  labelName: string | undefined;
  className?: string;
  color?: "green" | "amber" | "orange" | "red" | "gray";
};

function colorClasses(color: Props["color"]) {
  switch (color) {
    case "green":
      return { bg: "bg-emerald-50", border: "border-emerald-300", dot: "bg-emerald-600" };
    case "amber":
      return { bg: "bg-amber-50", border: "border-amber-300", dot: "bg-amber-600" };
    case "orange":
      return { bg: "bg-orange-50", border: "border-orange-300", dot: "bg-orange-600" };
    case "red":
      return { bg: "bg-red-50", border: "border-red-300", dot: "bg-red-600" };
    default:
      return { bg: "bg-white", border: "border-[#BFBFBF]", dot: "bg-[#214A33]" };
  }
}

const PlanDraggable: React.FC<Props> = ({ planKey, labelCode, labelName, className, color = "gray" }) => {
  // Remplacé par HTML5 drag native précédente: maintenu simple sans dnd-kit ici
  // On laisse le parent gérer le drag via dnd-kit; ce composant est purement visuel
  const classes = colorClasses(color);

  return (
    <div
      title={`${labelCode ?? "—"} — ${labelName ?? "—"}`}
      className={`absolute inset-1 flex items-center gap-2 rounded-md ${classes.border} ${classes.bg} px-2 text-xs text-[#214A33] shadow-sm ${className ?? ""}`}
    >
      <span className={`h-2 w-2 rounded-full ${classes.dot}`} />
      <span className="font-medium">{labelCode}</span>
      <span className="text-[#214A33]/70 truncate">{labelName}</span>
    </div>
  );
};

export default PlanDraggable;