import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getUserWeek } from "@/api/userWeek";
import { mondayOf } from "@/utils/date";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { showSuccess } from "@/utils/toast";
import { getDayStatus, confirmDay, type DayStatus } from "@/api/dayValidation";
import ValidationDialog from "@/components/day/ValidationDialog";

type Project = { id: string; code: string; name: string };
type Plan = { id: string; d: string; hour: number; project_id: string; planned_minutes: number; note: string | null };

const END_OF_DAY_HOUR = 18; // rappel à partir de 18:00 locale

const Today = () => {
  const navigate = useNavigate();
  const { loading: authLoading, employee } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [plans, setPlans] = React.useState<Plan[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);

  const [dayStatus, setDayStatus] = React.useState<DayStatus | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const today = React.useMemo(() => new Date(), []);
  const todayIso = React.useMemo(() => format(today, "yyyy-MM-dd"), [today]);
  const dayLabel = React.useMemo(() => {
    try {
      return today.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
      });
    } catch {
      return todayIso;
    }
  }, [today, todayIso]);

  const refreshDayStatus = React.useCallback(async () => {
    try {
      const st = await getDayStatus(todayIso);
      setDayStatus(st);
      return st;
    } catch {
      return null;
    }
  }, [todayIso]);

  React.useEffect(() => {
    if (authLoading || !employee) {
      setLoading(true);
      return;
    }
    const load = async () => {
      setLoading(true);
      setErrorMsg(null);
      try {
        const data = await getUserWeek(mondayOf(new Date()));
        setPlans(data.plans.filter((p) => p.d === todayIso));
        setProjects(data.projects);
      } catch (e: any) {
        setErrorMsg(e?.message || "Erreur lors du chargement de votre planning.");
      } finally {
        setLoading(false);
      }
    };
    load();
    refreshDayStatus();
  }, [authLoading, employee, todayIso, refreshDayStatus]);

  // Rappel automatique à partir de l'heure seuil
  React.useEffect(() => {
    if (!dayStatus || dayStatus.validated) return;

    const checkAndOpen = () => {
      const now = new Date();
      if (now.getHours() >= END_OF_DAY_HOUR) {
        setDialogOpen(true);
      }
    };

    // Vérifier tout de suite puis à chaque minute
    checkAndOpen();
    const t = setInterval(checkAndOpen, 60 * 1000);
    return () => clearInterval(t);
  }, [dayStatus]);

  // Alerte à la fermeture si non validé après l'heure seuil
  React.useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      const now = new Date();
      if (!dayStatus?.validated && now.getHours() >= END_OF_DAY_HOUR) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dayStatus?.validated]);

  const byProject = React.useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  ) as Record<string, Project>;

  const sortedPlans = React.useMemo(() => {
    return [...plans].sort((a, b) => a.hour - b.hour);
  }, [plans]);

  const onConfirm = async () => {
    await confirmDay(todayIso);
    await refreshDayStatus();
    showSuccess("Journée validée.");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="text-[#214A33]">Aujourd’hui — {dayLabel}</CardTitle>
          <div className="flex gap-2">
            {!dayStatus?.validated ? (
              <Button
                variant="outline"
                className="border-[#BFBFBF] text-[#214A33]"
                onClick={() => setDialogOpen(true)}
              >
                Valider ma journée
              </Button>
            ) : (
              <span className="text-sm text-emerald-700">Journée validée</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-[#214A33]">
            Voici ton planning prévisionnel du jour. Ajuste si besoin, puis valide ta journée pour confirmer tes heures réelles.
          </p>

          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="text-sm text-[#214A33]/70">Chargement…</div>
          ) : sortedPlans.length === 0 ? (
            <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 text-sm text-[#214A33]/80">
              Aucun créneau planifié aujourd’hui.
            </div>
          ) : (
            <div className="overflow-hidden rounded-md border border-[#BFBFBF] bg-white">
              <table className="w-full border-collapse">
                <thead className="bg-[#F7F7F7]">
                  <tr>
                    <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Heure</th>
                    <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Projet</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedPlans.map((p) => {
                    const proj = byProject[p.project_id];
                    return (
                      <tr key={`${p.d}|${p.hour}`} className="border-t border-[#BFBFBF]">
                        <td className="p-2 text-sm text-[#214A33]/80">
                          {String(p.hour).padStart(2, "0")}:00
                        </td>
                        <td className="p-2 text-sm">
                          {proj ? (
                            <span className="text-[#214A33]">
                              <span className="font-medium">{proj.code}</span> — {proj.name}
                            </span>
                          ) : (
                            <span className="text-[#214A33]/60">Projet inconnu</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              variant="outline"
              className="border-[#BFBFBF] text-[#214A33]"
              onClick={() => setDialogOpen(true)}
            >
              Valider ma journée
            </Button>
            <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90" onClick={() => navigate("/day")}>
              Modifier mon planning
            </Button>
          </div>
        </CardContent>
      </Card>

      <ValidationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        dateLabel={dayLabel}
        canSuggestCopy={!!dayStatus?.canSuggestCopy}
        onConfirm={onConfirm}
        onEdit={() => {
          setDialogOpen(false);
          navigate("/day");
        }}
      />
    </div>
  );
};

export default Today;