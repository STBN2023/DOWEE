"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { HomeIcon, Squares2X2Icon, UsersIcon, FolderOpenIcon, WrenchScrewdriverIcon, BookOpenIcon } from "@heroicons/react/24/outline";

export default function FloatingBurger() {
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabaseBrowser.auth.getSession();
      if (!mounted) return;
      setLoggedIn(!!data.session);
    })();
    const { data: sub } = supabaseBrowser.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => {
      sub.subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  const signOut = async () => {
    await supabaseBrowser.auth.signOut();
    setOpen(false);
    router.push("/");
  };

  return (
    <div className="fixed left-4 top-4 z-50">
      <button
        aria-label="Ouvrir le menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded bg-white/90 shadow hover:bg-white"
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>
      {open && (
        <div className="mt-2 w-64 rounded-xl border bg-[#fbf4ec] p-3 shadow">
          <NavItem href="/" label="Accueil" Icon={HomeIcon} active={pathname === "/"} onNavigate={() => setOpen(false)} />
          <div className="my-2 border-t" />
          <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[#214A33]/80">Administration</div>
          <NavItem href="/admin" label="Tableau de bord Admin" Icon={Squares2X2Icon} active={pathname === "/admin"} onNavigate={() => setOpen(false)} />
          <NavItem href="/admin/employees" label="Gestion Salariés" Icon={UsersIcon} active={pathname?.startsWith("/admin/employees") ?? false} onNavigate={() => setOpen(false)} />
          <NavItem href="/admin/projects" label="Gestion Projets" Icon={FolderOpenIcon} active={pathname?.startsWith("/admin/projects") ?? false} onNavigate={() => setOpen(false)} />
          <NavItem href="/admin/clients" label="Gestion Clients" Icon={FolderOpenIcon} active={pathname?.startsWith("/admin/clients") ?? false} onNavigate={() => setOpen(false)} />
          <NavItem href="/admin/tools" label="Outils Admin" Icon={WrenchScrewdriverIcon} active={pathname?.startsWith("/admin/tools") ?? false} onNavigate={() => setOpen(false)} />

          <div className="my-3 border-t" />
          <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-[#214A33]/80">Référentiels</div>
          <NavItem href="/admin/referentials" label="Agences & Fonctions" Icon={BookOpenIcon} active={pathname?.startsWith("/admin/referentials") && pathname !== "/admin/referentials/default" ? true : false} onNavigate={() => setOpen(false)} />
          <NavItem href="/admin/referentials/default" label="Références par défaut" Icon={BookOpenIcon} active={pathname === "/admin/referentials/default"} onNavigate={() => setOpen(false)} />

          <div className="my-3 border-t" />
          {!loggedIn ? (
            <Link href="/auth/login" onClick={() => setOpen(false)} className="block rounded px-3 py-2 hover:bg-white/60">Se connecter</Link>
          ) : (
            <button onClick={signOut} className="block w-full text-left rounded px-3 py-2 hover:bg-white/60">Se déconnecter</button>
          )}
        </div>
      )}
    </div>
  );
}

type NavItemProps = {
  href: string;
  label: string;
  active?: boolean;
  onNavigate?: () => void;
  Icon?: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function NavItem({ href, label, active, onNavigate, Icon }: NavItemProps) {
  const base = "block rounded-xl px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#214A33]/50";
  const activeCls = "bg-[#F2994A]/40 font-semibold";
  const inactiveCls = "hover:bg-white/60";
  const className = `${base} ${active ? activeCls : inactiveCls}`;
  return (
    <Link href={href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={className}>
      <span className="flex items-center gap-2 text-[#1b2a2a]">
        {Icon ? <Icon className="h-5 w-5 text-[#214A33]" aria-hidden="true" /> : null}
        <span>{label}</span>
      </span>
    </Link>
  );
}
