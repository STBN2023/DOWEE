"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function NewAgencyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
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
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, [router]);

  async function handleCreate() {
    if (!name.trim()) { setError('Nom requis'); return; }
    setError(null);
    const { error } = await supabaseBrowser.from('agencies').insert({ name: name.trim() as any });
    if (error) { setError(error.message); return; }
    router.push('/admin/referentials/agencies');
  }

  if (loading) return <p style={{ textAlign: 'center' }}>Chargement…</p>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <div className="mb-4">
        <Link href="/admin/referentials/agencies" className="text-sm underline">← Retour</Link>
      </div>
      <h1 className="h1 mb-4">Nouvelle agence</h1>
      {error && <p className="text-red-600 mb-2">Erreur: {error}</p>}
      <div className="rounded border bg-white p-4">
        <label className="mb-1 block text-sm">Nom</label>
        <input className="input w-full" value={name} onChange={(e)=>setName(e.target.value)} placeholder="Ex: Paris" />
        <div className="mt-4 flex items-center gap-2">
          <button className="rounded border px-3 py-1" onClick={()=>router.push('/admin/referentials/agencies')}>Annuler</button>
          <button className="rounded bg-[#214A33] px-3 py-1 text-white" onClick={handleCreate}>Créer</button>
        </div>
      </div>
    </div>
  );
}
