import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";
import React from "react";

const Index = () => {
  const navigate = useNavigate();
  const { session, user, employee } = useAuth();

  React.useEffect(() => {
    if (!session) return;
    // Nouveau: toujours dashboard perso
    navigate("/dashboards?tab=me", { replace: true });
  }, [session, navigate]);

  // Ouvre le bot à l'arrivée (avant connexion) pour proposer la découverte
  React.useEffect(() => {
    if (session) return; // seulement avant connexion
    try {
      const key = "dowee.bot.welcome.prompted";
      const already = sessionStorage.getItem(key) === "1";
      if (!already) {
        sessionStorage.setItem(key, "1");
        window.dispatchEvent(new Event("dowee:bot:welcome"));
      }
    } catch {
      // no-op si sessionStorage non disponible
      window.dispatchEvent(new Event("dowee:bot:welcome"));
    }
  }, [session]);

  const firstName = React.useMemo(() => {
    const fn = employee?.first_name?.trim();
    if (fn) return fn;
    const dn = employee?.display_name?.trim();
    if (dn) return dn.split(" ")[0];
    const email = user?.email || "";
    if (email.includes("@")) return email.split("@")[0];
    return "là";
  }, [employee?.first_name, employee?.display_name, user?.email]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F7F7F7]">
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-lg border border-[#BFBFBF] bg-white p-6 md:p-8">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/logo_dowee.png"
              alt="DoWee"
              className="mx-auto w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px] select-none"
            />

            {session ? (
              <div className="mt-2 flex flex-col items-center gap-4">
                <div className="text-lg font-semibold text-[#214A33]">
                  Bonjour {firstName} 👋
                </div>
                <div className="flex gap-2">
                  <Button asChild className="bg-[#214A33] hover:bg-[#214A33]/90 text-white">
                    <Link to="/dashboards?tab=me">Mon tableau de bord</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 flex flex-wrap justify-center gap-3">
                <Button asChild className="bg-[#214A33] hover:bg-[#214A33]/90 text-white">
                  <Link to="/login">Se connecter</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;