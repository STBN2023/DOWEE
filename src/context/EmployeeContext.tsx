import React from "react";

export type Employee = {
  id: string;
  first_name?: string;
  last_name?: string;
  display_name?: string;
  email: string;
};

type EmployeeContextValue = {
  employees: Employee[];
  currentEmployeeId: string | null;
  currentEmployee: Employee | null;
  setCurrentEmployeeId: (id: string) => void;
  refreshEmployees: () => void;
};

const LS_EMPLOYEES = "dowee.admin.employees";
const LS_CURRENT = "dowee.currentEmployee";

function fullName(e: Employee) {
  if (e.display_name && e.display_name.trim()) return e.display_name;
  const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
  return names || e.email;
}

const defaultEmployees: Employee[] = [
  { id: "e1", first_name: "Alice", last_name: "Martin", email: "alice@example.com" },
  { id: "e2", first_name: "Bruno", last_name: "Durand", email: "bruno@example.com" },
  { id: "e3", first_name: "Chloé", last_name: "Bernard", email: "chloe@example.com" },
  { id: "e4", first_name: "David", last_name: "Roux", email: "david@example.com" },
  { id: "e5", first_name: "Emma", last_name: "Petit", email: "emma@example.com" },
];

const EmployeeContext = React.createContext<EmployeeContextValue | undefined>(undefined);

export const EmployeeProvider = ({ children }: { children: React.ReactNode }) => {
  const [employees, setEmployees] = React.useState<Employee[]>([]);
  const [currentEmployeeId, setCurrentEmployeeIdState] = React.useState<string | null>(null);

  const loadEmployees = React.useCallback(() => {
    const raw = localStorage.getItem(LS_EMPLOYEES);
    if (!raw) {
      localStorage.setItem(LS_EMPLOYEES, JSON.stringify(defaultEmployees));
      setEmployees(defaultEmployees);
      return defaultEmployees;
    }
    const list = JSON.parse(raw) as Employee[];
    setEmployees(list);
    return list;
  }, []);

  React.useEffect(() => {
    const list = loadEmployees();
    const savedId = localStorage.getItem(LS_CURRENT);
    if (savedId && list.some((e) => e.id === savedId)) {
      setCurrentEmployeeIdState(savedId);
    } else {
      const first = list[0]?.id ?? null;
      setCurrentEmployeeIdState(first);
      if (first) localStorage.setItem(LS_CURRENT, first);
    }
  }, [loadEmployees]);

  const setCurrentEmployeeId = (id: string) => {
    setCurrentEmployeeIdState(id);
    localStorage.setItem(LS_CURRENT, id);
  };

  const refreshEmployees = () => {
    loadEmployees();
  };

  const currentEmployee = React.useMemo(
    () => employees.find((e) => e.id === currentEmployeeId) ?? null,
    [employees, currentEmployeeId]
  );

  const value: EmployeeContextValue = {
    employees,
    currentEmployeeId,
    currentEmployee,
    setCurrentEmployeeId,
    refreshEmployees,
  };

  return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
};

export const useEmployee = () => {
  const ctx = React.useContext(EmployeeContext);
  if (!ctx) throw new Error("useEmployee must be used within EmployeeProvider");
  return ctx;
};

export const getEmployeeLabel = (e: Employee) => fullName(e);