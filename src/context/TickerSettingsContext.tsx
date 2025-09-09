import React from "react";

export type TickerModules = {
  alerts: boolean;
  weather: boolean;
  news: boolean;
  tips: boolean;
};

export type TickerSettings = {
  modules: TickerModules;
  weatherCity: string; // ex: "Paris"
};

type Ctx = {
  settings: TickerSettings;
  setModules: (mods: Partial<TickerModules>) => void;
  setWeatherCity: (city: string) => void;
};

const LS_KEY = "dowee.ticker.settings";

const defaultSettings: TickerSettings = {
  modules: {
    alerts: true,
    weather: true,
    news: true,
    tips: true,
  },
  weatherCity: "Paris",
};

function loadSettings(): TickerSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultSettings;
    const parsed = JSON.parse(raw);
    return {
      modules: {
        alerts: parsed?.modules?.alerts ?? true,
        weather: parsed?.modules?.weather ?? true,
        news: parsed?.modules?.news ?? true,
        tips: parsed?.modules?.tips ?? true,
      },
      weatherCity: typeof parsed?.weatherCity === "string" && parsed.weatherCity.trim()
        ? parsed.weatherCity.trim()
        : "Paris",
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

  const value = React.useMemo<Ctx>(() => ({ settings, setModules, setWeatherCity }), [settings]);

  return <TickerSettingsContext.Provider value={value}>{children}</TickerSettingsContext.Provider>;
};

export const useTickerSettings = () => {
  const ctx = React.useContext(TickerSettingsContext);
  if (!ctx) throw new Error("useTickerSettings must be used within TickerSettingsProvider");
  return ctx;
};