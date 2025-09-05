import React from "react";
import { weekFrom, formatHour, DayInfo } from "@/utils/date";
import { cn } from "@/lib/utils";

type Project = { id: string; code: string; name: string };
type PlanItem = { id: string; d: string; hour: number; projectId: string };

const HOURS_START = 8;
const HOURS_END_EXCLUSIVE = 18; // couvre 08..17

function keyOf(d: string, hour: number) {
  return `${d}|${hour}`;
}

type DragSel =
  | {
      active: true;
      projectId: string;
      dayIndex: number;
      startHour: number;
      currentHour: number;
    }
  | { active: false };

const initialDrag: DragSel = { active: false };

const cellBase =
  "relative min-w-[120px] h-[56px] align-middle border border-[#BFBFBF]/60 bg-white";

const PlanningGrid: React.FC<{ projects: Project[] }> = ({ projects }) => {
  const days = React.useMemo<DayInfo[]>(() => weekFrom(), []);
  const hours = React.useMemo<number[]>(
    () => Array.from({ length: HOURS_END_EXCLUSIVE - HOURS_START }, (_, i) => HOURS_START + i),
    []
  );

  const [plans, setPlans] = React.useState<Record<string, PlanItem>>({});
  const [dragSel, setDragSel] = React.useState<DragSel>(initialDrag);
  const lastOverCellRef = React.useRef<string | null>(null);
  const movingPlanKeyRef = React.useRef<string | null>(null);

  const byProject: Record<string, Project> = React.useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  // Drag depuis pilule projet
  const handleProjectDragStart = (projectId: string) => {
    setDragSel({ active: true, projectId, dayIndex: -1, startHour: -1, currentHour: -1 });
  };
  const handleProjectDragEnd = () => {
    setDragSel(initialDrag);
  };

  // Calcul du highlight pour une cellule
  const isHighlighted = (dayIdx: number, hour: number) => {
    if (!dragSel.active) return false;
    if (dragSel.dayIndex === -1 || dragSel.startHour === -1) return false;
    if (dayIdx !== dragSel.dayIndex) return false;
    const [a, b] = [dragSel.startHour, dragSel.currentHour].sort((x, y) => x - y);
    return hour >= a && hour <= b;
    };

  // Drop logique → crée N créneaux 60 min
  const commitSelection = (dayIdx: number) => {
    if (!dragSel.active || dragSel.dayIndex !== dayIdx) return;
    const start = Math.min(dragSel.startHour, dragSel.currentHour);
    const end = Math.max(dragSel.startHour, dragSel.currentHour);
    const d = days[dayIdx].iso;

    setPlans((prev) => {
      const next = { ...prev };
      for (let h = start; h <= end; h++) {
        const k = keyOf(d, h);
        next[k] = {
          id: k,
          d,
          hour: h,
          projectId: dragSel.projectId,
        };
      }
      return next;
    });
  };

  // Gestion droppables sur cellules
  const onCellDragEnter = (dayIdx: number, hour: number) => {
    // Marque la dernière cellule survolée (utile pour suppression)
    lastOverCellRef.current = keyOf(days[dayIdx].iso, hour);

    if (!dragSel.active) return;
    if (dragSel.dayIndex === -1) {
      setDragSel((s) => ({ ...s, dayIndex: dayIdx, startHour: hour, currentHour: hour }));
    } else if (dragSel.dayIndex === dayIdx) {
      setDragSel((s) => ({ ...s, currentHour: hour }));
    }
  };

  const onCellDragOver: React.DragEventHandler<HTMLTableCellElement> = (e) => {
    e.preventDefault(); // permet le drop
  };

  const onCellDrop = (dayIdx: number) => {
    if (dragSel.active) {
      commitSelection(dayIdx);
      setDragSel(initialDrag);
    }
  };

  // Drag d'un bloc existant → suppression si drag out
  const onPlanDragStart = (k: string) => {
    movingPlanKeyRef.current = k;
    lastOverCellRef.current = null;
  };

  const onPlanDragEnd = () => {
    const movingKey = movingPlanKeyRef.current;
    movingPlanKeyRef.current = null;
    // Si aucune cellule n'a été survolée pendant le drag, considérer comme "drag out" → supprimer
    if (!movingKey || lastOverCellRef.current) {
      lastOverCellRef.current = null;
      return;
    }
    setPlans((prev) => {
      const next = { ...prev };
      delete next[movingKey];
      return next;
    });
  };

  return (
    <div className="w-full">
      {/* Bandeau projets */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {projects.map((p) => (
          <ProjectPill
            key={p.id}
            id={p.id}
            code={p.code}
            name={p.name}
            onDragStart={handleProjectDragStart}
            onDragEnd={handleProjectDragEnd}
          />
        ))}
      </div>

      <div className="overflow-auto rounded-md border border-[#BFBFBF] bg-[#F7F7F7]">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-24 bg-[#F7F7F7] p-2 text-left text-sm font-semibold text-[#214A33]">
                Heure
              </th>
              {days.map((d) => (
                <th key={d.iso} className="min-w-[120px] p-2 text-left text-sm font-semibold text-[#214A33]">
                  {d.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h) => (
              <tr key={h}>
                <td className="sticky left-0 z-10 w-24 bg-[#F7F7F7] p-2 text-sm text-[#214A33]/80">{formatHour(h)}</td>
                {days.map((d, dayIdx) => {
                  const k = keyOf(d.iso, h);
                  const hasPlan = !!plans[k];
                  const highlight = isHighlighted(dayIdx, h);

                  return (
                    <td
                      key={k}
                      className={cn(
                        cellBase,
                        highlight && "ring-2 ring-[#F2994A] bg-[#F2994A]/10"
                      )}
                      onDragEnter={() => onCellDragEnter(dayIdx, h)}
                      onDragOver={onCellDragOver}
                      onDrop={() => onCellDrop(dayIdx)}
                    >
                      {!hasPlan ? (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="pointer-events-none select-none text-xs text-[#214A33]/40">
                            Glissez un projet ici…
                          </span>
                        </div>
                      ) : (
                        <div
                          draggable
                          onDragStart={() => onPlanDragStart(k)}
                          onDragEnd={onPlanDragEnd}
                          title={`${byProject[plans[k].projectId]?.code} — ${byProject[plans[k].projectId]?.name}`}
                          className="absolute inset-1 flex items-center gap-2 rounded-md border border-[#BFBFBF] bg-white px-2 text-xs text-[#214A33] shadow-sm"
                        >
                          <span className="h-2 w-2 rounded-full bg-[#214A33]" />
                          <span className="font-medium">
                            {byProject[plans[k].projectId]?.code}
                          </span>
                          <span className="text-[#214A33]/70 truncate">
                            {byProject[plans[k].projectId]?.name}
                          </span>
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-[#214A33]/60">
        Astuce: maintenez la souris dans la même colonne pour étirer la plage. Pour supprimer un créneau, glissez-le en dehors de la grille puis relâchez.
      </p>
    </div>
  );
};

export default PlanningGrid;

// Pilule projet réutilisée
const ProjectPill: React.FC<{
  id: string;
  code: string;
  name: string;
  onDragStart: (projectId: string) => void;
  onDragEnd: () => void;
}> = ({ id, code, name, onDragStart, onDragEnd }) => {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
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