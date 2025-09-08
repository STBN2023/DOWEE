import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

type LogRow = {
  id: string;
  d: string;
  hour: number;
  prev_project_id: string | null;
  new_project_id: string | null;
  action: "upsert" | "delete";
  occurred_at: string;
};

type Project = { id: string; code: string; name: string };

function isoDay(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function hourLabel(h: number) {
  return `${String(h).padStart(2, "0")}:00`;
}

const ReportsChanges = () => {
  const { loading: authLoading, employee } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [logs, setLogs] = React.useState<LogRow[]>([]);
  const [projects, setProjects] = React.useState<Project[]>([]);

  const since = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d;
  }, []);

  const load = React.useCallback(async () => {
    if (authLoading || !employee) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const { data: rows, error } = await supabase
        .from("planning_change_logs")
        .select("id, d, hour, prev_project_id, new_project_id, action, occurred_at")
        .gte("occurred_at", since.toISOString())
        .order("occurred_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      const logs = (rows ?? []) as LogRow[];

      // Récupérer les projets référencés (prev et new)
      const ids = Array.from(
        new Set(
          logs.flatMap((l) => [l.prev_project_id, l.new_project_id]).filter(Boolean) as string[]
        )
      );
      let projs: Project[] = [];
      if (ids.length > 0) {
        const { data: pr, error: perr } = await supabase
          .from("projects")
          .select("id, code, name")
          .in("id", ids);
        if (perr) throw new Error(perr.message);
        projs = (pr ?? []) as Project[];
      }

      setProjects(projs);
      setLogs(logs);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement du reporting.");
    } finally {
      setLoading(false);
    }
  }, [authLoading, employee, since]);

  React.useEffect(() => {
    load();
  }, [load]);

  const projById = React.useMemo(
    () => Object.fromEntries(projects.map((p) => [p.id, p])),
    [projects]
  ) as Record<string, Project>;

  // KPIs
  const total = logs.length;
  const sameDayCount = logs.filter((l) => {
    try {
      const occ = new Date(l.occurred_at);
      const occIso = occ.toISOString().slice(0, 10);
      return occIso === l.d;
    } catch {
      return false;
    }
  }).length;

  const topByProject = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const l of logs) {
      const pid = l.new_project_id || l.prev_project_id;
      if (!pid) continue;
      map.set(pid, (map.get(pid) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([id, n]) => ({ id, n }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 5);
  }, [logs]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Reporting — Modifs planning (30 derniers jours)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMsg && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
          )}

          {loading ? (
            <div className="text-sm text-[#214A33]/70">Chargement…</div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
                  <div className="text-xs text-[#214A33]/70">Modifications totales</div>
                  <div className="text-2xl font-semibold text-[#214A33] tabular-nums">{total}</div>
                </div>
                <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
                  <div className="text-xs text-[#214A33]/70">Le jour-même</div>
                  <div className="text-2xl font-semibold text-[#214A33] tabular-nums">{sameDayCount}</div>
                </div>
                <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
                  <div className="text-xs text-[#214A33]/70">Top projet (modifs)</div>
                  <div className="mt-1 text-sm text-[#214A33]">
                    {topByProject.length === 0 ? "—" : (
                      <div className="space-y-1">
                        {topByProject.map((t) => {
                          const p = projById[t.id];
                          return (
                            <div key={t.id} className="flex items-center justify-between">
                              <span>{p ? `${p.code} — ${p.name}` : t.id}</span>
                              <span className="font-medium tabular-nums">{t.n}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Liste */}
              <div className="overflow-x-auto rounded-md border border-[#BFBFBF]">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-[#F7F7F7]">
                    <tr>
                      <th className="p-2 text-left font-semibold text-[#214A33]">Quand</th>
                      <th className="p-2 text-left font-semibold text-[#214A33]">Jour/Heure</th>
                      <th className="p-2 text-left font-semibold text-[#214A33]">Action</th>
                      <th className="p-2 text-left font-semibold text-[#214A33]">Avant</th>
                      <th className="p-2 text-left font-semibold text-[#214A33]">Après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-3 text-center text-[#214A33]/60">Aucune modification sur la période.</td>
                      </tr>
                    ) : (
                      logs.map((l) => {
                        const before = l.prev_project_id ? projById[l.prev_project_id] : null;
                        const after = l.new_project_id ? projById[l.new_project_id] : null;
                        const when = (() => {
                          try {
                            const d = new Date(l.occurred_at);
                            return d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
                          } catch {
                            return l.occurred_at;
                          }
                        })();
                        const isSameDay = l.d === (new Date(l.occurred_at)).toISOString().slice(0,10);
                        return (
                          <tr key={l.id} className="border-t border-[#BFBFBF]">
                            <td className="p-2">
                              <div className="flex items-center gap-2">
                                <span>{when}</span>
                                {isSameDay && <Badge variant="secondary" className="border-[#BFBFBF] text-[#214A33]">Jour-même</Badge>}
                              </div>
                            </td>
                            <td className="p-2">{format(new Date(l.d), "EEE dd/MM", { locale: fr })} — {hourLabel(l.hour)}</td>
                            <td className="p-2">
                              <span className="inline-flex items-center rounded-full border border-[#BFBFBF] px-2 py-0.5 text-xs">
                                {l.action === "upsert" ? "Ajout/Remplacement" : "Suppression"}
                              </span>
                            </td>
                            <td className="p-2">
                              {before ? (<span><span className="font-medium">{before.code}</span> — {before.name}</span>) : "—"}
                            </td>
                            <td className="p-2">
                              {after ? (<span><span className="font-medium">{after.code}</span> — {after.name}</span>) : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="text-xs text-[#214A33]/60">
                Astuce: “Jour-même” indique une modification effectuée le même jour que le créneau concerné.
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsChanges;