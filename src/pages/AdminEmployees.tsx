import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { listEmployees, type Employee } from "@/api/adminEmployees";

const AdminEmployees = () => {
  const { loading: authLoading, employee } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [employees, setEmployees] = React.useState<Employee[]>([]);

  const refresh = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await listEmployees();
      setEmployees(data);
    } catch (e: any) {
      setErrorMsg(e?.message || "Erreur lors du chargement des profils.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (authLoading || !employee) {
      setLoading(true);
      return;
    }
    refresh();
  }, [authLoading, employee]);

  const fullName = (e: Employee) => {
    if (e.display_name && e.display_name.trim()) return e.display_name;
    const names = [e.first_name, e.last_name].filter(Boolean).join(" ").trim();
    return names || e.id;
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Profils salariés</CardTitle>
        </CardHeader>
        <CardContent>
          {errorMsg && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{errorMsg}</div>
          )}
          <div className="overflow-x-auto rounded-md border border-[#BFBFBF] bg-white">
            <table className="w-full border-collapse">
              <thead className="bg-[#F7F7F7]">
                <tr>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Nom</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Rôle</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Équipe</th>
                  <th className="p-2 text-left text-sm font-semibold text-[#214A33]">Mise à jour</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-sm text-[#214A33]/60">Chargement…</td>
                  </tr>
                ) : employees.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-sm text-[#214A33]/60">Aucun salarié pour le moment.</td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id} className="border-t border-[#BFBFBF]">
                      <td className="p-2 text-sm">{fullName(e)}</td>
                      <td className="p-2 text-sm">{e.role ?? "user"}</td>
                      <td className="p-2 text-sm">{e.team ?? "—"}</td>
                      <td className="p-2 text-sm">{e.updated_at ? new Date(e.updated_at).toLocaleString() : "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-[#214A33]/60">
            Les profils sont créés automatiquement à la première connexion. Cette liste reflète les comptes existants.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminEmployees;