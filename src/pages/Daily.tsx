import React from "react";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useAuth } from "@/context/AuthContext";
import { getUserWeek, patchUserWeek, type PlanDTO } from "@/api/userWeek";
import { mondayOf } from "@/utils/date";
import { showError, showSuccess } from "@/utils/toast";
import { cn } from "@/lib/utils";
import CellDroppable from "@/components/planning/CellDroppable";
import PlanDraggable from "@/components/planning/PlanDraggable";
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensors,
  useSensor,
  pointerWithin,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Home, CalendarDays, CheckCircle2 } from "lucide-react";
import { getDayStatus, confirmDay, type DayStatus } from "@/api/dayValidation";
import { getProjectScores, type ProjectScore } from "@/api/projectScoring";

type Project = { id: string; code: string; name: string };
type PlanItem = { id?: string; d: string; hour: number; projectId: string };

const HOURS_START = 8;
const HOURS_END_EXCLUSIVE = 18; // 08..17

function keyOf(d: string, hour: number) {
  return `${d}|${hour}`;
}

type DragSel =
  | {
      active: true;
      projectId: string;
      startHour: number;
      currentHour: number;
      startWasOccupied: boolean;
    }
  | { active: false };

const initialDrag: DragSel = { active: false };

function colorFromScore(score?: number): "green" | "amber" | "orange" | "red" | "gray" {
  if (typeof score !== "number") return "gray";
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  if (score >= 40) return "orange";
  return "red";
}

const Daily = () => {
  const { loading: authLoading, employee } = useAuth();

  const [date, setDate] = React.useState<Date>(new Date());
  const iso = React.useMemo(() => format(date, "yyyy-MM-dd"), [date]);
  const dayLabel = React.useMemo(
    () => format(date, "EEEE dd/MM", { locale: fr }),
    [date]
  );

  const [projects, setProjects] = React.useState<Project[]>([]);
  const [plans, setPlans] = React.useState<Record<number, PlanItem>>({}); // hour -> plan
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [dayStatus, setDayStatus] = React.useState<DayStatus | null>(null);
  const [validating, setValidating] = React.useState(false);

  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

  const [dragSel, setDragSel] = React.useState<DragSel>(initialDrag);
  const movingPlanKeyRef = React.useRef<string | null>(null);
  const [overlay, setOverlay] = React.useState<{ type: "project" | "plan" | null; code?: string; name?: string }>({ type: null });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const hours = React.useMemo<number[]>(
    () => Array.from({ length: HOURS_END_EXCLUSIVE - HOURS_START }, (_, i) => HOURS_START + i),
    []
  );

  const byProject = React.useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  ) as Record<string, Project>;

  const [scoreMap, setScoreMap] = React.useState<Record<string, number>>({});

  const loadScores = React.useCallback(async () => {
    try {
      const list = await getProjectScores();
      const map: Record<string, number> = {};
      list.forEach((s: ProjectScore) => { map[s.project_id] = s.score; });
      setScoreMap(map);
    } catch {
      // silencieux
    }
  }, []);

  const loadDay = React.useCallback(async () => {
    if (authLoading || !employee) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getUserWeek(mondayOf(date));
      setProjects(data.projects.map((p) => ({ id: p.id, code: p.code, name: p.name })));
      const dayPlans = data.plans.filter((p) => p.d === iso);
      const map: Record<number, PlanItem> = {};
      dayPlans.forEach((p: PlanDTO) => {
        map[p.hour] = { id: p.id, d: p.d, hour: p.hour, projectId: p.project_id };
      });
      setPlans(map);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement de la journée.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, employee, date, iso]);

  const loadStatus = React.useCallback(async () => {
    if (authLoading || !employee) return;
    try {
      const st = await getDayStatus(iso);
      setDayStatus(st);
    } catch {
      // ignore
    }
  }, [authLoading, employee, iso]);

  React.useEffect(() => {
    loadDay();
    loadStatus();
    loadScores();
  }, [loadDay, loadStatus, loadScores]);

  const assignOne = async (hour: number, projectId: string) => {
    setPlans((prev) => ({ ...prev, [hour]: { d: iso, hour, projectId } }));
    try {
      await patchUserWeek({ upserts: [{ d: iso, hour, project_id: projectId, planned_minutes: 60 }] });
      const data = await getUserWeek(mondayOf(date));
      const map: Record<number, PlanItem> = {};
      (data.plans.filter((p) => p.d === iso)).forEach((p) => {
        map[p.hour] = { id: p.id, d: p.d, hour: p.hour, projectId: p.project_id };
      });
      setPlans(map);
      showSuccess("Créneau ajouté.");
    } catch (e: any) {
      showError(e?.message || "Ajout impossible.");
      loadDay();
    }
  };

  const deleteOne = async (hour: number) => {
    const current = plans[hour];
    if (!current) return;
    setPlans((prev) => {
      const next = { ...prev };
      delete next[hour];
      return next;
    });
    try {
      await patchUserWeek({
        deletes: [current.id ? { id: current.id } : { d: iso, hour }],
      });
      showSuccess("Créneau supprimé.");
    } catch (e: any) {
      showError(e?.message || "Suppression impossible.");
      loadDay();
    }
  };

  const commitSelection = async () => {
    if (!dragSel.active) return;
    const start = Math.min(dragSel.startHour, dragSel.currentHour);
    const end = Math.max(dragSel.startHour, dragSel.currentHour);
    const allHours = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const targetHours = dragSel.startWasOccupied ? allHours : allHours.filter((h) => !plans[h]);

    if (targetHours.length === 0) {
      showError("Aucun créneau disponible dans la plage (déjà occupés).");
      return;
    }

    setPlans((prev) => {
      const next = { ...prev };
      for (const h of targetHours) {
        next[h] = { d: iso, hour: h, projectId: dragSel.projectId };
      }
      return next;
    });

    try {
      await patchUserWeek({
        upserts: targetHours.map((h) => ({ d: iso, hour: h, project_id: dragSel.projectId, planned_minutes: 60 })),
      });
      await loadDay();
      showSuccess(`${targetHours.length} créneau${targetHours.length > 1 ? "x" : ""} ajouté${targetHours.length > 1 ? "s" : ""}.`);
    } catch (e: any) {
      showError(e?.message || "Enregistrement impossible.");
      loadDay();
    }
  };

  // DnD
  const onDragStart = (e: DragStartEvent) => {
    const t = e.active.data?.current as any;
    if (t?.type === "project") {
      setDragSel({ active: true, projectId: t.projectId, startHour: -1, currentHour: -1, startWasOccupied: false });
      setOverlay({ type: "project", code: t.code, name: t.name });
    } else if (t?.type === "plan") {
      const planKey = t.planKey as string;
      movingPlanKeyRef.current = planKey;
      setOverlay({ type: "plan" });
    }
  };

  const onDragOver = (e: DragOverEvent) => {
    const active = e.active.data?.current as any;
    const over = e.over?.data?.current as any;
    if (active?.type === "project" && over?.type === "cell") {
      const hour = over.hour as number;
      setDragSel((s) => {
        if (!s.active) return s;
        if (s.startHour === -1) {
          const occupied = !!plans[hour];
          return { ...s, startHour: hour, currentHour: hour, startWasOccupied: occupied };
        }
        return { ...s, currentHour: hour };
      });
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const active = e.active.data?.current as any;
    const over = e.over?.data?.current as any;

    if (active?.type === "project") {
      if (dragSel.active && dragSel.startHour !== -1) {
        if (over?.type === "cell" || !over) {
          await commitSelection();
        }
      }
      setDragSel(initialDrag);
      setOverlay({ type: null });
      return;
    }

    if (active?.type === "plan") {
      const movingKey = movingPlanKeyRef.current;
      movingPlanKeyRef.current = null;

      if (over?.type === "cell" && movingKey) {
        const [dStr, hStr] = movingKey.replace(/^plan-/, "").split("|");
        const originHour = Number(hStr);
        const targetH = over.hour as number;

        if (targetH === originHour) {
          setOverlay({ type: null });
          return;
        }

        const origin = plans[originHour];
        if (!origin) {
          setOverlay({ type: null });
          return;
        }

        setPlans((prev) => {
          const next = { ...prev };
          delete next[originHour];
          next[targetH] = { d: iso, hour: targetH, projectId: origin.projectId };
          return next;
        });

        try {
          await patchUserWeek({
            deletes: [origin.id ? { id: origin.id } : { d: iso, hour: originHour }],
            upserts: [{ d: iso, hour: targetH, project_id: origin.projectId, planned_minutes: 60 }],
          });
          await loadDay();
          showSuccess("Créneau déplacé.");
        } catch (e: any) {
          showError(e?.message || "Déplacement impossible.");
          loadDay();
        }

        setOverlay({ type: null });
        return;
      }

      if (!over && movingKey) {
        const [_, hStr] = movingKey.replace(/^plan-/, "").split("|");
        const originHour = Number(hStr);
        await deleteOne(originHour);
      }
      setOverlay({ type: null });
    }
  };

  const isHighlighted = (hour: number) => {
    if (!dragSel.active) return false;
    if (dragSel.startHour === -1) return false;
    const [a, b] = [dragSel.startHour, dragSel.currentHour].sort((x, y) => x - y);
    return hour >= a && hour <= b;
  };

  const onCellClick = async (hour: number) => {
    if (selectedProjectId) {
      await assignOne(hour, selectedProjectId);
      return;
    }
  };

  const onCellDoubleClick = async (hour: number) => {
    if (plans[hour]) {
      await deleteOne(hour);
    }
  };

  const validateCurrent = async () => {
    try {
      setValidating(true);
      await confirmDay(iso);
      await loadStatus();
      showSuccess("Journée validée.");
    } catch (e: any) {
      showError(e?.message || "Validation impossible.");
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-3 py-3">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between py-3">
          <CardTitle className="text-base font-semibold text-[#214A33]">Journée — {dayLabel}</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {dayStatus?.validated ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Validée
              </span>
            ) : (
              <Button
                size="sm"
                className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90"
                onClick={validateCurrent}
                disabled={validating || authLoading || !employee}
                title="Copier le planning du jour vers mes heures réelles et marquer la journée validée"
              >
                {validating ? "Validation…" : "Valider cette journée"}
              </Button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="border-[#BFBFBF] text-[#214A33]"
              onClick={() => setDate((d) => addDays(d, -1))}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Précédent
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#BFBFBF] text-[#214A33]"
              onClick={() => setDate(new Date())}
            >
              <Home className="mr-2 h-4 w-4" />
              Aujourd’hui
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-[#BFBFBF] text-[#214A33]"
              onClick={() => setDate((d) => addDays(d, 1))}
            >
              Suivant
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button size="sm" variant="outline" className="border-[#BFBFBF] text-[#214A33]">
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Choisir une date
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  locale={fr}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          {errorMsg && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
          >
            {/* Sélection projet */}
            <div className="mb-3 flex w-full items-center gap-2 overflow-x-auto">
              {projects.length === 0 ? (
                <div className="text-sm text-[#214A33]/60">Aucun projet assigné.</div>
              ) : (
                projects.map((p) => {
                  const active = selectedProjectId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedProjectId((cur) => (cur === p.id ? null : p.id))}
                      className={cn(
                        "select-none inline-flex items-center gap-2 rounded-full border px-2 py-0.5 text-xs transition",
                        active
                          ? "border-[#214A33] bg-[#214A33] text-white"
                          : "border-[#BFBFBF] bg-white text-[#214A33] hover:shadow"
                      )}
                      title={`${p.code} — ${p.name}`}
                    >
                      <span className={cn("h-2 w-2 rounded-full", active ? "bg-white" : "bg-[#F2994A]")} />
                      <span className="font-medium">{p.code}</span>
                      <span className={cn(active ? "text-white/90" : "text-[#214A33]/70")}>{p.name}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Grille jour */}
            <div className="overflow-auto rounded-md border border-[#BFBFBF] bg-[#F7F7F7] max-h-[calc(100vh-220px)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="w-24 bg-[#F7F7F7] p-2 text-left text-xs font-semibold text-[#214A33]">Heure</th>
                    <th className="min-w-[220px] p-2 text-left text-xs font-semibold text-[#214A33]">Créneau</th>
                  </tr>
                </thead>
                <tbody>
                  {hours.map((h) => {
                    const has = !!plans[h];
                    const proj = has ? byProject[plans[h].projectId] : undefined;
                    const score = has ? scoreMap[plans[h].projectId] : undefined;
                    const color = colorFromScore(score);

                    return (
                      <tr key={h}>
                        <td className="w-24 bg-[#F7F7F7] p-2 text-xs text-[#214A33]/80">{String(h).padStart(2, "0")}:00</td>
                        <CellDroppable
                          id={`cell-${iso}|${h}`}
                          data={{ type: "cell", iso, hour: h, dayIdx: 0 }}
                          className={cn(
                            "relative h-12 align-middle border border-[#BFBFBF]/60 bg-white",
                            isHighlighted(h) && "ring-2 ring-[#F2994A] bg-[#F2994A]/10"
                          )}
                        >
                          <div
                            className="absolute inset-0"
                            onClick={() => onCellClick(h)}
                            onDoubleClick={() => onCellDoubleClick(h)}
                          >
                            {!has ? (
                              <div className="flex h-full w-full items-center justify-center">
                                <span className="pointer-events-none select-none text-[11px] text-[#214A33]/40">
                                  Cliquez ou déposez un projet…
                                </span>
                              </div>
                            ) : (
                              <PlanDraggable
                                planKey={keyOf(iso, h)}
                                labelCode={proj?.code}
                                labelName={proj?.name}
                                className="cursor-grab"
                                color={color}
                              />
                            )}
                          </div>
                        </CellDroppable>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="mt-2 hidden text-[11px] text-[#214A33]/60 md:block">
              Astuce: sélectionnez un projet puis cliquez sur plusieurs heures pour l’assigner rapidement. Double-cliquez sur un créneau pour le supprimer.
            </p>

            <DragOverlay>
              {overlay.type === "project" ? (
                <div className="select-none inline-flex items-center gap-2 rounded-full border border-[#BFBFBF] bg-white px-3 py-1 text-sm text-[#214A33] shadow">
                  <span className="h-2 w-2 rounded-full bg-[#F2994A]" />
                  <span className="font-medium">{overlay.code}</span>
                  <span className="text-[#214A33]/70">{overlay.name}</span>
                </div>
              ) : overlay.type === "plan" ? (
                <div className="inline-flex items-center gap-2 rounded-md border border-[#BFBFBF] bg-white px-2 py-1 text-xs text-[#214A33] shadow">
                  <span className="h-2 w-2 rounded-full bg-[#214A33]" />
                  <span className="font-medium">Créneau</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </CardContent>
      </Card>
    </div>
  );
};

export default Daily;