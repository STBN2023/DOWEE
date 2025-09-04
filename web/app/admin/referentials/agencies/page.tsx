"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function AgenciesListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace("/auth/login");
        return;
      }
      setLoading(true);
      setError(null);
      const { data: rows, error } = await supabaseBrowser
        .from("agencies")
        .select("id,name")
        .order("name", { ascending: true, nullsFirst: true });
      if (!mounted) return;
      if (error) setError(error.message);
      setAgencies((rows as any[])?.map(r => ({ id: r.id, name: r.name })) || []);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) return <p style={{ textAlign: 'center' }}>Chargement…</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="h1">Agences ({agencies.length})</h1>
        <Link href="/admin/referentials/agencies/new" className="rounded bg-[#214A33] px-3 py-2 text-white hover:brightness-110">Nouvelle agence</Link>
      </div>
      {error && <p className="text-red-600">Erreur: {error}</p>}
      <div className="rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Nom</th>
            </tr>
          </thead>
          <tbody>
            {agencies.map(a => (
              <tr key={a.id} className="border-b last:border-0">
                <td className="py-2 px-3">{a.name}</td>
              </tr>
            ))}
            {agencies.length === 0 && (
              <tr>
                <td className="py-6 text-center text-gray-500">Aucune agence</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
