import React from "react";
import { useAuth } from "@/context/AuthContext";
import { getDayStatus } from "@/api/dayValidation";
import { format } from "date-fns";

const ExitValidationGuard: React.FC = () => {
  const { session } = useAuth();
  const [validated, setValidated] = React.useState<boolean | null>(null);

  const todayIso = React.useMemo(() => format(new Date(), "yyyy-MM-dd"), []);

  const refreshStatus = React.useCallback(async () => {
    if (!session) {
      setValidated(null);
      return;
    }
    try {
      const st = await getDayStatus(todayIso);
      setValidated(st.validated);
    } catch {
      // On ignore les erreurs de statut ici
    }
  }, [session, todayIso]);

  React.useEffect(() => {
    // Charger au montage et à chaque changement de session
    refreshStatus();
  }, [refreshStatus]);

  React.useEffect(() => {
    // Poll léger pour rester à jour (toutes les 60s)
    if (!session) return;
    const id = setInterval(refreshStatus, 60_000);
    return () => clearInterval(id);
  }, [session, refreshStatus]);

  React.useEffect(() => {
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (validated === false) {
        e.preventDefault();
        // La plupart des navigateurs ignorent le message personnalisé
        e.returnValue = "Avez-vous bien validé votre planning du jour ?";
        return "";
      }
      return undefined;
    };

    if (validated === false) {
      window.addEventListener("beforeunload", beforeUnload);
      return () => window.removeEventListener("beforeunload", beforeUnload);
    }
    // Si validé (true) ou inconnu (null), s'assurer qu'il n'y a pas de handler
    return () => {};
  }, [validated]);

  return null;
};

export default ExitValidationGuard;