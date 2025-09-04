"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function Header() {
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        console.log('[Header] init start');
        // 1) Vérifier d'abord la session (plus fiable que getUser en montage)
        const { data: sess } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        let id = sess.session?.user?.id ?? null;
        if (!id) {
          const { data: u } = await supabaseBrowser.auth.getUser();
          id = u.user?.id ?? null;
        }
        console.log('[Header] detected user id:', id);
        setUserId(id);
        // 2) Charger le profil employé si connecté, sans bloquer l'état connecté en cas d'erreur RLS
        if (id) {
          try {
            const { data: emp, error } = await supabaseBrowser
              .from('employees')
              .select('first_name,last_name,display_name,avatar_url')
              .eq('id', id)
              .maybeSingle();
            if (error) console.warn('[Header] employees fetch error:', error.message);
            const name = (emp?.first_name || emp?.display_name || null);
            setFirstName(name);
            setAvatarUrl(emp?.avatar_url || null);
          } catch (e) {
            console.warn('[Header] employees fetch exception', e);
          }
        } else {
          setFirstName(null);
          setAvatarUrl(null);
        }
      } catch (e) {
        console.warn('[Header] init error', e);
      }
    })();
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange(async (_evt, session) => {
      const id = session?.user?.id ?? null;
      console.log('[Header] onAuthStateChange user id:', id);
      setUserId(id);
      if (id) {
        try {
          const { data: emp, error } = await supabaseBrowser
            .from('employees')
            .select('first_name,last_name,display_name,avatar_url')
            .eq('id', id)
            .maybeSingle();
          if (error) console.warn('[Header] employees fetch error:', error.message);
          const name = (emp?.first_name || emp?.display_name || null);
          setFirstName(name);
          setAvatarUrl(emp?.avatar_url || null);
        } catch (e) {
          console.warn('[Header] employees fetch exception', e);
        }
      } else {
        setFirstName(null);
        setAvatarUrl(null);
      }
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  function initials(name?: string | null) {
    const n = (name || '').trim();
    if (!n) return 'U';
    const parts = n.split(/\s+/);
    return (parts[0]?.[0] || 'U').toUpperCase();
  }

  async function handleLogout() {
    await supabaseBrowser.auth.signOut();
    window.location.href = '/';
  }

  return (
    <header>
      <div className="w-full flex items-center justify-end gap-4 py-3 pl-0 pr-2.5">
        <Link href="/" className="font-semibold">DoWee</Link>
        {!userId ? (
          <Link href="/auth/login" className="text-sm text-[#214A33] hover:underline">Se connecter</Link>
        ) : (
          <div className="flex items-center gap-2">
            {avatarUrl ? (
              <img src={avatarUrl} alt="avatar" className="h-8 w-8 rounded-full object-cover bg-emerald-50" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
                {initials(firstName)}
              </div>
            )}
            <span className="text-sm font-medium text-[#214A33]">{firstName || 'Utilisateur'}</span>
            <button onClick={handleLogout} className="text-xs text-gray-600 underline hover:text-gray-800">Déconnexion</button>
          </div>
        )}
      </div>
    </header>
  );
}
