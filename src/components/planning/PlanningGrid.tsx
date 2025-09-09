import React from "react";
import { weekFrom, formatHour, DayInfo, mondayOf } from "@/utils/date";
import { cn } from "@/lib/utils";
import ProjectPill from "@/components/planning/ProjectPill";
import { Button } from "@/components/ui/button";
import { addDays } from "date-fns";
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
import { showSuccess, showError } from "@/utils/toast";
import { getUserWeek, patchUserWeek, PlanDTO } from "@/api/userWeek";
import { useAuth } from "@/context/AuthContext";
import CellDroppable from "@/components/planning/CellDroppable";
import PlanDraggable from "@/components/planning/PlanDraggable";
import { getProjectScores, type ProjectScore } from "@/api/projectScoring";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
} from "@dnd-kit/core";

type Project = { id: string; code: string; name: string };
type PlanItem = { id?: string; d: string; hour: number; projectId: string };

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
      startWasOccupied: boolean;
    }
  | { active: false };

const initialDrag: DragSel = { active: false };

const cellBase =
  "relative min-w-[120px] h-[56px] align-middle border border-[#BFBFBF]/60 bg-white";

function colorFromScore(score?: number): "green" | "amber" | "orange" | "red" | "gray" {
  if (typeof score !== "number") return "gray";
  if (score >= 80) return "green";
  if (score >= 60) return "amber";
  if (score >= 40) return "orange";
  return "red";
}

type GcalEvent = {
  title: string;
  start: Date;
  end: Date;
  allDay: boolean;
};

function startOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDayLocal(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return Math.max(aStart.getTime(), bStart.getTime()) < Math.min(aEnd.getTime(), bEnd.getTime());
}

const PlanningGrid: React.FC<{ projects?: Project[] }> = ({ projects: fallbackProjects = [] }) => {
  const { loading: authLoading, employee } = useAuth();

  const [weekStart, setWeekStart] = React.useState<Date>(() => mondayOf(new Date()));
  const days = React.useMemo<DayInfo[]>(() => weekFrom(weekStart), [weekStart]);
  const hours = React.useMemo<number[]>(
    () => Array.from({ length: HOURS_END_EXCLUSIVE - HOURS_START }, (_, i) => HOURS_START + i),
    []
  );

  const [plans, setPlans] = React.useState<Record<string, PlanItem>>({});
  const [projects, setProjects] = React.useState<Project[]>(fallbackProjects);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [dragSel, setDragSel] = React.useState<DragSel>(initialDrag);
  const movingPlanKeyRef = React.useRef<string | null>(null);

  const [overlay, setOverlay] = React.useState<{ type: "project" | "plan" | null; code?: string; name?: string }>({ type: null });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } })
  );

  const byProject: Record<string, Project> = React.useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  );

  const [scoreMap, setScoreMap] = React.useState<Record<string, number>>({});

  const isoToIdx = React.useMemo(() => {
    const map: Record<string, number> = {};
    days.forEach((d, i) => (map[d.iso] = i));
    return map;
  }, [days]);

  // ---- Google Calendar (Option A) state
  const [gEnabled, setGEnabled] = React.useState<boolean>(() => localStorage.getItem("dowee.gcal.enabled") === "1");
  const [gToken, setGToken] = React.useState<string | null>(null);
  const [gLoading, setGLoading] = React.useState<boolean>(false);
  const [gError, setGError] = React.useState<string | null>(null);
  const [gLastSync, setGLastSync] = React.useState<Date | null>(null);

  // Map cellules "d|hour" -> nb d'événements
  const [gCellEvents, setGCellEvents] = React.useState<Record<string, number>>({});
  // All-day par jour iso -> nb
  const [gAllDayByIso, setGAllDayByIso] = React.useState<Record<string, number>>({});

  const isGConnected = !!gToken;

  const saveEnabled = (v: boolean) => {
    setGEnabled(v);
    localStorage.setItem("dowee.gcal.enabled", v ? "1" : "0");
  };

  const obtainGoogleToken = React.useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const token = (data?.session as any)?.provider_token || null;
    setGToken(token || null);
    return token || null;
  }, []);

  // CHANGEMENT: on force la redirection pour afficher l’écran Google sans popup
  const connectGoogle = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          scopes: "https://www.googleapis.com/auth/calendar.readonly",
          redirectTo: window.location.origin,
          queryParams: {
            // Améliore la fiabilité d’obtention du token (non obligatoire pour le POC)
            access_type: "offline",
            prompt: "consent",
          },
        },
      });
      // La redirection intervient immédiatement; ce code ne s’exécute pas forcément ensuite.
    } catch (e: any) {
      showError(e?.message || "Connexion Google impossible.");
    }
  };

  const fetchGcalEvents = React.useCallback(async () => {
    if (!gEnabled) return;
    if (!gToken) {
      const t = await obtainGoogleToken();
      if (!t) {
        setGError("Non connecté à Google Agenda.");
        return;
      }
    }
    const token = gToken || (await obtainGoogleToken());
    if (!token) return;

    if (days.length === 0) return;

    const timeMin = new Date(days[0].date);
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date(days[6].date);
    timeMax.setHours(23, 59, 59, 999);

    const url = new URL("https://www.googleapis.com/calendar/v3/calendars/primary/events");
    url.searchParams.set("timeMin", timeMin.toISOString());
    url.searchParams.set("timeMax", timeMax.toISOString());
    url.searchParams.set("singleEvents", "true");
    url.searchParams.set("orderBy", "startTime");
    url.searchParams.set("maxResults", "250");
    url.searchParams.set("showDeleted", "false");

    setGLoading(true);
    setGError(null);
    try {
      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Google API: ${res.status}`);
      }
      const data = await res.json();
      const items: any[] = data?.items ?? [];

      const events: GcalEvent[] = items.map((it) => {
        const title = it.summary || "Événement";
        if (it.start?.date && it.end?.date) {
          const start = startOfDayLocal(new Date(it.start.date + "T00:00:00"));
          const end = new Date(new Date(it.end.date + "T00:00:00").getTime() - 1);
          return { title, start, end, allDay: true };
        } else {
          const start = new Date(it.start?.dateTime ?? it.start);
          const end = new Date(it.end?.dateTime ?? it.end);
          return { title, start, end, allDay: false };
        }
      });

      const cellMap: Record<string, number> = {};
      const allDayMap: Record<string, number> = {};
      for (const d of days) allDayMap[d.iso] = 0;

      for (const ev of events) {
        if (ev.allDay) {
          for (const d of days) {
            const dayStart = startOfDayLocal(d.date);
            const dayEnd = endOfDayLocal(d.date);
            if (overlaps(ev.start, ev.end, dayStart, dayEnd)) {
              allDayMap[d.iso] = (allDayMap[d.iso] ?? 0) + 1;
            }
          }
        } else {
          for (const d of days) {
            const base = startOfDayLocal(d.date);
            for (const h of hours) {
              const slotStart = new Date(base);
              slotStart.setHours(h, 0, 0, 0);
              const slotEnd = new Date(base);
              slotEnd.setHours(h + 1, 0, 0, 0);
              if (overlaps(ev.start, ev.end, slotStart, slotEnd)) {
                const k = keyOf(d.iso, h);
                cellMap[k] = (cellMap[k] ?? 0) + 1;
              }
            }
          }
        }
      }

      setGCellEvents(cellMap);
      setGAllDayByIso(allDayMap);
      setGLastSync(new Date());
    } catch (e: any) {
      setGError(e?.message || "Erreur Google Agenda.");
    } finally {
      setGLoading(false);
    }
  }, [gEnabled, gToken, days, hours, obtainGoogleToken]);

  // Chargement semaine
  React.useEffect(() => {
    let mounted = true;

    if (authLoading || !employee) {
      setLoading(false);
      return () => { mounted = false; };
    }

    const fetchWeek = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getUserWeek(weekStart);
        if (!mounted) return;

        const plansByKey: Record<string, PlanItem> = {};
        data.plans.forEach((p: PlanDTO) => {
          plansByKey[keyOf(p.d, p.hour)] = { id: p.id, d: p.d, hour: p.hour, projectId: p.project_id };
        });
        setPlans(plansByKey);

        const newProjects = data.projects.map((p) => ({ id: p.id, code: p.code, name: p.name }));
        setProjects((prev) => (newProjects.length > 0 ? newProjects : (prev.length > 0 ? prev : fallbackProjects)));
        setLoading(false);
      } catch (e: any) {
        if (!mounted) return;
        const msg = e?.message || "Erreur de chargement de la semaine.";
        setErrorMsg(msg);
        setLoading(false);
      }
    };
    fetchWeek();
    return () => { mounted = false; };
  }, [weekStart, fallbackProjects, authLoading, employee]);

  // Charger les scores
  React.useEffect(() => {
    let active = true;
    const loadScores = async () => {
      try {
        const list = await getProjectScores();
        if (!active) return;
        const map: Record<string, number> = {};
        list.forEach((s: ProjectScore) => {
          map[s.project_id] = s.score;
        });
        setScoreMap(map);
      } catch {}
    };
    loadScores();
    return () => { active = false; };
  }, []);

  // Charger GCal à l’activation et aux changements de semaine
  React.useEffect(() => {
    if (!gEnabled) return;
    fetchGcalEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gEnabled, weekStart]);

  const isHighlighted = (dayIdx: number, hour: number) => {
    if (!dragSel.active) return false;
    if (dragSel.dayIndex === -1 || dragSel.startHour === -1) return false;
    if (dayIdx !== dragSel.dayIndex) return false;
    const [a, b] = [dragSel.startHour, dragSel.currentHour].sort((x, y) => x - y);
    return hour >= a && hour <= b;
  };

  const commitSelection = async (dayIdx: number) => {
    if (!dragSel.active || dragSel.dayIndex !== dayIdx) return;

    if (authLoading || !employee) {
      showError("Profil en cours d’initialisation, veuillez réessayer dans un instant.");
      return;
    }

    const start = Math.min(dragSel.startHour, dragSel.currentHour);
    const end = Math.max(dragSel.startHour, dragSel.currentHour);
    const d = days[dayIdx].iso;

    const allHours = Array.from({ length: end - start + 1 }, (_, i) => start + i);
    const targetHours = dragSel.startWasOccupied
      ? allHours
      : allHours.filter((h) => !plans[keyOf(d, h)]);

    if (targetHours.length === 0) {
      showError("Aucun créneau disponible dans la plage sélectionnée (déjà occupés).");
      return;
    }

    setPlans((prev) => {
      const next = { ...prev };
      for (const h of targetHours) {
        const k = keyOf(d, h);
        next[k] = { d, hour: h, projectId: dragSel.projectId };
      }
      return next;
    });

    let saved = false;
    try {
      await patchUserWeek({
        upserts: targetHours.map((h) => ({
          d,
          hour: h,
          project_id: dragSel.projectId,
          planned_minutes: 60,
        })),
      });
      saved = true;
    } catch (e: any) {
      showError(e?.message || "Erreur lors de l’enregistrement.");
    }

    try {
      const refreshed = await getUserWeek(weekStart);
      const synced: Record<string, PlanItem> = {};
      refreshed.plans.forEach((p) => {
        synced[keyOf(p.d, p.hour)] = { id: p.id, d: p.d, hour: p.hour, projectId: p.project_id };
      });
      setPlans(synced);

      const newProjects = refreshed.projects.map((p) => ({ id: p.id, code: p.code, name: p.name }));
      setProjects((prev) => (newProjects.length > 0 ? newProjects : (prev.length > 0 ? prev : fallbackProjects)));
    } catch {}

    if (saved) {
      const count = targetHours.length;
      const s = count > 1 ? "x" : "";
      const aux = count > 1 ? "ajoutés" : "ajouté";
      showSuccess(`${count} créneau${s} ${aux}.`);
    }
  };

  // DnD handlers
  const onDragStart = (e: DragStartEvent) => {
    const t = e.active.data?.current as any;
    if (t?.type === "project") {
      setDragSel({
        active: true,
        projectId: t.projectId,
        dayIndex: -1,
        startHour: -1,
        currentHour: -1,
        startWasOccupied: false,
      });
      setOverlay({ type: "project", code: t.code, name: t.name });
    } else if (t?.type === "plan") {
      const planKey = t.planKey as string;
      movingPlanKeyRef.current = planKey;
      setOverlay({ type: "plan", code: "", name: "" });
    }
  };

  const onDragOver = (e: DragOverEvent) => {
    const active = e.active.data?.current as any;
    const over = e.over?.data?.current as any;
    if (active?.type === "project" && over?.type === "cell") {
      const dayIdx = (over.dayIdx as number) ?? isoToIdx[over.iso as string] ?? -1;
      const hour = over.hour as number;
      const d = over.iso as string;
      setDragSel((s) => {
        if (!s.active) return s;
        if (s.dayIndex === -1) {
          const occupied = !!plans[keyOf(d, hour)];
          return { ...s, dayIndex: dayIdx, startHour: hour, currentHour: hour, startWasOccupied: occupied };
        }
        if (s.dayIndex === dayIdx) {
          return { ...s, currentHour: hour };
        }
        return s;
      });
    }
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const active = e.active.data?.current as any;
    const over = e.over?.data?.current as any;

    if (active?.type === "project") {
      if (dragSel.active && dragSel.dayIndex !== -1) {
        if (over?.type === "cell" || !over) {
          await commitSelection(dragSel.dayIndex);
        }
      }
      setDragSel(initialDrag);
      setOverlay({ type: null });
    } else if (active?.type === "plan") {
      const movingKey = movingPlanKeyRef.current;
      movingPlanKeyRef.current = null;

      if (over?.type === "cell" && movingKey) {
        const origin = plans[movingKey];
        if (!origin) {
          setOverlay({ type: null });
          return;
        }
        const targetD = over.iso as string;
        const targetH = over.hour as number;
        const targetKey = keyOf(targetD, targetH);

        if (targetKey === movingKey) {
          setOverlay({ type: null });
          return;
        }

        setPlans((prev) => {
          const next = { ...prev };
          delete next[movingKey];
          next[targetKey] = { d: targetD, hour: targetH, projectId: origin.projectId };
          return next;
        });

        try {
          await patchUserWeek({
            deletes: [
              origin.id ? { id: origin.id } : { d: origin.d, hour: origin.hour },
            ],
            upserts: [
              { d: targetD, hour: targetH, project_id: origin.projectId, planned_minutes: 60 },
            ],
          });

          try {
            const refreshed = await getUserWeek(weekStart);
            const synced: Record<string, PlanItem> = {};
            refreshed.plans.forEach((p) => {
              synced[keyOf(p.d, p.hour)] = { id: p.id, d: p.d, hour: p.hour, projectId: p.project_id };
            });
            setPlans(synced);
          } catch {}

          showSuccess("Créneau déplacé.");
        } catch (err: any) {
          showError(err?.message || "Déplacement impossible.");
        }

        setOverlay({ type: null });
        return;
      }

      if (!over && movingKey) {
        const plan = plans[movingKey];
        setPlans((prev) => {
          const next = { ...prev };
          delete next[movingKey];
          return next;
        });

        try {
          await patchUserWeek({
            deletes: [
              plan?.id
                ? { id: plan.id }
                : { d: plan.d, hour: plan.hour },
            ],
          });
          showSuccess("Créneau supprimé.");
        } catch (err: any) {
          showError(err?.message || "Suppression impossible.");
        }
      }
      setOverlay({ type: null });
    }
  };

  const weekLabel = React.useMemo(() => {
    if (days.length === 0) return "";
    const startLbl = days[0].label;
    const endLbl = days[6].label;
    return `${startLbl} – ${endLbl}`;
  }, [days]);

  const retry = () => {
    setWeekStart((d) => new Date(d));
  };

  const reloadGcal = async () => {
    await fetchGcalEvents();
    if (!gError) showSuccess("Google Agenda rechargé.");
  };

  return (
    <div className="w-full">
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

        {/* Groupe Google Agenda */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-md border border-[#BFBFBF] bg-white px-2 py-1">
            <span className="text-xs text-[#214A33]/80">Afficher Google Agenda</span>
            <Switch checked={gEnabled} onCheckedChange={(v) => saveEnabled(!!v)} />
          </div>
          {isGConnected ? (
            <>
              <Button
                variant="outline"
                className="border-[#BFBFBF] text-[#214A33]"
                onClick={reloadGcal}
                disabled={gLoading}
              >
                {gLoading ? "Chargement…" : "Recharger"}
              </Button>
              <div className="text-[11px] text-[#214A33]/60 min-w-[140px] text-right">
                {gLastSync ? `Sync: ${gLastSync.toLocaleTimeString()}` : gLoading ? "Chargement…" : "Connecté"}
              </div>
            </>
          ) : (
            <Button
              variant="outline"
              className="border-[#BFBFBF] text-[#214A33]"
              onClick={connectGoogle}
            >
              Connecter Google Agenda
            </Button>
          )}
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
                  Cette action supprimera tous vos créneaux planifiés de la semaine côté serveur.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    const dels = Object.values(plans).map((p) => (p.id ? { id: p.id } : { d: p.d, hour: p.hour }));
                    if (dels.length > 0) {
                      try {
                        await patchUserWeek({ deletes: dels });
                      } catch (e: any) {
                        showError(e?.message || "Effacement impossible.");
                      }
                    }
                    setPlans({});
                    showSuccess("Semaine effacée.");
                  }}
                >
                  Effacer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-center justify-between gap-2">
            <span>{errorMsg}</span>
            <Button size="sm" variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={retry}>
              Réessayer
            </Button>
          </div>
        </div>
      )}

      {gEnabled && gError && (
        <div className="mb-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
          {gError}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(projects.length > 0 ? projects : fallbackProjects).map((p) => (
            <ProjectPill key={p.id} id={p.id} code={p.code} name={p.name} />
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
                    <div className="flex items-center justify-between">
                      <span>{d.label}</span>
                      {gEnabled && (gAllDayByIso[d.iso] ?? 0) > 0 && (
                        <span
                          title={`${gAllDayByIso[d.iso]} événement(s) toute la journée`}
                          className="ml-2 rounded-full border border-[#BFBFBF] bg-white px-2 py-0.5 text-[11px] text-[#214A33]"
                        >
                          All-day: {gAllDayByIso[d.iso]}
                        </span>
                      )}
                    </div>
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
                    const projId = hasPlan ? plans[k].projectId : undefined;
                    const score = projId ? scoreMap[projId] : undefined;
                    const color = colorFromScore(score);

                    const gHas = gEnabled && (gCellEvents[k] ?? 0) > 0;
                    const conflict = gHas && hasPlan;

                    return (
                      <CellDroppable
                        key={k}
                        id={`cell-${k}`}
                        data={{ type: "cell", iso: d.iso, hour: h, dayIdx }}
                        className={cn(
                          cellBase,
                          highlight && "ring-2 ring-[#F2994A] bg-[#F2994A]/10",
                          !highlight && gHas && !hasPlan && "bg-[#BFBFBF]/20",
                          !highlight && conflict && "ring-2 ring-red-400"
                        )}
                      >
                        {!hasPlan ? (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="pointer-events-none select-none text-xs text-[#214A33]/40">
                              Glissez un projet ici…
                            </span>
                          </div>
                        ) : (
                          <PlanDraggable
                            planKey={k}
                            labelCode={byProject[plans[k].projectId]?.code}
                            labelName={byProject[plans[k].projectId]?.name}
                            color={color}
                          />
                        )}

                        {gHas && !hasPlan && (
                          <div
                            className="pointer-events-none absolute right-1 top-1 rounded-full border border-[#BFBFBF] bg-white/80 px-1.5 py-0.5 text-[10px] text-[#214A33]"
                            title={`${gCellEvents[k]} événement(s) Google sur ce créneau`}
                          >
                            Gcal: {gCellEvents[k]}
                          </div>
                        )}
                        {conflict && (
                          <div
                            className="pointer-events-none absolute right-1 top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] text-white"
                            title="Conflit: événement Google sur ce créneau"
                          >
                            Conflit
                          </div>
                        )}
                      </CellDroppable>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-[#214A33]/60">
          Astuce : démarrez le glisser-déposer sur une case vide pour ajouter sans remplacer; démarrez sur une case occupée pour remplacer.
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
    </div>
  );
};

export default PlanningGrid;