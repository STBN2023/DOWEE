import React from "react";

export type Role = "admin" | "manager" | "user";

type RoleContextValue = {
  role: Role;
  setRole: (r: Role) => void;
};

const RoleContext = React.createContext<RoleContextValue | undefined>(undefined);

export const RoleProvider = ({ children }: { children: React.ReactNode }) => {
  const [role, setRoleState] = React.useState<Role>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("dowee.role") : null;
    return (saved as Role) || "user";
  });

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem("dowee.role", r);
  };

  const value = React.useMemo(() => ({ role, setRole }), [role]);

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
};

export const useRole = () => {
  const ctx = React.useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used within RoleProvider");
  return ctx;
};