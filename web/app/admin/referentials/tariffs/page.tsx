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
  const [saving, setSaving] = useState<Record<string, boolean>>({});
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
      try {
        const resp = await fetch('/api/admin/tariffs_reference', { method: 'GET', cache: 'no-store' });
        if (!mounted) return;
        if (!resp.ok) {
          const txt = await resp.text();
          setError(`API tarifs: ${resp.status} ${txt}`);
        } else {
          const json = await resp.json();
          setTariffs((json?.rows || []) as Tariff[]);
        }
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Erreur lors du chargement des tarifs');
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  async function saveRow(t: Tariff) {
    setSaving(s => ({ ...s, [t.id]: true }));
    setError(null);
    try {
      const resp = await fetch('/api/admin/tariffs_reference', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: t.id,
          name: t.name,
          daily_rate: t.daily_rate,
          hourly_rate: t.hourly_rate,
          currency: t.currency,
          active: t.active,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Echec sauvegarde (${resp.status}): ${txt}`);
      }
    } catch (e: any) {
      setError(e?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(s => ({ ...s, [t.id]: false }));
    }
  }

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
              <th className="py-2 px-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tariffs.map(t => (
              <tr key={t.id} className="border-b last:border-0">
                <td className="py-2 px-3">
                  <input className="input w-full" value={t.name} onChange={e=>setTariffs(arr=>arr.map(x=>x.id===t.id?{...x, name:e.target.value}:x))} />
                </td>
                <td className="py-2 px-3">
                  <input type="number" step="0.01" className="input w-32" value={t.daily_rate}
                         onChange={e=>setTariffs(arr=>arr.map(x=>x.id===t.id?{...x, daily_rate: Number(e.target.value)}:x))} />
                </td>
                <td className="py-2 px-3">
                  <input type="number" step="0.01" className="input w-32" value={t.hourly_rate}
                         onChange={e=>setTariffs(arr=>arr.map(x=>x.id===t.id?{...x, hourly_rate: Number(e.target.value)}:x))} />
                </td>
                <td className="py-2 px-3">
                  <input className="input w-20" value={t.currency}
                         onChange={e=>setTariffs(arr=>arr.map(x=>x.id===t.id?{...x, currency:e.target.value.toUpperCase().slice(0,3)}:x))} />
                </td>
                <td className="py-2 px-3">
                  <input type="checkbox" checked={t.active} onChange={e=>setTariffs(arr=>arr.map(x=>x.id===t.id?{...x, active:e.target.checked}:x))} />
                </td>
                <td className="py-2 px-3">
                  <button className="rounded bg-[#214A33] px-2 py-1 text-white text-xs disabled:opacity-60"
                          disabled={!!saving[t.id]}
                          onClick={()=>saveRow(t)}>
                    {saving[t.id] ? '…' : 'Enregistrer'}
                  </button>
                </td>
              </tr>
            ))}
            {tariffs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">Aucun tarif</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
