"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

type Tariff = {
  id: string;
  name: string;
  daily_rate: number;
  hourly_rate: number;
  currency: string;
  active: boolean;
};

export default function TariffsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
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
        .from("tariffs_reference")
        .select("id,name,daily_rate,hourly_rate,currency,active")
        .order("name", { ascending: true, nullsFirst: true });
      if (!mounted) return;
      if (error) setError(error.message);
      setTariffs((rows as any[]) as Tariff[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) return <p style={{ textAlign: 'center' }}>Chargement…</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="h1 mb-4">Tarifs de référence</h1>
      {error && <p className="text-red-600">Erreur: {error}</p>}
      <div className="rounded border bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 px-3">Nom</th>
              <th className="py-2 px-3">Journalier</th>
              <th className="py-2 px-3">Horaire</th>
              <th className="py-2 px-3">Devise</th>
              <th className="py-2 px-3">Actif</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.map(t => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-2 px-3">{t.name}</td>
                <td className="py-2 px-3">{t.daily_rate.toFixed(2)} {t.currency}</td>
                <td className="py-2 px-3">{t.hourly_rate.toFixed(2)} {t.currency}</td>
                <td className="py-2 px-3">{t.currency}</td>
                <td className="py-2 px-3">{t.active ? 'Oui' : 'Non'}</td>
              </tr>
            ))}
            {tariffs.length === 0 && (
              <tr>
                <td colSpan={5} className="py-6 text-center text-gray-500">Aucun tarif</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
