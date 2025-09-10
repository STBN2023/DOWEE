import React from "react";

export type BotSettings = {
  afternoonReminderEnabled: boolean;
  afternoonReminderHour: number; // 0-23
  afternoonReminderRepeatMinutes: number; // intervalle de répétition (min)
};

type Ctx = {
  settings: BotSettings;
  setEnabled: (v: boolean) => void;
  setHour: (h: number) => void;
  setRepeatMinutes: (m: number) => void;
};

const LS_KEY = "dowee.bot.settings";

const defaultSettings: BotSettings = {
  afternoonReminderEnabled: true,
  afternoonReminderHour: 16,
  afternoonReminderRepeatMinutes: 30,
};

function loadSettings(): BotSettings {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return defaultSettings;
    const p = JSON.parse(raw);
    const hour = Number(p?.afternoonReminderHour);
    const repeat = Number(p?.afternoonReminderRepeatMinutes);
    return {
      afternoonReminderEnabled: !!p?.afternoonReminderEnabled,
      afternoonReminderHour: Number.isFinite(hour) ? Math.max(0, Math.min(23, hour)) : 16,
      afternoonReminderRepeatMinutes: Number.isFinite(repeat) ? Math.max(5, Math.min(240, repeat)) : 30,
    };
  } catch {
    return defaultSettings;
  }
}

function saveSettings(s: BotSettings) {
  localStorage.setItem(LS_KEY, JSON.stringify(s));
}

const BotSettingsContext = React.createContext<Ctx | undefined>(undefined);

export const BotSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = React.useState<BotSettings>(() => loadSettings());

  const setEnabled = (v: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, afternoonReminderEnabled: !!v };
      saveSettings(next);
      return next;
    });
  };

  const setHour = (h: number) => {
    const hour = Number.isFinite(h) ? Math.max(0, Math.min(23, Math.round(h))) : 16;
    setSettings((prev) => {
      const next = { ...prev, afternoonReminderHour: hour };
      saveSettings(next);
      return next;
    });
  };

  const setRepeatMinutes = (m: number) => {
    const min = Number.isFinite(m) ? Math.max(5, Math.min(240, Math.round(m))) : 30;
    setSettings((prev) => {
      const next = { ...prev, afternoonReminderRepeatMinutes: min };
      saveSettings(next);
      return next;
    });
  };

  const value: Ctx = React.useMemo(
    () => ({ settings, setEnabled, setHour, setRepeatMinutes }),
    [settings]
  );

  return <BotSettingsContext.Provider value={value}>{children}</BotSettingsContext.Provider>;
};

export const useBotSettings = () => {
  const ctx = React.useContext(BotSettingsContext);
  if (!ctx) throw new Error("useBotSettings must be used within BotSettingsProvider");
  return ctx;
};