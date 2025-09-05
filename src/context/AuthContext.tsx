import React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";

type EmployeeRow = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  display_name?: string | null;
  avatar_url?: string | null;
  role?: "admin" | "manager" | "user";
  team?: string | null;
  updated_at?: string | null;
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  employee: EmployeeRow | null;
  signOut: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loading, setLoading] = React.useState(true);
  const [session, setSession] = React.useState<Session | null>(null);
  const [user, setUser] = React.useState<User | null>(null);
  const [employee, setEmployee] = React.useState<EmployeeRow | null>(null);

  const upsertEmployeeIfMissing = async (u: User) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", u.id)
      .maybeSingle();

    if (error) {
      showError(`Connexion impossible: ${error.message}`);
      return null;
    }
    if (data) return data as EmployeeRow;

    const display_name =
      (u.user_metadata?.display_name as string | undefined)?.trim() ||
      (u.email ?? "Utilisateur");
    const first_name = (u.user_metadata?.first_name as string | undefined) || null;
    const last_name = (u.user_metadata?.last_name as string | undefined) || null;

    const { data: created, error: insErr } = await supabase
      .from("employees")
      .insert({
        id: u.id,
        display_name,
        first_name,
        last_name,
      })
      .select("*")
      .single();

    if (insErr) {
      showError(`Activation du profil impossible: ${insErr.message}`);
      return null;
    }

    showSuccess("Profil initialisé.");
    return created as EmployeeRow;
  };

  const fetchEmployee = async (u: User) => {
    const row = await upsertEmployeeIfMissing(u);
    setEmployee(row);
  };

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const sess = data.session ?? null;
      setSession(sess);
      setUser(sess?.user ?? null);

      // Débloque l’UI immédiatement; on finalise le profil en arrière-plan
      setLoading(false);

      if (sess?.user) {
        fetchEmployee(sess.user).catch(() => {
          // Les erreurs sont déjà remontées via toasts; on évite de rebloquer l’UI
        });
      } else {
        setEmployee(null);
      }
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      if (newSession?.user) {
        fetchEmployee(newSession.user).catch(() => {});
      } else {
        setEmployee(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setEmployee(null);
    showSuccess("Déconnecté.");
  };

  const value: AuthContextValue = React.useMemo(
    () => ({ loading, session, user, employee, signOut }),
    [loading, session, user, employee]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};