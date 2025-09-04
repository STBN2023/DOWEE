"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ReferentialsDefaultPage() {
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
    return () => {
      mounted = false;
    };
  }, [router]);

  if (loading) return <p style={{ textAlign: "center" }}>Chargement…</p>;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="h1">Références par défaut</h1>
      <p className="text-center">
        Page placeholder. Ici vous pourrez définir et gérer les valeurs par défaut
        des référentiels (ex: niveaux, types, statuts…).
      </p>
    </div>
  );
}
