import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Protection d'authentification côté serveur: aucune page /admin* ne s'affiche sans session
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      // En cas d'erreur d'auth, on redirige vers login
      redirect('/auth/login');
    }
    if (!data?.session) {
      redirect('/auth/login');
    }
  } catch {
    redirect('/auth/login');
  }

  return (
    <>{children}</>
  );
}
