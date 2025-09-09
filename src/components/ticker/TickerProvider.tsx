import React from "react";
import { getAlerts } from "@/api/alerts";
import { useAuth } from "@/context/AuthContext";
import { useTickerSettings } from "@/context/TickerSettingsContext";
import { fetchWeatherItems, fetchWeatherByCoords, localTipsItems, type TickerItem } from "@/api/tickerExtras";

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
      const timer = setTimeout(() => resolve(null), 8000); // timeout doux
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timer);
          const lat = pos.coords.latitude;
          const lon = pos.coords.longitude;
          resolve({ lat, lon });
        },
        () => {
          clearTimeout(timer);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 }
      );
    });
  }, []);

  const refresh = React.useCallback(async () => {
    if (authLoading || !session || !employee) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const promises: Array<Promise<TickerItem[]>> = [];

      if (settings.modules.alerts) {
        promises.push(
          getAlerts("global", 40)
            .then((r) =>
              (r.items ?? []).map((it) => ({
                id: String(it.id),
                short: String(it.short),
                severity: (it.severity as any) || "info",
              }))
            )
            .catch(() => [])
        );
      }

      if (settings.modules.weather) {
        if (settings.useGeo) {
          if (typeof settings.lat === "number" && typeof settings.lon === "number") {
            promises.push(fetchWeatherByCoords(settings.lat, settings.lon).catch(() => []));
          } else {
            // Demander la position si absente, puis fallback ville
            const p = askBrowserPosition()
              .then(async (coords) => {
                if (coords) {
                  // persiste pour les prochains rafraîchissements
                  setGeo({ lat: coords.lat, lon: coords.lon });
                  return await fetchWeatherByCoords(coords.lat, coords.lon);
                }
                return await fetchWeatherItems(settings.weatherCity);
              })
              .catch(() => []);
            promises.push(p);
          }
        } else {
          promises.push(fetchWeatherItems(settings.weatherCity).catch(() => []));
        }
      }

      if (settings.modules.tips) {
        promises.push(Promise.resolve(localTipsItems(6)));
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
  }, [authLoading, session, employee, settings.modules.alerts, settings.modules.tips, settings.modules.weather, settings.useGeo, settings.lat, settings.lon, settings.weatherCity, askBrowserPosition, setGeo]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  React.useEffect(() => {
    if (authLoading || !session || !employee) return;
    const id = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [authLoading, session, employee, refresh]);

  const value = React.useMemo<TickerContextValue>(() => ({ items, refresh, loading }), [items, loading, refresh]);

  return <TickerContext.Provider value={value}>{children}</TickerContext.Provider>;
};

export const useTicker = () => {
  const ctx = React.useContext(TickerContext);
  if (!ctx) throw new Error("useTicker must be used within TickerProvider");
  return ctx;
};