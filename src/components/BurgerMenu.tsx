import React from "react";
import { Menu, Home, CalendarDays, BarChart3, Settings, Users, Building2, FolderKanban, Shapes, Bug, ListChecks, Wallet, Receipt, Banknote, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "react-router-dom";
import { useRole } from "@/context/RoleContext";

const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => (
  <Link
    to={to}
    onClick={onClick}
    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-[#214A33] hover:bg-[#214A33]/10"
  >
    <Icon className="h-4 w-4 text-[#214A33]" />
    <span>{label}</span>
  </Link>
);

const BurgerMenu = () => {
  const [open, setOpen] = React.useState(false);
  const { role } = useRole();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]">
          <Menu className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] bg-[#F7F7F7] p-0">
        <SheetHeader className="border-b border-[#BFBFBF] bg-white px-4 py-3">
          <SheetTitle className="text-[#214A33]">Navigation</SheetTitle>
        </SheetHeader>
        <div className="px-2 py-3">
          <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-[#214A33]/60">Général</div>
          <nav className="flex flex-col">
            <NavItem to="/" icon={Home} label="Accueil" onClick={() => setOpen(false)} />
            <NavItem to="/planning" icon={CalendarDays} label="Planning (semaine)" onClick={() => setOpen(false)} />
            <NavItem to="/day" icon={CalendarDays} label="Journée (édition)" onClick={() => setOpen(false)} />
            <NavItem to="/dashboards" icon={BarChart3} label="Tableaux de bord" onClick={() => setOpen(false)} />
            <NavItem to="/reports/changes" icon={ListChecks} label="Reporting modifs" onClick={() => setOpen(false)} />
            <NavItem to="/profitability/clients" icon={Wallet} label="Rentabilité clients" onClick={() => setOpen(false)} />
            <NavItem to="/profitability/projects" icon={Receipt} label="Rentabilité projets" onClick={() => setOpen(false)} />
          </nav>

          <div className="mb-2 mt-4 px-2 text-xs font-semibold uppercase tracking-wide text-[#214A33]/60">Administration</div>
          <nav className="flex flex-col">
            <NavItem to="/admin" icon={Settings} label="Admin (hub)" onClick={() => setOpen(false)} />
            <NavItem to="/admin/employees" icon={Users} label="Profils salariés" onClick={() => setOpen(false)} />
            <NavItem to="/admin/clients" icon={Building2} label="Clients" onClick={() => setOpen(false)} />
            <NavItem to="/admin/projects" icon={FolderKanban} label="Projets" onClick={() => setOpen(false)} />
            <NavItem to="/admin/tariffs" icon={Wallet} label="Barèmes (tarifs)" onClick={() => setOpen(false)} />
            <NavItem to="/admin/internal-costs" icon={Banknote} label="Coûts internes" onClick={() => setOpen(false)} />
            <NavItem to="/admin/references" icon={Shapes} label="Références" onClick={() => setOpen(false)} />
            <NavItem to="/admin/llm" icon={Brain} label="LLM (OpenAI)" onClick={() => setOpen(false)} />
            {role === "admin" && (
              <NavItem to="/debug" icon={Bug} label="Debug" onClick={() => setOpen(false)} />
            )}
          </nav>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default BurgerMenu;