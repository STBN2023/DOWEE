import React from "react";

type Props = {
  id: string;
  code: string;
  name: string;
  onDragStart: (projectId: string) => void;
  onDragEnd: () => void;
};

const ProjectPill: React.FC<Props> = ({ id, code, name, onDragStart, onDragEnd }) => {
  return (
    <div
      draggable
      onDragStart={(e) => {
        // Améliore la compatibilité Chrome/Firefox
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "copyMove";
        onDragStart(id);
      }}
      onDragEnd={onDragEnd}
      className="select-none inline-flex items-center gap-2 rounded-full border border-[#BFBFBF] bg-white px-3 py-1 text-sm text-[#214A33] shadow-sm hover:shadow transition"
      title={`${code} — ${name}`}
    >
      <span className="h-2 w-2 rounded-full bg-[#F2994A]" />
      <span className="font-medium">{code}</span>
      <span className="text-[#214A33]/70">{name}</span>
    </div>
  );
};

export default ProjectPill;