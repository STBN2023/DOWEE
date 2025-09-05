import React from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

function nameFrom(employee?: { display_name?: string | null; first_name?: string | null; last_name?: string | null }, email?: string | null) {
  if (!employee) return email || "Utilisateur";
  if (employee.display_name && employee.display_name.trim()) return employee.display_name;
  const names = [employee.first_name, employee.last_name].filter(Boolean).join(" ").trim();
  return names || (email || "Utilisateur");
}

const AuthUserBadge = () => {
  const { user, employee, signOut } = useAuth();

  const label = nameFrom(employee, user?.email ?? null);
  const initial = (label || "").trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="flex items-center gap-2">
      <div className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#BFBFBF] bg-white text-[#214A33]">
        {initial}
      </div>
      <span className="max-w-[140px] truncate text-sm text-[#214A33]">{label}</span>
      <Button size="sm" variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={signOut}>
        Déconnexion
      </Button>
    </div>
  );
};

export default AuthUserBadge;