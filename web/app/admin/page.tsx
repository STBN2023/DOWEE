"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import Link from "next/link";
import { UsersIcon, FolderOpenIcon, BookOpenIcon, WrenchScrewdriverIcon, BuildingOfficeIcon } from "@heroicons/react/24/outline";

export default function AdminHomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      const session = data.session;
      if (!mounted) return;
      if (!session) {
        router.replace("/auth/login");
        return;
      }
      setEmail(session.user.email ?? null);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [router]);

  async function signOut() {
    await supabaseBrowser.auth.signOut();
    router.replace("/auth/login");
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="h1">Administration</h1>
        <p className="text-center">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="h1">Administration</h1>
      <p className="text-center mb-6">Tableau de bord administrateur. Connecté en tant que <strong>{email}</strong>.</p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Bloc 1: Gestion des Salariés */}
        <section className="rounded-xl bg-white border border-[#BFBFBF] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#214A33] text-white flex items-center justify-center">
              <UsersIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#214A33]">Gestion des Salariés</h2>
          </div>
          <p className="mb-2">Ajouter, modifier, supprimer et importer des salariés. Export Excel disponible.</p>
          <ul className="list-disc ml-5 text-[#214A33] mb-3">
            <li>CRUD complet</li>
            <li>Import/Export Excel</li>
            <li>Gestion des profils</li>
          </ul>
          <Link href="/admin/employees" className="inline-block bg-[#F2994A] text-white px-4 py-2 rounded-lg transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]/40">Accéder au module</Link>
        </section>

        {/* Bloc 2: Gestion des Projets */}
        <section className="rounded-xl bg-white border border-[#BFBFBF] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#214A33] text-white flex items-center justify-center">
              <FolderOpenIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#214A33]">Gestion des Projets</h2>
          </div>
          <p className="mb-2">Administrer les projets et leurs associations avec les équipes.</p>
          <ul className="list-disc ml-5 text-[#214A33] mb-3">
            <li>Projets</li>
            <li>Import/Export Excel</li>
            <li>Associations équipes</li>
          </ul>
          <Link href="/admin/projects" className="inline-block bg-[#F2994A] text-white px-4 py-2 rounded-lg transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]/40">Accéder au module</Link>
        </section>

        {/* Bloc 3: Référentiels */}
        <section className="rounded-xl bg-white border border-[#BFBFBF] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#214A33] text-white flex items-center justify-center">
              <BookOpenIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#214A33]">Référentiels</h2>
          </div>
          <p className="mb-2">Gérer les agences, fonctions, niveaux d'expertise et autres données de référence.</p>
          <ul className="list-disc ml-5 text-[#214A33] mb-3">
            <li>Agences</li>
            <li>Fonctions</li>
            <li>Niveaux d'expertise</li>
          </ul>
          <Link href="/admin/referentials" className="inline-block bg-[#F2994A] text-white px-4 py-2 rounded-lg transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]/40">Accéder au module</Link>
        </section>

        {/* Bloc 4: Gestion des Clients */}
        <section className="rounded-xl bg-white border border-[#BFBFBF] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#214A33] text-white flex items-center justify-center">
              <BuildingOfficeIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#214A33]">Gestion des Clients</h2>
          </div>
          <p className="mb-2">Gérer les clients et leurs informations.</p>
          <ul className="list-disc ml-5 text-[#214A33] mb-3">
            <li>CRUD complet</li>
            <li>Import/Export Excel</li>
            <li>Projets associés</li>
          </ul>
          <Link href="/admin/clients" className="inline-block bg-[#F2994A] text-white px-4 py-2 rounded-lg transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]/40">Accéder au module</Link>
        </section>

        {/* Bloc 5: Outils Admin */}
        <section className="rounded-xl bg-white border border-[#BFBFBF] p-4 shadow-sm transition-shadow hover:shadow-md">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-9 h-9 rounded-lg bg-[#214A33] text-white flex items-center justify-center">
              <WrenchScrewdriverIcon className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-[#214A33]">Outils Admin</h2>
          </div>
          <p className="mb-2">Outils avancés d'administration : RAZ sécurisée, exports globaux, maintenance.</p>
          <ul className="list-disc ml-5 text-[#214A33] mb-3">
            <li>RAZ sécurisée</li>
            <li>Exports globaux</li>
            <li>Maintenance DB</li>
          </ul>
          <Link href="/admin/tools" className="inline-block bg-[#F2994A] text-white px-4 py-2 rounded-lg transition-colors hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]/40">Accéder au module</Link>
        </section>
      </div>

      {/* Bouton de déconnexion supprimé selon demande */}
    </div>
  );
}
