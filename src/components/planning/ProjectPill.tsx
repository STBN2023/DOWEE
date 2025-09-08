import React from "react";
import { useDraggable } from "@dnd-kit/core";

type Props = {
  id: string;
  code: string;
  name: string;
};

const ProjectPill: React.FC<Props> = ({ id, code, name }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `proj-${id}`,
    data: { type: "project", projectId: id, code, name },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`select-none inline-flex items-center gap-2 rounded-full border border-[#BFBFBF] bg-white px-3 py-1 text-sm text-[#214A33] shadow-sm hover:shadow transition ${isDragging ? "opacity-60" : ""}`}
      title={`${code} — ${name}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#F2994A]" />
      <span className="font-medium">{code}</span>
      <span className="text-[#214A33]/70">{name}</span>
    </div>
  );
};

export default ProjectPill;