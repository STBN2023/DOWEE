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
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}>
      <h1 className="h1">Référentiels</h1>
      <p style={{ textAlign: 'center' }}>
        Page placeholder. Ici vous pourrez gérer les agences, fonctions, niveaux d'expertise, etc.
      </p>
    </div>
  );
}
