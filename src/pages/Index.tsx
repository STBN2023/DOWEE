import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";

const Index = () => {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#F7F7F7]">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="rounded-xl border border-[#BFBFBF] bg-white p-8">
          <h1 className="text-4xl font-bold text-[#214A33]">DoWee — V2</h1>
          <p className="mt-2 text-lg text-[#214A33]/80">
            Planification hebdomadaire fluide, glisser-déposer, et tableaux de bord pilotés par rôle.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="bg-[#214A33] hover:bg-[#214A33]/90 text-white">
              <Link to="/planning">Ouvrir le planning</Link>
            </Button>
            <Button asChild variant="outline" className="border-[#F2994A] text-[#214A33] hover:bg-[#F2994A]/10">
              <Link to="/dashboards">Voir les tableaux de bord</Link>
            </Button>
          </div>
        </div>
        <MadeWithDyad />
      </div>
    </div>
  );
};

export default Index;