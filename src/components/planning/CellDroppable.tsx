import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@/lib/utils";

type CellDroppableProps = {
  id: string;
  data: { type: "cell"; iso: string; hour: number; dayIdx: number };
  className?: string;
  children?: React.ReactNode;
};

const CellDroppable: React.FC<CellDroppableProps> = ({ id, data, className, children }) => {
  const { setNodeRef } = useDroppable({
    id,
    data,
  });

  return (
    <td ref={setNodeRef} className={cn(className)}>
      {children}
    </td>
  );
};

export default CellDroppable;