import React from "react";
import { weekFrom, formatHour, DayInfo, mondayOf } from "@/utils/date";
import { cn } from "@/lib/utils";
import ProjectPill from "@/components/planning/ProjectPill";
import { Button } from "@/components/ui/button";
import { addDays, format } from "date-fns";
import { ChevronLeft, ChevronRight, Home, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showSuccess } from "@/utils/toast";

type Project = { id: string; code: string; name: string };
type PlanItem = { id: string; d: string; hour: number; projectId: string };

const HOURS_START = 8;
const HOURS_END_EXCLUSIVE = 18; // covers 08..17

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
  const [weekStart, setWeekStart] = React.useState<Date>(() => mondayOf(new Date()));
  const days = React.useMemo<DayInfo[]>(() => weekFrom(weekStart), [weekStart]);
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

  // Storage helpers (per week)
  const storageKey = React.useMemo(() => `dowee.plans.${format(weekStart, "yyyy-MM-dd")}`, [weekStart]);

  React.useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) {
      setPlans({});
      return;
    }
    const parsed = JSON.parse(raw) as Record<string, PlanItem> | PlanItem[];
    const next: Record<string, PlanItem> = Array.isArray(parsed)
      ? Object.fromEntries(parsed.map((p) => [keyOf(p.d, p.hour), p]))
      : parsed;
    setPlans(next);
  }, [storageKey]);

  const persistPlans = (next: Record<string, PlanItem>) => {
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const clearWeek = () => {
    localStorage.removeItem(storageKey);
    setPlans({});
    showSuccess("Semaine effacée.");
  };

  // Drag depuis pilule projet
  const handleProjectDragStart = (projectId: string) => {
    setDragSel({ active: true, projectId, dayIndex: -1, startHour: -1, currentHour: -1 });
  };
  const handleProjectDragEnd = () => {
    setDragSel(initialDrag);
  };

  // Calcul du surlignage pour une cellule
  const isHighlighted = (dayIdx: number, hour: number) => {
    if (!dragSel.active) return false;
    if (dragSel.dayIndex === -1 || dragSel.startHour === -1) return false;
    if (dayIdx !== dragSel.dayIndex) return false;
    const [a, b] = [dragSel.startHour, dragSel.currentHour].sort((x, y) => x - y);
    return hour >= a && hour <= b;
  };

  // Validation de la sélection → crée N créneaux de 60 min
  const commitSelection = (dayIdx: number) => {
    if (!dragSel.active || dragSel.dayIndex !== dayIdx) return;
    const start = Math.min(dragSel.startHour, dragSel.currentHour);
    const end = Math.max(dragSel.startHour, dragSel.currentHour);
    const d = days[dayIdx].iso;
    const count = end - start + 1;

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
      persistPlans(next);
      return next;
    });

    const plural = count > 1 ? "s" : "";
    const x = count > 1 ? "x" : "";
    showSuccess(`${count} créneau${x} ajouté${plural}.`);
  };

  // Gestion des cellules droppables
  const onCellDragEnter = (dayIdx: number, hour: number) => {
    lastOverCellRef.current = keyOf(days[dayIdx].iso, hour);

    if (!dragSel.active) return;
    if (dragSel.dayIndex === -1) {
      setDragSel((s) => ({ ...s, dayIndex: dayIdx, startHour: hour, currentHour: hour }));
    } else if (dragSel.dayIndex === dayIdx) {
      setDragSel((s) => ({ ...s, currentHour: hour }));
    }
  };

  const onCellDragOver: React.DragEventHandler<HTMLTableCellElement> = (e) => {
    e.preventDefault(); // permet le dépôt
  };

  const onCellDrop = (dayIdx: number) => {
    if (dragSel.active) {
      commitSelection(dayIdx);
      setDragSel(initialDrag);
    }
  };

  // Drag d’un créneau existant → suppression si glissé hors de la grille
  const onPlanDragStart = (k: string) => {
    movingPlanKeyRef.current = k;
    lastOverCellRef.current = null;
  };

  const onPlanDragEnd = () => {
    const movingKey = movingPlanKeyRef.current;
    movingPlanKeyRef.current = null;
    // Si une cellule a été survolée, on considère que le curseur est resté dans la grille → ne pas supprimer
    if (!movingKey || lastOverCellRef.current) {
      lastOverCellRef.current = null;
      return;
    }
    setPlans((prev) => {
      const next = { ...prev };
      delete next[movingKey];
      persistPlans(next);
      return next;
    });
    showSuccess("Créneau supprimé.");
  };

  // Libellé de la semaine (Lun dd/MM – Dim dd/MM)
  const weekLabel = React.useMemo(() => {
    if (days.length === 0) return "";
    const startLbl = days[0].label;
    const endLbl = days[6].label;
    return `${startLbl} – ${endLbl}`;
  }, [days]);

  return (
    <div className="w-full">
      {/* Barre d’outils */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => setWeekStart((d) => addDays(d, -7))}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Précédente
          </Button>
          <Button
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => setWeekStart(mondayOf(new Date()))}
          >
            <Home className="mr-2 h-4 w-4" />
            Cette semaine
          </Button>
          <Button
            variant="outline"
            className="border-[#BFBFBF] text-[#214A33]"
            onClick={() => setWeekStart((d) => addDays(d, 7))}
          >
            Suivante
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-[#214A33]">{weekLabel}</div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                className="border-[#F2994A] text-[#214A33] hover:bg-[#F2994A]/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Effacer la semaine
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Effacer la semaine ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action supprimera tous les créneaux planifiés de cette semaine depuis votre navigateur. Elle est irréversible.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={clearWeek}>Effacer</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Pilules projets */}
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
        Astuce : gardez le curseur dans la même colonne pendant le glisser-déposer pour étirer la sélection. Pour supprimer un créneau, faites-le glisser en dehors de la grille puis relâchez.
      </p>
    </div>
  );
};

export default PlanningGrid;