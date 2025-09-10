import React from "react";
import { getAlerts } from "@/api/alerts";
import { useAuth } from "@/context/AuthContext";
import { useTickerSettings } from "@/context/TickerSettingsContext";
import {
  fetchWeatherItemsWeatherAPI,
  fetchWeatherByCoordsWeatherAPI,
  type TickerItem,
} from "@/api/tickerExtras";
import { getTimeCostOverview } from "@/api/timeCost";

function eur(n: number | null | undefined) {
  if (n == null) return "—";
  try { return n.toLocaleString("fr-FR", { style: "currency", currency: "EUR" }); }
  catch { return `${n} €`; }
}

type TickerContextValue = {
  items: TickerItem[];
  refresh: () => Promise<void>;
  loading: boolean;
};

const TickerContext = React.createContext<TickerContextValue | undefined>(undefined);

export const TickerProvider = ({ children }: { children: React.ReactNode }) => {
  const { loading: authLoading, session, employee } = useAuth();
  const { settings, setGeo } = useTickerSettings() as any;

  const [items, setItems] = React.useState<TickerItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const askBrowserPosition = React.useCallback((): Promise<{ lat: number; lon: number } | null> => {
    return new Promise((resolve) => {
      if (!("geolocation" in navigator)) return resolve(null);
      const timer = setTimeout(() => resolve(null), 8000);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }, []);

  const normTeam = React.useCallback((t?: string | null) => {
    if (!t) return "conception";
    const base = t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (base === "crea" || base === "creation") return "créa";
    if (base === "dev" || base === "developpement" || base === "developement") return "dev";
    return "conception";
  }, []);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const promises: Array<Promise<TickerItem[]>> = [];

      // Alertes: uniquement si connecté
      if (!authLoading && session && employee && settings.modules.alerts) {
        const scope = settings.scope || "me";
        promises.push(
          getAlerts(scope, 40)
            .then((r) =>
              (r.items ?? []).map((it) => ({
                id: String((it as any).id),
                short: String((it as any).short),
                severity: ((it as any).severity as any) || "info",
              }))
            )
            .catch(() => [])
        );

        // Baro-métriques (heures & coûts) hebdo selon scope
        promises.push(
          getTimeCostOverview()
            .then((tc) => {
              const out: TickerItem[] = [];
              if (scope === "global") {
                const hp = tc.global.hours_planned ?? 0;
                const ha = tc.global.hours_actual ?? 0;
                const cp = tc.global.cost_planned ?? 0;
                const ca = tc.global.cost_actual ?? 0;
                out.push({
                  id: "baro-global-hours",
                  short: `Semaine (Global) — Heures: ${hp.toFixed(1)}h planifié vs ${ha.toFixed(1)}h réel`,
                  severity: "info",
                });
                out.push({
                  id: "baro-global-cost",
                  short: `Semaine (Global) — Coût: ${eur(cp)} planifié vs ${eur(ca)} réel`,
                  severity: "info",
                });
              } else if (scope === "team") {
                const t = normTeam(employee?.team ?? null);
                const agg = tc.byTeam.find((x) => x.team === t);
                if (agg) {
                  out.push({
                    id: `baro-team-hours-${t}`,
                    short: `Semaine (${t}) — Heures: ${agg.hours_planned.toFixed(1)}h planifié vs ${agg.hours_actual.toFixed(1)}h réel`,
                    severity: "info",
                  });
                  out.push({
                    id: `baro-team-cost-${t}`,
                    short: `Semaine (${t}) — Coût: ${eur(agg.cost_planned)} planifié vs ${eur(agg.cost_actual)} réel`,
                    severity: "info",
                  });
                }
              } else {
                const hp = tc.me.hours_planned ?? 0;
                const ha = tc.me.hours_actual ?? 0;
                const cp = tc.me.cost_planned ?? 0;
                const ca = tc.me.cost_actual ?? 0;
                out.push({
                  id: "baro-me-hours",
                  short: `Semaine (Moi) — Heures: ${hp.toFixed(1)}h planifié vs ${ha.toFixed(1)}h réel`,
                  severity: "info",
                });
                out.push({
                  id: "baro-me-cost",
                  short: `Semaine (Moi) — Coût: ${eur(cp)} planifié vs ${eur(ca)} réel`,
                  severity: "info",
                });
              }
              return out;
            })
            .catch(() => [])
        );
      }

      // Météo (WeatherAPI): affichée même sans session
      if (settings.modules.weather) {
        if (settings.useGeo) {
          if (typeof settings.lat === "number" && typeof settings.lon === "number") {
            promises.push(
              fetchWeatherByCoordsWeatherAPI(settings.lat, settings.lon).catch(() => [])
            );
          } else {
            const p = askBrowserPosition()
              .then(async (coords) => {
                if (coords) {
                  setGeo({ lat: coords.lat, lon: coords.lon });
                  try {
                    return await fetchWeatherByCoordsWeatherAPI(coords.lat, coords.lon);
                  } catch {
                    return [];
                  }
                }
                return await fetchWeatherItemsWeatherAPI(settings.weatherCity).catch(() => []);
              })
              .catch(() => []);
            promises.push(p);
          }
        } else {
          promises.push(fetchWeatherItemsWeatherAPI(settings.weatherCity).catch(() => []));
        }
      }

      // Message personnalisé (toujours)
      const msg = (settings.customMessage || "").trim();
      if (msg.length > 0) {
        promises.push(Promise.resolve([{ id: "custom-message", short: msg, severity: "info" }]));
      }

      const results = await Promise.all(promises);
      const flat = results.flat().filter(Boolean);
      const seen = new Set<string>();
      const merged: TickerItem[] = [];
      for (const it of flat) {
        const id = it.id || Math.random().toString(36).slice(2);
        if (seen.has(id)) continue;
        seen.add(id);
        merged.push({ ...it, id });
      }

      setItems(merged.slice(0, 80));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [
    authLoading,
    session,
    employee,
    settings.modules.alerts,
    settings.modules.weather,
    settings.useGeo,
    settings.lat,
    settings.lon,
    settings.weatherCity,
    settings.customMessage,
    settings.scope,
    askBrowserPosition,
    setGeo,
    normTeam,
  ]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Rafraîchissement périodique
  React.useEffect(() => {
    const id = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [refresh]);

  const value = React.useMemo<TickerContextValue>(() => ({ items, refresh, loading }), [items, loading, refresh]);

  return <TickerContext.Provider value={value}>{children}</TickerContext.Provider>;
};

export const useTicker = () => {
  const ctx = React.useContext(TickerContext);
  if (!ctx) throw new Error("useTicker must be used within TickerProvider");
  return ctx;
};