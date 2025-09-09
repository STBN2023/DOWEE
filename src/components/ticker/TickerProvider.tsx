import React from "react";
import { getAlerts, type AlertItem } from "@/api/alerts";
import { useRole } from "@/context/RoleContext";
import { useAuth } from "@/context/AuthContext";

type TickerContextValue = {
  items: AlertItem[];
  hidden: boolean;
  setHidden: (v: boolean) => void;
  refresh: () => Promise<void>;
  loading: boolean;
};

const TickerContext = React.createContext<TickerContextValue | undefined>(undefined);

const LS_HIDE = "dowee.ticker.hidden";

export const TickerProvider = ({ children }: { children: React.ReactNode }) => {
  const { role } = useRole();
  const { loading: authLoading, session, employee } = useAuth();
  const scope = role === "admin" ? "global" : role === "manager" ? "team" : "me";

  const [items, setItems] = React.useState<AlertItem[]>([]);
  const [hidden, setHiddenState] = React.useState<boolean>(() => localStorage.getItem(LS_HIDE) === "1");
  const [loading, setLoading] = React.useState<boolean>(true);

  const setHidden = (v: boolean) => {
    setHiddenState(v);
    localStorage.setItem(LS_HIDE, v ? "1" : "0");
  };

  const refresh = React.useCallback(async () => {
    // Tant que l’auth est en cours, ou pas de session/profil, ne rien appeler
    if (authLoading || !session || !employee) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await getAlerts(scope, 20);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch {
      // Ne pas faire remonter d’erreur; simplement masquer le ticker
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [authLoading, session, employee, scope]);

  // Charger quand l’utilisateur est prêt (session + profil)
  React.useEffect(() => {
    refresh();
  }, [refresh]);

  // Rafraîchissement périodique uniquement si l’utilisateur est connecté
  React.useEffect(() => {
    if (authLoading || !session || !employee) return;
    const id = setInterval(refresh, 5 * 60 * 1000); // toutes les 5 minutes
    return () => clearInterval(id);
  }, [authLoading, session, employee, refresh]);

  const value = React.useMemo<TickerContextValue>(() => ({ items, hidden, setHidden, refresh, loading }), [items, hidden, loading, refresh]);

  return <TickerContext.Provider value={value}>{children}</TickerContext.Provider>;
};

export const useTicker = () => {
  const ctx = React.useContext(TickerContext);
  if (!ctx) throw new Error("useTicker must be used within TickerProvider");
  return ctx;
};