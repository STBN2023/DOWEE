"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Si une session existe déjà (cookie sb-... ou storage), rediriger automatiquement
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        console.log('[Login] onMount session ->', !!data?.session);
        if (mounted && data?.session) {
          router.replace('/admin');
        }
      } catch (e) {
        console.warn('[Login] onMount getSession error', e);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  // Se re-router automatiquement dès que Supabase notifie une connexion
  useEffect(() => {
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      console.log('[Login] onAuthStateChange ->', event, 'session?', !!session);
      if (session) {
        try { router.replace('/admin'); } catch {}
      }
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [router]);


  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('[Login] submit start, URL=', process.env.NEXT_PUBLIC_SUPABASE_URL ?? '(undefined)');
      const { error } = await supabaseBrowser.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        return;
      }
      console.log('[Login] signIn OK');
      // S'assurer que la session est bien établie avant de rediriger
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        console.log('[Login] getSession ->', !!data?.session);
        const { data: userData } = await supabaseBrowser.auth.getUser();
        console.log('[Login] getUser ->', !!userData?.user, userData?.user?.id ?? null);
      } catch (e) {
        console.warn('[Login] getSession error', e);
      }
      // Stopper le spinner tout de suite, avant navigation
      setLoading(false);
      try {
        router.replace("/admin");
      } catch (e) {
        console.warn('[Login] router.replace failed, fallback to hard redirect', e);
        window.location.href = '/admin';
        return;
      }
      // Fallback dur si la navigation SPA n'a pas pris effet
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/admin') {
          window.location.href = '/admin';
        }
      }, 600);
    } catch (e: any) {
      console.error('Login error:', e);
      // Aide utilisateur pour les cas réseau/config
      const msg = e?.message ?? 'Erreur de connexion inattendue. Vérifiez la configuration et réessayez.';
      const hint = ' Astuce: vérifiez NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY dans web/.env.local, et que le provider email/mot de passe est activé dans Supabase.';
      setError(msg + hint);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full px-4 py-8 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-[#214A33]">Bienvenue sur DoWee</h2>
          <p className="mt-1 text-sm text-gray-600">Connectez-vous pour accéder à votre espace.</p>
        </div>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="card p-0 overflow-hidden min-h-[360px]">
            <img src="/logo.png" alt="DoWee" className="h-full w-full object-cover" />
          </div>
          <div className="card h-full min-h-[360px]">
            <h1 className="h1">Connexion</h1>
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm">Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="vous@exemple.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm">Mot de passe</label>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <button className="btn" disabled={loading}>
                {loading ? "Connexion..." : "Se connecter"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
