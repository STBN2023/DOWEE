import { Link, NavLink } from "react-router-dom";
import { useRole } from "@/context/RoleContext";
import { useUser } from "@/context/UserContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import AuthUserBadge from "@/components/AuthUserBadge";
import BurgerMenu from "@/components/BurgerMenu";

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    "px-3 py-2 rounded-md text-sm font-medium transition-colors",
    isActive
      ? "bg-[#214A33] text-white"
      : "text-[#214A33] hover:bg-[#214A33]/10 hover:text-[#214A33]"
  );

function fullName(e: { display_name?: string; first_name?: string; last_name?: string; email: string }) {
  if (e.display_name && e.display_name.trim()) return e.display_name;
  const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return names || e.email;
}

const Header = () => {
  const { role, setRole } = useRole();
  const { employees, currentEmployeeId, setCurrentEmployeeId } = useUser();
  const { loading, session, employee } = useAuth();

  return (
    <header className="w-full border-b border-[#BFBFBF] bg-[#F7F7F7]">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <BurgerMenu />
            <Link to="/" className="ml-1 text-lg font-semibold tracking-tight text-[#214A33]">
              DOWEE V2
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/" className={navLinkClass} end>
                Accueil
              </NavLink>
              <NavLink to="/planning" className={navLinkClass}>
                Planning
              </NavLink>
              <NavLink to="/dashboards" className={navLinkClass}>
                Tableaux de bord
              </NavLink>
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#214A33]/80">Vue</span>
            <Select value={role} onValueChange={(v) => setRole(v as any)}>
              <SelectTrigger className="w-[140px] bg-white border-[#BFBFBF] text-[#214A33]">
                <SelectValue placeholder="Rôle" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>

            <span className="ml-2 text-sm text-[#214A33]/80 hidden sm:inline">Utilisateur</span>
            <Select
              value={currentEmployeeId ?? undefined}
              onValueChange={(v) => setCurrentEmployeeId(v)}
            >
              <SelectTrigger className="w-[200px] bg-white border-[#BFBFBF] text-[#214A33]">
                <SelectValue placeholder="Sélectionner" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {fullName(e)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-2">
              {loading ? (
                <div className="text-sm text-[#214A33]/60">…</div>
              ) : session && employee ? (
                <AuthUserBadge />
              ) : (
                <NavLink to="/login" className={navLinkClass}>
                  Se connecter
                </NavLink>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;