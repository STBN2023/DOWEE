import React from "react";
import { getAlerts, type AlertItem } from "@/api/alerts";
import { useAuth } from "@/context/AuthContext";

type TickerContextValue = {
  items: AlertItem[];
  refresh: () => Promise<void>;
  loading: boolean;
};

const TickerContext = React.createContext<TickerContextValue | undefined>(undefined);

export const TickerProvider = ({ children }: { children: React.ReactNode }) => {
  const { loading: authLoading, session, employee } = useAuth();

  const [items, setItems] = React.useState<AlertItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);

  const refresh = React.useCallback(async () => {
    // N’appelle rien tant que l’auth n’est pas prête
    if (authLoading || !session || !employee) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Toujours en portée globale (tous les projets de l’entreprise)
      const data = await getAlerts("global", 20);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, session, employee]);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Rafraîchissement périodique uniquement si l’utilisateur est connecté
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