import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Users, Building2, FolderKanban, Shapes, Coins, Banknote, Brain, Settings } from "lucide-react";

const Tile = ({ to, icon: Icon, title, desc, cta }: { to: string; icon: any; title: string; desc: string; cta: string }) => (
  <Card className="border-[#BFBFBF]">
    <CardHeader>
      <CardTitle className="flex items-center gap-3 text-[#214A33]">
        <Icon className="h-5 w-5 text-[#F2994A]" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="mb-4 text-sm text-[#214A33]/80">{desc}</p>
      <Button asChild className="bg-[#214A33] text-white hover:bg-[#214A33]/90">
        <Link to={to}>{cta}</Link>
      </Button>
    </CardContent>
  </Card>
);

const Admin = () => {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="mb-4 text-2xl font-semibold text-[#214A33]">Administration</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          to="/admin/employees"
          icon={Users}
          title="Profils salariés"
          desc="Créer et gérer les profils des collaborateurs."
          cta="Gérer les profils"
        />
        <Tile
          to="/admin/clients"
          icon={Building2}
          title="Clients"
          desc="Créer et administrer les clients."
          cta="Gérer les clients"
        />
        <Tile
          to="/admin/projects"
          icon={FolderKanban}
          title="Projets"
          desc="Créer, modifier et affecter des salariés aux projets."
          cta="Gérer les projets"
        />
        <Tile
          to="/admin/tariffs"
          icon={Coins}
          title="Barèmes (tarifs)"
          desc="Définir et ajuster les tarifs de facturation HT."
          cta="Gérer les barèmes"
        />
        <Tile
          to="/admin/internal-costs"
          icon={Banknote}
          title="Coûts internes"
          desc="Définir et versionner les coûts journaliers internes."
          cta="Gérer les coûts"
        />
        <Tile
          to="/admin/references"
          icon={Shapes}
          title="Références"
          desc="Ajouter d'autres référentiels (équipes, catégories...)."
          cta="Gérer les références"
        />
        <Tile
          to="/admin/llm"
          icon={Brain}
          title="LLM (OpenAI)"
          desc="Configurer la clé API OpenAI pour le bandeau d’alertes."
          cta="Configurer OpenAI"
        />
        <Tile
          to="/admin/ticker"
          icon={Settings}
          title="Bandeau"
          desc="Activer des modules et configurer la ville météo."
          cta="Ouvrir"
        />
      </div>
    </div>
  );
};

export default Admin;