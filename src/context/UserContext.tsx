import React from "react";

export type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email: string;
};

type UserContextValue = {
  employees: Employee[];
  currentEmployeeId: string | null;
  setCurrentEmployeeId: (id: string) => void;
};

const UserContext = React.createContext<UserContextValue | undefined>(undefined);

const LS_EMPLOYEES = "dowee.admin.employees";
const LS_CURRENT_EMP = "dowee.currentEmployeeId";

function seedEmployeesIfMissing(): Employee[] {
  const raw = localStorage.getItem(LS_EMPLOYEES);
  if (raw) {
    return JSON.parse(raw) as Employee[];
  }
  const seeded: Employee[] = [
    { id: "e1", first_name: "Alice", last_name: "Martin", email: "alice@example.com" },
    { id: "e2", first_name: "Bruno", last_name: "Durand", email: "bruno@example.com" },
    { id: "e3", first_name: "Chloé", last_name: "Bernard", email: "chloe@example.com" },
    { id: "e4", first_name: "David", last_name: "Roux", email: "david@example.com" },
    { id: "e5", first_name: "Emma", last_name: "Petit", email: "emma@example.com" },
  ];
  localStorage.setItem(LS_EMPLOYEES, JSON.stringify(seeded));
  return seeded;
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    const emps = seedEmployeesIfMissing();
    setEmployees(emps);
    const savedId = localStorage.getItem(LS_CURRENT_EMP);
    setCurrentEmployeeIdState(savedId || (emps[0]?.id ?? null));
  }, []);

  const setCurrentEmployeeId = (id: string) => {
    setCurrentEmployeeIdState(id);
    localStorage.setItem(LS_CURRENT_EMP, id);
  };

  const value = React.useMemo(
    () => ({ employees, currentEmployeeId, setCurrentEmployeeId }),
    [employees, currentEmployeeId]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const ctx = React.useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used within UserProvider");
  return ctx;
};