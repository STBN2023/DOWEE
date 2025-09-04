"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ReferencesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      if (!data.session) {
        router.replace("/auth/login");
      }
      // Redirect permanently to the new Projects admin route
      router.replace("/admin/projects");
      return;
    })();
    return () => { mounted = false; };
  }, [router]);

  if (loading) return <p style={{ textAlign: 'center' }}>Chargement…</p>;

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, textAlign: 'center' }}>
      <h1 className="h1">Redirection…</h1>
      <p>Cette page a été déplacée vers « Gestion des Projets ». Vous allez être redirigé.</p>
    </div>
  );
}
