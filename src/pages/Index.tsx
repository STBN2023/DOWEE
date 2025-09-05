import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useAuth } from "@/context/AuthContext";

const Index = () => {
  const { session } = useAuth();

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F7F7F7]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-[#BFBFBF] bg-white p-8">
          <div className="flex flex-col items-center gap-4">
            <img
              src="/logo_dowee.png"
              alt="DoWee"
              className="mx-auto h-auto w-full max-w-[360px] sm:max-w-[480px] md:max-w-[640px] lg:max-w-[720px] select-none"
            />
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild className="bg-[#214A33] hover:bg-[#214A33]/90 text-white">
                <Link to={session ? "/planning" : "/login"}>{session ? "Ouvrir le planning" : "Se connecter"}</Link>
              </Button>
              <Button asChild variant="outline" className="border-[#F2994A] text-[#214A33] hover:bg-[#F2994A]/10">
                <Link to="/dashboards">Voir les tableaux de bord</Link>
              </Button>
            </div>
          </div>
        </div>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;