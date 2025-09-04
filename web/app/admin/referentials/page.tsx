"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ReferentialsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace("/auth/login");
        return;
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) return <p style={{ textAlign: 'center' }}>Chargement…</p>;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <h1 className="h1 mb-6">Référentiels</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="h2 mb-2">Agences</h2>
          <p className="mb-4 text-sm text-gray-600">Créer une nouvelle agence et gérer la liste.</p>
          <div className="flex gap-2">
            <button className="rounded bg-[#214A33] px-3 py-2 text-white hover:brightness-110" onClick={()=>router.push('/admin/referentials/agencies/new')}>Nouvelle agence</button>
            <button className="rounded border px-3 py-2 hover:bg-white/60" onClick={()=>router.push('/admin/referentials/agencies')}>Voir toutes</button>
          </div>
        </div>
        <div className="rounded border bg-white p-4 shadow-sm">
          <h2 className="h2 mb-2">Tarifs</h2>
          <p className="mb-4 text-sm text-gray-600">Consulter et gérer les tarifs de référence (jour / heure).</p>
          <div className="flex gap-2">
            <button className="rounded bg-[#214A33] px-3 py-2 text-white hover:brightness-110" onClick={()=>router.push('/admin/referentials/tariffs')}>Ouvrir</button>
          </div>
        </div>
      </div>
    </div>
  );
}
