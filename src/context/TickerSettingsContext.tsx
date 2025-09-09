import React from "react";

export type TickerModules = {
  alerts: boolean;
  weather: boolean;
  tips: boolean;
};
export type WeatherProvider = "open-meteo" | "weatherapi";

export type TickerSettings = {
  modules: TickerModules;
  weatherCity: string; // ex: "Paris"
  useGeo: boolean;
  lat: number | null;
  lon: number | null;
  weatherProvider: WeatherProvider;
};

type Ctx = {
  settings: TickerSettings;
  setModules: (mods: Partial<TickerModules>) => void;
  setWeatherCity: (city: string) => void;
  setGeo: (patch: Partial<{ useGeo: boolean; lat: number | null; lon: number | null }>) => void;
  setWeatherProvider: (p: WeatherProvider) => void;
};

const LS_KEY = "dowee.ticker.settings";

const defaultSettings: TickerSettings = {
  modules: {
    alerts: true,
    weather: true,
    tips: true,
  },
  weatherCity: "Paris",
  useGeo: false,
  lat: null,
  lon: null,
  weatherProvider: "open-meteo",
};

function loadSettings(): TickerSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultSettings;
    const p = JSON.parse(raw);
    return {
      modules: {
        alerts: p?.modules?.alerts ?? true,
        weather: p?.modules?.weather ?? true,
        tips: p?.modules?.tips ?? true,
      },
      weatherCity: typeof p?.weatherCity === "string" && p.weatherCity.trim() ? p.weatherCity.trim() : "Paris",
      useGeo: !!p?.useGeo,
      lat: typeof p?.lat === "number" ? p.lat : null,
      lon: typeof p?.lon === "number" ? p.lon : null,
      weatherProvider: (p?.weatherProvider === "weatherapi" || p?.weatherProvider === "open-meteo") ? p.weatherProvider : "open-meteo",
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s: TickerSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

const TickerSettingsContext = React.createContext<Ctx | undefined>(undefined);

export const TickerSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = React.useState<TickerSettings>(() => loadSettings());

  const setModules = (mods: Partial<TickerModules>) => {
    setSettings((prev) => {
      const next = { ...prev, modules: { ...prev.modules, ...mods } };
      saveSettings(next);
      return next;
    });
  };

  const setWeatherCity = (city: string) => {
    setSettings((prev) => {
      const next = { ...prev, weatherCity: city };
      saveSettings(next);
      return next;
    });
  };

  const setGeo = (patch: Partial<{ useGeo: boolean; lat: number | null; lon: number | null }>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const setWeatherProvider = (p: WeatherProvider) => {
    setSettings((prev) => {
      const next = { ...prev, weatherProvider: p };
      saveSettings(next);
      return next;
    });
  };

  const value = React.useMemo<Ctx>(() => ({ settings, setModules, setWeatherCity, setGeo, setWeatherProvider }), [settings]);

  return <TickerSettingsContext.Provider value={value}>{children}</TickerSettingsContext.Provider>;
};

export const useTickerSettings = () => {
  const ctx = React.useContext(TickerSettingsContext);
  if (!ctx) throw new Error("useTickerSettings must be used within TickerSettingsProvider");
  return ctx;
};