import React from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess } from "@/utils/toast";

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

  const fetchEmployee = async (userId: string) => {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      // Si erreur de permission/absence, on considère orphelin => signout
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setEmployee(null);
      setLoading(false);
      return;
    }

    if (!data) {
      // Orphelin: session valide mais pas de ligne employees
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setEmployee(null);
      setLoading(false);
      return;
    }

    setEmployee(data);
  };

  React.useEffect(() => {
    let mounted = true;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      const sess = data.session ?? null;
      if (!mounted) return;
      setSession(sess);
      setUser(sess?.user ?? null);

      if (sess?.user?.id) {
        await fetchEmployee(sess.user.id);
      } else {
        setEmployee(null);
      }

      setLoading(false);
    };

    init();

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user?.id) {
        await fetchEmployee(newSession.user.id);
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