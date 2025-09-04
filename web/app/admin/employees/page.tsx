"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  active: boolean | null;
  contract_start_date: string | null;
  avatar_url?: string | null;
  agency: { name: string | null } | null;
  service: { name: string | null } | null;
  function: { name: string | null } | null;
  role?: string | null;
};

function toCsv(rows: EmployeeRow[]): string {
  const headers = [
    "email",
    "first_name",
    "last_name",
    "agency",
    "service",
    "function",
    "contract_start_date",
    "active",
  ];
  const lines = rows.map((r) => [
    r.email ?? "",
    r.first_name ?? "",
    r.last_name ?? "",
    r.agency?.name ?? "",
    r.service?.name ?? "",
    r.function?.name ?? "",
    r.contract_start_date ?? "",
    r.active ? "Oui" : "Non",
  ].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export default function EmployeesPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<EmployeeRow[]>([]);
  const [q, setQ] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [agencies, setAgencies] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [functions, setFunctions] = useState<string[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    agency: "",
    service: "",
    function: "",
    active: true,
    contract_start_date: "",
    avatar_url: "",
    role: "user",
  });

  // Create form state
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    agency: "",
    service: "",
    function: "",
    active: true,
    contract_start_date: "",
    temp_password: "",
    avatar_url: "",
    role: "user",
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      // Joins auto via FK: agency:agencies, service:services, function:functions
      const { data, error } = await supabaseBrowser
        .from("employees")
        .select("id, first_name, last_name, email, active, contract_start_date, role, avatar_url, agency:agencies(name), service:services(name), function:functions(name)")
        .order("last_name", { ascending: true, nullsFirst: true })
        .order("first_name", { ascending: true, nullsFirst: true });
      if (!mounted) return;
      if (error) {
        setError(error.message);
      } else {
        const normalized: EmployeeRow[] = (data as any[] | null | undefined)?.map((r: any) => ({
          id: r.id,
          first_name: r.first_name ?? null,
          last_name: r.last_name ?? null,
          email: r.email ?? null,
          active: r.active ?? null,
          contract_start_date: r.contract_start_date ? new Date(r.contract_start_date).toISOString().slice(0,10) : null,
          avatar_url: r.avatar_url ?? null,
          agency: Array.isArray(r.agency) ? (r.agency[0] ?? null) : (r.agency ?? null),
          service: Array.isArray(r.service) ? (r.service[0] ?? null) : (r.service ?? null),
          function: Array.isArray(r.function) ? (r.function[0] ?? null) : (r.function ?? null),
          role: r.role ?? null,
        })) ?? [];
        setRows(normalized);
      }
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  // Load référentiels for selects
  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, s, f] = await Promise.all([
        supabaseBrowser.from('agencies').select('name').order('name'),
        supabaseBrowser.from('services').select('name').order('name'),
        supabaseBrowser.from('functions').select('name').order('name'),
      ]);
      if (!mounted) return;
      if (!a.error) setAgencies((a.data?.map((x:any)=>x.name).filter(Boolean)) ?? []);
      if (!s.error) setServices((s.data?.map((x:any)=>x.name).filter(Boolean)) ?? []);
      if (!f.error) setFunctions((f.data?.map((x:any)=>x.name).filter(Boolean)) ?? []);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) =>
      [r.first_name ?? "", r.last_name ?? "", r.email ?? "", r.agency?.name ?? "", r.service?.name ?? "", r.function?.name ?? ""].some(v => v.toLowerCase().includes(term))
    );
  }, [rows, q]);

  function handleExportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `salaries_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(file: File) {
    const text = await file.text();
    const res = await fetch('/api/admin/employees/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: text })
    });
    const json = await res.json();
    if (!res.ok) {
      alert(`Erreur import: ${json.error || res.status}`);
      return;
    }
    alert(`Import terminé: ${json.inserted} insérés, ${json.updated} mis à jour, ${json.errors.length} erreurs`);
    // reload list
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from('employees')
      .select('id, first_name, last_name, email, active, contract_start_date, avatar_url, agency:agencies(name), service:services(name), function:functions(name)')
      .order('last_name', { ascending: true, nullsFirst: true })
      .order('first_name', { ascending: true, nullsFirst: true });
    if (error) setError(error.message); else {
      const normalized: EmployeeRow[] = (data as any[] | null | undefined)?.map((r: any) => ({
        id: r.id,
        first_name: r.first_name ?? null,
        last_name: r.last_name ?? null,
        email: r.email ?? null,
        active: r.active ?? null,
        contract_start_date: r.contract_start_date ? new Date(r.contract_start_date).toISOString().slice(0,10) : null,
        avatar_url: r.avatar_url ?? null,
        agency: Array.isArray(r.agency) ? (r.agency[0] ?? null) : (r.agency ?? null),
        service: Array.isArray(r.service) ? (r.service[0] ?? null) : (r.service ?? null),
        function: Array.isArray(r.function) ? (r.function[0] ?? null) : (r.function ?? null),
      })) ?? [];
      setRows(normalized);
    }
    setLoading(false);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">Salariés ({rows.length})</h1>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[#214A33] hover:bg-white/60 cursor-pointer">
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>Importer CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportCsv(f);
              e.currentTarget.value = ""; // reset
            }} />
          </label>
          <button onClick={handleExportCsv} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[#214A33] hover:bg-white/60">
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Exporter CSV</span>
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-[#214A33] px-3 py-2 text-white hover:brightness-110">
            <PlusCircleIcon className="h-5 w-5" />
            <span>Ajouter Salarié</span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          className="input"
          placeholder="Rechercher (nom, prénom, email, agence, service, fonction)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading && <p>Chargement…</p>}
      {error && <p className="text-red-600">Erreur: {error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Avatar</th>
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Prénom</th>
                <th className="py-2 pr-4">Agence</th>
                <th className="py-2 pr-4">Service</th>
                <th className="py-2 pr-4">Fonction</th>
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Début contrat</th>
                <th className="py-2 pr-4">Actif</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt="avatar" className="h-10 w-10 rounded-full object-cover bg-gray-100" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-600">
                        {(r.first_name?.[0] ?? '').toUpperCase()}{(r.last_name?.[0] ?? '').toUpperCase()}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-4">{r.last_name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.first_name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.agency?.name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.service?.name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.function?.name ?? "—"}</td>
                  <td className="py-2 pr-4">{r.email ?? "—"}</td>
                  <td className="py-2 pr-4">{r.contract_start_date ?? "—"}</td>
                  <td className="py-2 pr-4">{r.active ? "Oui" : "Non"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button title="Exporter ligne" className="rounded border px-2 py-1 hover:bg-white/60" onClick={() => {
                        const csv = toCsv([r]);
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `employe_${r.last_name ?? ''}_${r.first_name ?? ''}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        Exporter
                      </button>
                      <button title="Modifier" className="rounded border px-2 py-1 hover:bg-white/60" onClick={() => {
                        setEditId(r.id);
                        setEditForm({
                          first_name: r.first_name ?? '',
                          last_name: r.last_name ?? '',
                          email: r.email ?? '',
                          agency: r.agency?.name ?? '',
                          service: r.service?.name ?? '',
                          function: r.function?.name ?? '',
                          active: !!r.active,
                          contract_start_date: r.contract_start_date ?? '',
                          avatar_url: r.avatar_url ?? '',
                          role: r.role ?? 'user',
                        });
                        setShowEdit(true);
                      }}>
                        ✏️ Modifier
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-6 text-center text-gray-500">Aucun résultat</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-xl border bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#214A33]">Modifier le salarié</h2>
              <button onClick={() => setShowEdit(false)} className="rounded px-2 py-1 hover:bg-gray-100">✖</button>
            </div>
            <form className="grid grid-cols-2 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!editId) return;
              const res = await fetch('/api/admin/employees', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: editId, ...editForm }),
              });
              const json = await res.json();
              if (!res.ok) { alert(json.error || 'Erreur'); return; }
              setShowEdit(false);
              // reload list
              setLoading(true);
              const { data, error } = await supabaseBrowser
                .from('employees')
                .select('id, first_name, last_name, email, active, contract_start_date, role, avatar_url, agency:agencies(name), service:services(name), function:functions(name)')
                .order('last_name', { ascending: true, nullsFirst: true })
                .order('first_name', { ascending: true, nullsFirst: true });
              if (error) setError(error.message); else {
                const normalized: EmployeeRow[] = (data as any[] | null | undefined)?.map((r: any) => ({
                  id: r.id,
                  first_name: r.first_name ?? null,
                  last_name: r.last_name ?? null,
                  email: r.email ?? null,
                  active: r.active ?? null,
                  contract_start_date: r.contract_start_date ? new Date(r.contract_start_date).toISOString().slice(0,10) : null,
                  avatar_url: r.avatar_url ?? null,
                  agency: Array.isArray(r.agency) ? (r.agency[0] ?? null) : (r.agency ?? null),
                  service: Array.isArray(r.service) ? (r.service[0] ?? null) : (r.service ?? null),
                  function: Array.isArray(r.function) ? (r.function[0] ?? null) : (r.function ?? null),
                  role: r.role ?? null,
                })) ?? [];
                setRows(normalized);
              }
              setLoading(false);
            }}>
              <input className="input col-span-1" placeholder="Prénom" value={editForm.first_name} onChange={(e)=>setEditForm(f=>({...f, first_name: e.target.value}))} required />
              <input className="input col-span-1" placeholder="Nom" value={editForm.last_name} onChange={(e)=>setEditForm(f=>({...f, last_name: e.target.value}))} required />
              <input className="input col-span-2" placeholder="Email" type="email" value={editForm.email} onChange={(e)=>setEditForm(f=>({...f, email: e.target.value}))} disabled />
              <select className="input col-span-2" value={editForm.agency} onChange={(e)=>setEditForm(f=>({...f, agency: e.target.value}))}>
                <option value="">Agence</option>
                {agencies.map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="input col-span-1" value={editForm.service} onChange={(e)=>setEditForm(f=>({...f, service: e.target.value}))}>
                <option value="">Service</option>
                {services.map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="input col-span-1" value={editForm.function} onChange={(e)=>setEditForm(f=>({...f, function: e.target.value}))}>
                <option value="">Fonction</option>
                {functions.map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <input className="input col-span-1" type="date" value={editForm.contract_start_date} onChange={(e)=>setEditForm(f=>({...f, contract_start_date: e.target.value}))} />
              <select className="input col-span-1" value={editForm.role} onChange={(e)=>setEditForm(f=>({...f, role: e.target.value}))}>
                <option value="user">Rôle: Utilisateur</option>
                <option value="manager">Rôle: Manager</option>
                <option value="admin">Rôle: Admin</option>
              </select>
              <label className="col-span-1 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={editForm.active} onChange={(e)=>setEditForm(f=>({...f, active: e.target.checked}))} />
                Actif
              </label>
              <div className="col-span-2 grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-3">
                  {editForm.avatar_url ? (
                    <img src={editForm.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover bg-gray-100" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-700">Photo de profil</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split('.').pop();
                      const path = `emp_${editId}_${Date.now()}.${ext}`;
                      const up = await supabaseBrowser.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
                      if (up.error) { alert(up.error.message); return; }
                      const pub = supabaseBrowser.storage.from('avatars').getPublicUrl(path);
                      const url = pub.data.publicUrl;
                      setEditForm(f => ({ ...f, avatar_url: url }));
                    }}
                  />
                </div>
              </div>
              <div className="col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEdit(false)} className="rounded border px-3 py-2">Annuler</button>
                <button type="submit" className="rounded bg-[#214A33] px-3 py-2 text-white">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-lg rounded-xl border bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#214A33]">Ajouter un salarié</h2>
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 hover:bg-gray-100">✖</button>
            </div>
            <form className="grid grid-cols-2 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              const res = await fetch('/api/admin/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
              });
              const json = await res.json();
              if (!res.ok) { alert(json.error || 'Erreur'); return; }
              // refresh list
              setShowCreate(false);
              setLoading(true);
              const { data, error } = await supabaseBrowser
                .from('employees')
                .select('id, first_name, last_name, email, active, contract_start_date, avatar_url, agency:agencies(name), service:services(name), function:functions(name)')
                .order('last_name', { ascending: true, nullsFirst: true })
                .order('first_name', { ascending: true, nullsFirst: true });
              if (error) setError(error.message); else {
                const normalized: EmployeeRow[] = (data as any[] | null | undefined)?.map((r: any) => ({
                  id: r.id,
                  first_name: r.first_name ?? null,
                  last_name: r.last_name ?? null,
                  email: r.email ?? null,
                  active: r.active ?? null,
                  contract_start_date: r.contract_start_date ? new Date(r.contract_start_date).toISOString().slice(0,10) : null,
                  avatar_url: r.avatar_url ?? null,
                  agency: Array.isArray(r.agency) ? (r.agency[0] ?? null) : (r.agency ?? null),
                  service: Array.isArray(r.service) ? (r.service[0] ?? null) : (r.service ?? null),
                  function: Array.isArray(r.function) ? (r.function[0] ?? null) : (r.function ?? null),
                })) ?? [];
                setRows(normalized);
              }
              setLoading(false);
            }}>
              <input className="input col-span-1" placeholder="Prénom" value={form.first_name} onChange={(e)=>setForm(f=>({...f, first_name: e.target.value}))} required />
              <input className="input col-span-1" placeholder="Nom" value={form.last_name} onChange={(e)=>setForm(f=>({...f, last_name: e.target.value}))} required />
              <input className="input col-span-2" placeholder="Email" type="email" value={form.email} onChange={(e)=>setForm(f=>({...f, email: e.target.value}))} required />
              <select className="input col-span-2" value={form.agency} onChange={(e)=>setForm(f=>({...f, agency: e.target.value}))}>
                <option value="">Agence</option>
                {agencies.map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="input col-span-1" value={form.service} onChange={(e)=>setForm(f=>({...f, service: e.target.value}))}>
                <option value="">Service</option>
                {services.map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <select className="input col-span-1" value={form.function} onChange={(e)=>setForm(f=>({...f, function: e.target.value}))}>
                <option value="">Fonction</option>
                {functions.map((n)=> <option key={n} value={n}>{n}</option>)}
              </select>
              <input className="input col-span-1" type="date" value={form.contract_start_date} onChange={(e)=>setForm(f=>({...f, contract_start_date: e.target.value}))} />
              <select className="input col-span-1" value={form.role} onChange={(e)=>setForm(f=>({...f, role: e.target.value}))}>
                <option value="user">Rôle: Utilisateur</option>
                <option value="manager">Rôle: Manager</option>
                <option value="admin">Rôle: Admin</option>
              </select>
              <label className="col-span-1 inline-flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.active} onChange={(e)=>setForm(f=>({...f, active: e.target.checked}))} />
                Actif
              </label>
              <input className="input col-span-2" type="password" placeholder="Mot de passe temporaire (optionnel)" value={form.temp_password} onChange={(e)=>setForm(f=>({...f, temp_password: e.target.value}))} />
              <div className="col-span-2 grid grid-cols-2 gap-3 items-center">
                <div className="flex items-center gap-3">
                  {form.avatar_url ? (
                    <img src={form.avatar_url} alt="avatar" className="h-16 w-16 rounded-full object-cover bg-gray-100" />
                  ) : (
                    <div className="h-16 w-16 rounded-full bg-gray-200" />
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm text-gray-700">Photo de profil</label>
                  <input
                    className="input"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ext = file.name.split('.').pop();
                      const path = `emp_new_${Date.now()}.${ext}`;
                      const up = await supabaseBrowser.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
                      if (up.error) { alert(up.error.message); return; }
                      const pub = supabaseBrowser.storage.from('avatars').getPublicUrl(path);
                      const url = pub.data.publicUrl;
                      setForm(f => ({ ...f, avatar_url: url }));
                    }}
                  />
                </div>
              </div>
              <div className="col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded border px-3 py-2">Annuler</button>
                <button type="submit" className="rounded bg-[#214A33] px-3 py-2 text-white">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
