# Carnet de Développement - DoWee (Mini‑CRM & Gestion de projet)

## Méthodologie
Approche itérative orientée livrables (pas de TDD). Chaque phase produit un incrément testable et mesurable via KPIs du CDC.

## Technologie Choisie
**Stack technique** :
- Frontend: Next.js 14 (TypeScript) + Tailwind CSS + shadcn/ui
- Formulaires/Validation: React Hook Form + Zod
- État et données: TanStack Query + Supabase JS client
- Dates: date-fns
- Data/Backend: Supabase (Postgres + Auth + RLS), vues SQL
- Hébergement: Vercel (front) + Supabase Cloud (DB/API)

**Justification** : Aligné au CDC (§9). Vitesse de POC élevée, Auth + RLS intégrés, UI moderne avec shadcn/ui, déploiement simple sur Vercel/Supabase, écosystème TS productif.

---

## Phases & Étapes (avec critères d’acceptation)

### Phase 0 : Gouvernance & Setup
- [ ] 0.1 Initialisation du dépôt et du projet Next.js (TS), Tailwind, shadcn/ui
  - Critères d’acceptation: app démarre en local; Tailwind actif; composants shadcn compilent.
- [ ] 0.2 Création projet Supabase + variables d’env (.env.local, Vercel)
  - Critères d’acceptation: connexion Supabase côté client OK; clés stockées en env; page test lit `auth.getUser()`.
- [ ] 0.3 Identité visuelle minimale (palette, logo) d’après `Charte graphique/`
  - Critères d’acceptation: couleurs #214A33, #F2994A, #F7F7F7, #BFBFBF disponibles via tokens; favicon/logo présents.

### Phase 1 : Données & Sécurité (Supabase)
- [ ] 1.1 Schéma SQL tables: employees, clients, projects, tasks, plan_items, day_checks, allocations, variance_reasons; vue `vw_time_entries`
  - Critères d’acceptation: migrations appliquées; contraintes: `projects.code` unique + regex `^[A-Z0-9]{2,8}-[0-9]{4}-[0-9]{3}$`; 1 seul `day_check` par `(employee_id,d)`; stockage minutes.
- [ ] 1.2 RLS par utilisateur
  - Critères d’acceptation: lectures/écritures restreintes à `employee_id` courant; accès admin/manager selon rôle.
- [ ] 1.3 Jeu de données seed (clients/projets/tâches; plan du jour de démo)
  - Critères d’acceptation: seed réplicable; un utilisateur démo peut se connecter et voir un plan.

### Phase 2 : Authentification & Profil
- [ ] 2.1 Auth Supabase (magic link ou provider), gestion session, route guards
  - Critères d’acceptation: login/logout fonctionnels; redirection si non authentifié.
- [ ] 2.2 Provisioning profil `employees` (création/maj après login) + rôles (admin|manager|user)
  - Critères d’acceptation: `employees.id = auth.uid`; rôle visible côté UI; RLS vérifiée.

### Phase 3 : CRM Light (CRUD)
- [ ] 3.1 API REST (Next.js route handlers) `/clients`, `/projects`, `/tasks`
  - Critères d’acceptation: endpoints créent/lisent/maj/suppr; validations Zod; erreurs typées.
- [ ] 3.2 UI CRUD (listes + formulaires) avec RHF + Zod
  - Critères d’acceptation: création client→projet→tâche en < 1 min; `projects.code` validé en live; `assignee` géré.

### Phase 4 : Widget AM (Check‑in)
- [ ] 4.1 `GET /plans/daily?date=` (compose plan du jour)
  - Critères d’acceptation: renvoie projets/tâches/estimations du jour; vide géré.
- [ ] 4.2 UI AM: afficher plan, actions **Suivre** ou **Réorganiser**
  - Critères d’acceptation: check‑in en < 3 clics; UX claire.
- [ ] 4.3 `POST /plans/daily/replan` + `POST /day-checks`
  - Critères d’acceptation: `day_checks.am_status = planned|replanned` persiste.

### Phase 5 : Check‑out PM (Allocations & Écarts)
- [ ] 5.1 `PATCH /day-checks/{id}` (pm_status, comment)
  - Critères d’acceptation: statut `followed|deviated` sauvegardé.
- [ ] 5.2 `POST /day-checks/{id}/allocations` (heures décimales → minutes)
  - Critères d’acceptation: conversion décimale fiable (ex. 1:30 → 1.5 → 90 min); somme jour = 7.0 h (configurable).
- [ ] 5.3 `POST /day-checks/{id}/variance` (raison d’écart)
  - Critères d’acceptation: raison obligatoire si écart; options: Urgence client, Dépendance bloquée, Réunion imprévue, Changement de priorité, Autre.

### Phase 6 : Validations & Règles UX
- [ ] 6.1 Règles de saisie: conversion décimales, contrôle de somme, aide contextuelle
  - Critères d’acceptation: messages clairs; toolbox conversions visible (0,25=15 min, etc.).
- [ ] 6.2 Contraintes métier: `projects.code` regex/unique; `assignee_id` requis quand doing/done
  - Critères d’acceptation: erreurs côté UI et blocage côté DB.

### Phase 7 : Dashboard (POC)
- [ ] 7.1 Vue `vw_time_entries` pour agrégation planifié vs réalisé
  - Critères d’acceptation: calculs vérifiés sur échantillon seed.
- [ ] 7.2 Écran dashboard: taux d’adhérence (hebdo), top raisons, derniers écarts
  - Critères d’acceptation: chargement < 2 s; cartes lisibles; filtres semaine.

### Phase 8 : Polish UX
- [ ] 8.1 Toolbox « Règles de saisie » (popover/sheet) + raccourcis
  - Critères d’acceptation: aide accessible au clavier; contraste AA.
- [ ] 8.2 « Copier la veille » sur AM/PM
  - Critères d’acceptation: recopie cohérente, éditable avant envoi.

### Phase 9 : QA & Corrections
- [ ] 9.1 Tests manuels de parcours clés (CRM, AM, PM, Dashboard)
  - Critères d’acceptation: parcours passants; bugs critiques corrigés.

### Phase 10 : Déploiement
- [ ] 10.1 Vercel (front) + Supabase (DB), variables d’env, protection routes
  - Critères d’acceptation: démo publique accessible; rôles respectés.
- [ ] 10.2 Seed dataset prod de démo + comptes démo
  - Critères d’acceptation: utilisateur démo prêt pour présentation.

### Phase 11 : Script de Démo
- [ ] 11.1 Scénario guidé (création client→projet→tâche, AM, PM, Dashboard)
  - Critères d’acceptation: déroulé < 5 min; met en évidence KPIs du CDC.

---

## API (contrat MVP aligné CDC §6)
- Auth: login/profil
- CRUD: `/clients`, `/projects`, `/tasks`
- Planning: `GET /plans/daily?date=`, `POST /plans/daily/replan`
- Check‑ins: `POST /day-checks` (AM), `PATCH /day-checks/{id}` (PM), `POST /day-checks/{id}/allocations`, `POST /day-checks/{id}/variance`
- Reports: `/reports/adherence`, `/reports/reasons`

## KPIs & Critères globaux (CDC §11)
- Check‑in + Check‑out en < 3 clics chacun
- Adhérence et Raisons visibles en < 2 s
- Création client→projet→tâche en < 1 min

## Notes & Risques
- RLS stricte indispensable; vérifier politiques avant mise en prod.
- Performances dashboard: index SQL sur clés de jointure et dates.
- Conversion heures décimales: cohérence UI/DB (source de vérité en minutes).

## Bootstrap Admin (Front + API)
Objectif: créer le tout premier compte admin + entrée `public.employees` via un flux sécurisé front/back.

1) Environnement (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-only
SETUP_TOKEN=...                 # secret, server-only
```

2) Client Supabase admin (server-only)
Chemin: `lib/supabaseAdmin.ts`
```ts
import { createClient } from '@supabase/supabase-js';

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
```

3) Endpoint API bootstrap
Chemin (App Router): `app/api/admin/bootstrap/route.ts`
```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(req: Request) {
  // 1) Auth du setup
  const token = req.headers.get('x-setup-token');
  if (!token || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  // 2) Vérifier s'il existe déjà un admin
  const { count, error: adminErr } = await supabaseAdmin
    .from('employees')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'admin');
  if (adminErr) {
    return NextResponse.json({ error: adminErr.message }, { status: 500 });
  }
  if ((count ?? 0) > 0) {
    return NextResponse.json({ error: 'admin_exists' }, { status: 409 });
  }

  const { email, password, displayName } = await req.json();

  // 3) Créer (ou récupérer) l’utilisateur Auth
  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr && !/already exists/i.test(createErr.message)) {
    return NextResponse.json({ error: createErr.message }, { status: 400 });
  }

  const userId = created?.user?.id ?? (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === email)?.id;
  if (!userId) return NextResponse.json({ error: 'user_not_found' }, { status: 400 });

  // 4) Insérer employees (idempotent)
  const { error: upsertErr } = await supabaseAdmin
    .from('employees')
    .upsert({ id: userId, email, display_name: displayName ?? 'Admin', role: 'admin', active: true }, { onConflict: 'id' });
  if (upsertErr) return NextResponse.json({ error: upsertErr.message }, { status: 400 });

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

4) Page de setup
Chemin: `app/admin/setup/page.tsx`
```tsx
'use client';
import { useState } from 'react';

export default function SetupPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('Admin');
  const [setupToken, setSetupToken] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await fetch('/api/admin/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Setup-Token': setupToken, // saisi manuellement pour ne pas exposer de secret dans le bundle
      },
      body: JSON.stringify({ email, password, displayName }),
    });
    const j = await res.json();
    setMsg(res.ok ? 'Créé' : `Erreur: ${j.error}`);
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" className="input" />
      <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="mot de passe" className="input" />
      <input value={displayName} onChange={e=>setDisplayName(e.target.value)} placeholder="nom" className="input" />
      <input type="password" value={setupToken} onChange={e=>setSetupToken(e.target.value)} placeholder="SETUP TOKEN" className="input" />
      <button type="submit" className="btn">Créer admin</button>
      {msg && <p>{msg}</p>}
    </form>
  );
}
```

5) Sécurité & exploitation
- Endpoint refusé si un admin existe déjà.
- `SUPABASE_SERVICE_ROLE_KEY` jamais exposée au client (server-only).
- `SETUP_TOKEN` requis. Saisi manuellement côté setup page (évite d'exposer une var publique). Après succès, supprimer/désactiver la route.

6) Test rapide
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "X-Setup-Token: $SETUP_TOKEN" \
  -d '{"email":"admin@exemple.test","password":"ChangeMe!","displayName":"Admin"}' \
  http://localhost:3000/api/admin/bootstrap
```
Vérifier: `select * from public.employees where role='admin';`
