import React from "react";
import { useDraggable } from "@dnd-kit/core";

type Props = {
  planKey: string; // `${d}|${hour}`
  labelCode: string | undefined;
  labelName: string | undefined;
  className?: string;
};

const PlanDraggable: React.FC<Props> = ({ planKey, labelCode, labelName, className }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `plan-${planKey}`,
    data: { type: "plan", planKey },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={`${labelCode ?? "—"} — ${labelName ?? "—"}`}
      className={`absolute inset-1 flex items-center gap-2 rounded-md border border-[#BFBFBF] bg-white px-2 text-xs text-[#214A33] shadow-sm ${isDragging ? "opacity-70" : ""} ${className ?? ""}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#214A33]" />
      <span className="font-medium">{labelCode}</span>
      <span className="text-[#214A33]/70 truncate">{labelName}</span>
    </div>
  );
};

export default PlanDraggable;