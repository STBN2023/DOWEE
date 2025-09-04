"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ToolsPage() {
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
      <h1 className="h1">Outils Admin</h1>
      <p style={{ textAlign: 'center' }}>
        Page placeholder. Ici vous trouverez les outils avancés (RAZ sécurisée, exports globaux, maintenance DB).
      </p>
    </div>
  );
}
