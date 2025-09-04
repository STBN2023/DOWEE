"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabaseBrowser";

export default function ProjectsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  type ProjectRow = {
    id: string;
    code: string;
    name: string;
    client_id: string;
    owner_id: string | null;
    status: "active" | "onhold" | "archived";
  };
  type Option = { id: string; label: string };

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [clients, setClients] = useState<Option[]>([]);
  const [employees, setEmployees] = useState<Option[]>([]);
  const [q, setQ] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    code: "",
    name: "",
    client_id: "",
    owner_id: "",
    status: "active" as "active" | "onhold" | "archived",
  });

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    code: "",
    name: "",
    client_id: "",
    owner_id: "",
    status: "active" as "active" | "onhold" | "archived",
  });

  // Affectations (création)
  const [createAssignedEmployeeIds, setCreateAssignedEmployeeIds] = useState<string[]>([]);
  const [createAssignedRoles, setCreateAssignedRoles] = useState<Record<string, string>>({});
  const createAssignedEmployees = useMemo(() => employees.filter(e => createAssignedEmployeeIds.includes(e.id)), [employees, createAssignedEmployeeIds]);
  const createAvailableEmployees = useMemo(() => employees.filter(e => !createAssignedEmployeeIds.includes(e.id)), [employees, createAssignedEmployeeIds]);
  const createAvailableEmployeeIds = useMemo(() => createAvailableEmployees.map(e => e.id), [createAvailableEmployees]);

  function createAssignEmployee(employeeId: string) {
    setCreateAssignedEmployeeIds(ids => ids.includes(employeeId) ? ids : [...ids, employeeId]);
    setCreateAssignedRoles(m => ({ ...m, [employeeId]: m[employeeId] ?? "" }));
  }
  function createUnassignEmployee(employeeId: string) {
    setCreateAssignedEmployeeIds(ids => ids.filter(id => id !== employeeId));
    setCreateAssignedRoles(m => { const n = { ...m }; delete n[employeeId]; return n; });
  }

  // Affectations (édition)
  const [editAssignedEmployeeIds, setEditAssignedEmployeeIds] = useState<string[]>([]);
  const [editAssignedRoles, setEditAssignedRoles] = useState<Record<string, string>>({});
  const editAssignedEmployees = useMemo(() => employees.filter(e => editAssignedEmployeeIds.includes(e.id)), [employees, editAssignedEmployeeIds]);
  const editAvailableEmployees = useMemo(() => employees.filter(e => !editAssignedEmployeeIds.includes(e.id)), [employees, editAssignedEmployeeIds]);
  const editAvailableEmployeeIds = useMemo(() => editAvailableEmployees.map(e => e.id), [editAvailableEmployees]);

  // Helpers pour DnD (édition)
  async function editAssignEmployee(employeeId: string) {
    if (!editId) return;
    const { error } = await supabaseBrowser.from('project_employees').insert({ project_id: editId, employee_id: employeeId } as any);
    if (error) { alert(error.message); return; }
    setEditAssignedEmployeeIds((ids) => ids.includes(employeeId) ? ids : [...ids, employeeId]);
    setEditAssignedRoles((m) => ({ ...m, [employeeId]: m[employeeId] ?? "" }));
  }
  async function editUnassignEmployee(employeeId: string) {
    if (!editId) return;
    const { error } = await supabaseBrowser.from('project_employees').delete().match({ project_id: editId, employee_id: employeeId });
    if (error) { alert(error.message); return; }
    setEditAssignedEmployeeIds((ids) => ids.filter(id => id !== employeeId));
    setEditAssignedRoles((m) => { const n = { ...m }; delete n[employeeId]; return n; });
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      console.log('[projects] init start');
      try {
        const { data } = await supabaseBrowser.auth.getSession();
        if (!mounted) return;
        if (!data.session) {
          console.warn('[projects] no session, redirecting to /auth/login');
          router.replace("/auth/login");
          return;
        }
        // Load clients, employees (via admin API), then projects
        setLoading(true);
        setError(null);
        console.log('[projects] loading clients, employees, projects');
        const [clientsRes, employeesResp, projectsRes] = await Promise.all([
          supabaseBrowser.from("clients").select("id, name").order("name", { ascending: true, nullsFirst: true }),
          fetch('/api/admin/employees', { method: 'GET', cache: 'no-store' }),
          supabaseBrowser.from("projects").select("id, code, name, client_id, owner_id, status").order("code", { ascending: true, nullsFirst: true }),
        ]);
        if (!mounted) return;
        const errors: string[] = [];
        if (clientsRes.error) {
          console.error('[projects] clients error:', clientsRes.error.message);
          errors.push(`Clients: ${clientsRes.error.message}`);
        }
        if (!(employeesResp as Response).ok) {
          let detail = '';
          try {
            const txt = await (employeesResp as Response).text();
            detail = txt;
          } catch {}
          console.error('[projects] employees API error:', (employeesResp as Response).status, detail);
          errors.push('Salariés: accès refusé ou erreur (vérifiez rôle admin/manager)');
        }
        if (projectsRes.error) {
          console.error('[projects] projects error:', projectsRes.error.message);
          errors.push(`Projets: ${projectsRes.error.message}`);
        }
        if (clientsRes.data) {
          setClients((clientsRes.data as any[]).map((c) => ({ id: c.id, label: c.name })));
        }
        try {
          const ct = (employeesResp as Response).headers.get('content-type') || '';
          if (ct.includes('application/json')) {
            const empJson = await (employeesResp as Response).json();
            const rows = (empJson?.rows ?? []) as Array<{ id: string; display_name?: string; first_name?: string; last_name?: string; email?: string }>;
            setEmployees(rows.map((e) => ({
              id: e.id,
              label: e.display_name && e.display_name.trim().length > 0
                ? e.display_name
                : ((`${e.last_name ?? ''} ${e.first_name ?? ''}`.trim()) || (e.email ?? '')),
            })));
          }
        } catch (e) {
          console.warn('[projects] employees parse error', e);
        }
        if (projectsRes.data) setProjects(projectsRes.data as any as ProjectRow[]);
        if (errors.length > 0) setError(errors.join(' | '));
      } catch (e) {
        console.error('[projects] unexpected error', e);
        setError('Erreur inattendue lors du chargement');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [router]);

  const clientsMap = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c.label])), [clients]);
  const employeesMap = useMemo(() => Object.fromEntries(employees.map(e => [e.id, e.label])), [employees]);
  const clientById = useMemo(() => Object.fromEntries(clients.map(c => [c.id, c])), [clients]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return projects;
    return projects.filter((p) => [
      p.code ?? "",
      p.name ?? "",
      clientsMap[p.client_id] ?? "",
      p.status ?? "",
    ].some(v => v.toLowerCase().includes(term)));
  }, [projects, q, clientsMap]);

  function isValidCode(code: string) {
    return /^[A-Z0-9]{2,8}-[0-9]{4}-[0-9]{3}$/.test(code);
  }

  function makePrefixFromClientName(name: string) {
    const cleaned = (name || "").toUpperCase().replace(/[^A-Z0-9 ]+/g, " ").trim();
    const words = cleaned.split(/\s+/).filter(Boolean);
    let acronym = words.slice(0, 3).map(w => w[0]).join("");
    if (acronym.length < 2) {
      acronym = cleaned.replace(/\s+/g, "").slice(0, 4);
    }
    acronym = acronym.replace(/[^A-Z0-9]/g, "");
    if (acronym.length < 2) acronym = (acronym + "XXXX").slice(0, 2);
    if (acronym.length > 8) acronym = acronym.slice(0, 8);
    return acronym;
  }

  async function suggestNextCodeFor(prefix: string) {
    const year = new Date().getFullYear();
    const like = `${prefix}-${year}-%`;
    const { data, error } = await supabaseBrowser
      .from('projects')
      .select('code')
      .like('code', like)
      .order('code', { ascending: false })
      .limit(1);
    if (error) return `${prefix}-${year}-001`;
    let next = 1;
    if (data && data.length > 0) {
      const last = data[0].code as string;
      const m = last.match(/-(\d{3})$/);
      if (m) next = parseInt(m[1], 10) + 1;
    }
    const seq = String(Math.min(next, 999)).padStart(3, '0');
    return `${prefix}-${year}-${seq}`;
  }

  if (loading) return <p style={{ textAlign: 'center' }}>Chargement…</p>;

  return (
    <>
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">Projets ({projects.length})</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => {
            // Reset form + affectations
            setCreateForm({ code: "", name: "", client_id: "", owner_id: "", status: "active" });
            setCreateAssignedEmployeeIds([]);
            setCreateAssignedRoles({});
            setShowCreate(true);
          }} className="inline-flex items-center gap-2 rounded-md bg-[#214A33] px-3 py-2 text-white hover:brightness-110">
            <span>Ajouter Projet</span>
          </button>
        </div>

      {/* ex-modale ressources supprimée: l'affectation est intégrée aux formulaires Créer/Modifier */}
      </div>

      <div className="mb-4">
        <input
          className="input"
          placeholder="Rechercher (code, nom, client, statut)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {error && <p className="text-red-600">Erreur: {error}</p>}

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-left border-b">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Nom</th>
              <th className="py-2 pr-4">Client</th>
              <th className="py-2 pr-4">Chef de projet</th>
              <th className="py-2 pr-4">Statut</th>
              <th className="py-2 pr-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-mono">{p.code}</td>
                <td className="py-2 pr-4">{p.name}</td>
                <td className="py-2 pr-4">{clientsMap[p.client_id] ?? "—"}</td>
                <td className="py-2 pr-4">{p.owner_id ? (employeesMap[p.owner_id] ?? "—") : "—"}</td>
                <td className="py-2 pr-4">{p.status}</td>
                <td className="py-2 pr-4">
                  <div className="flex items-center gap-2">
                    <button className="rounded border px-2 py-1 hover:bg-white/60" onClick={async () => {
                      setEditId(p.id);
                      setEditForm({ code: p.code ?? "", name: p.name ?? "", client_id: p.client_id, owner_id: p.owner_id ?? "", status: p.status });
                      // Charger les affectations existantes
                      const { data, error } = await supabaseBrowser
                        .from('project_employees')
                        .select('employee_id, role')
                        .eq('project_id', p.id);
                      if (error) {
                        alert(error.message);
                        setEditAssignedEmployeeIds([]);
                        setEditAssignedRoles({});
                      } else {
                        const rows = (data as any[]) as { employee_id: string; role: string | null }[];
                        setEditAssignedEmployeeIds(rows.map(r => r.employee_id));
                        const rm: Record<string, string> = {};
                        rows.forEach(r => { rm[r.employee_id] = r.role ?? ""; });
                        setEditAssignedRoles(rm);
                      }
                      setShowEdit(true);
                    }}>✏️ Modifier</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-gray-500">Aucun résultat</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Équipes modal retiré: gestion simplifiée par affectation directe des salariés */}
    </div>
    
    {/* Création */}
    {showCreate && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-3xl rounded bg-white p-4 shadow">
          <h2 className="h2 mb-4">Nouveau projet</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Code</label>
              <input className="input" value={createForm.code} onChange={e=>setCreateForm(f=>({ ...f, code: e.target.value }))} placeholder="ACME-2025-001" />
              <button className="mt-2 text-xs underline" onClick={async ()=>{
                const clientName = clientById[createForm.client_id]?.label ?? '';
                const prefix = makePrefixFromClientName(clientName);
                const next = await suggestNextCodeFor(prefix);
                setCreateForm(f=>({ ...f, code: next }));
              }}>Suggérer un code</button>
            </div>
            <div>
              <label className="mb-1 block text-sm">Nom</label>
              <input className="input" value={createForm.name} onChange={e=>setCreateForm(f=>({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Client</label>
              <select className="input" value={createForm.client_id} onChange={e=>setCreateForm(f=>({ ...f, client_id: e.target.value }))}>
                <option value="">—</option>
                {clients.map(c=> <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Chef de projet</label>
              <select className="input" value={createForm.owner_id} onChange={e=>setCreateForm(f=>({ ...f, owner_id: e.target.value }))}>
                <option value="">—</option>
                {employees.map(e=> <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Statut</label>
              <select className="input" value={createForm.status} onChange={e=>setCreateForm(f=>({ ...f, status: e.target.value as any }))}>
                <option value="active">Actif</option>
                <option value="onhold">En pause</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 font-semibold text-[#214A33]">Salariés disponibles</div>
              <div className="max-h-64 overflow-auto rounded border p-2">
                {createAvailableEmployees.map(e=> (
                  <div key={e.id} className="mb-2 flex items-center justify-between last:mb-0">
                    <span>{e.label}</span>
                    <button className="text-xs underline" onClick={()=>createAssignEmployee(e.id)}>Ajouter</button>
                  </div>
                ))}
                {createAvailableEmployees.length === 0 && <div className="text-sm text-gray-500">Aucun</div>}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold text-[#214A33]">Affectés ({createAssignedEmployees.length})</div>
              <div className="max-h-64 overflow-auto rounded border p-2">
                {createAssignedEmployees.map(e=> (
                  <div key={e.id} className="mb-2 flex items-center gap-2 last:mb-0">
                    <span className="min-w-0 flex-1 truncate">{e.label}</span>
                    <input className="input w-32" placeholder="Rôle" value={createAssignedRoles[e.id] ?? ''} onChange={ev=>setCreateAssignedRoles(m=>({ ...m, [e.id]: ev.target.value }))} />
                    <button className="text-xs underline" onClick={()=>createUnassignEmployee(e.id)}>Retirer</button>
                  </div>
                ))}
                {createAssignedEmployees.length === 0 && <div className="text-sm text-gray-500">Aucun</div>}
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button className="rounded border px-3 py-1" onClick={()=> setShowCreate(false)}>Annuler</button>
            <button className="rounded bg-[#214A33] px-3 py-1 text-white" onClick={async ()=>{
              // validations minimales
              if (!createForm.code || !createForm.name || !createForm.client_id) { alert('Code, Nom, Client requis'); return; }
              const { data, error } = await supabaseBrowser
                .from('projects')
                .insert({ code: createForm.code, name: createForm.name, client_id: createForm.client_id, owner_id: createForm.owner_id || null, status: createForm.status })
                .select('id')
                .single();
              if (error) { alert(error.message); return; }
              const newId = (data as any)?.id as string;
              if (newId && createAssignedEmployeeIds.length > 0) {
                const rows = createAssignedEmployeeIds.map(empId => ({ project_id: newId, employee_id: empId, role: createAssignedRoles[empId] || null }));
                const { error: assignErr } = await supabaseBrowser.from('project_employees').insert(rows as any);
                if (assignErr) { alert(assignErr.message); /* continue */ }
              }
              // refresh list
              const pr = await supabaseBrowser.from('projects').select('id, code, name, client_id, owner_id, status').order('code', { ascending: true, nullsFirst: true });
              if (!pr.error && pr.data) setProjects(pr.data as any as ProjectRow[]);
              setShowCreate(false);
            }}>Créer</button>
          </div>
        </div>
      </div>
    )}

    {/* Édition */}
    {showEdit && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
        <div className="w-full max-w-3xl rounded bg-white p-4 shadow">
          <h2 className="h2 mb-4">Modifier le projet</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm">Code</label>
              <input className="input" value={editForm.code} onChange={e=>setEditForm(f=>({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Nom</label>
              <input className="input" value={editForm.name} onChange={e=>setEditForm(f=>({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="mb-1 block text-sm">Client</label>
              <select className="input" value={editForm.client_id} onChange={e=>setEditForm(f=>({ ...f, client_id: e.target.value }))}>
                <option value="">—</option>
                {clients.map(c=> <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Chef de projet</label>
              <select className="input" value={editForm.owner_id} onChange={e=>setEditForm(f=>({ ...f, owner_id: e.target.value }))}>
                <option value="">—</option>
                {employees.map(e=> <option key={e.id} value={e.id}>{e.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm">Statut</label>
              <select className="input" value={editForm.status} onChange={e=>setEditForm(f=>({ ...f, status: e.target.value as any }))}>
                <option value="active">Actif</option>
                <option value="onhold">En pause</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <div className="mb-2 font-semibold text-[#214A33]">Salariés disponibles</div>
              <div className="max-h-64 overflow-auto rounded border p-2">
                {employees.filter(e=> !editAssignedEmployeeIds.includes(e.id)).map(e=> (
                  <div key={e.id} className="mb-2 flex items-center justify-between last:mb-0">
                    <span>{e.label}</span>
                    <button className="text-xs underline" onClick={()=>editAssignEmployee(e.id)}>Ajouter</button>
                  </div>
                ))}
                {employees.filter(e=> !editAssignedEmployeeIds.includes(e.id)).length === 0 && <div className="text-sm text-gray-500">Aucun</div>}
              </div>
            </div>
            <div>
              <div className="mb-2 font-semibold text-[#214A33]">Affectés ({editAssignedEmployeeIds.length})</div>
              <div className="max-h-64 overflow-auto rounded border p-2">
                {editAssignedEmployeeIds.map(id=> (
                  <div key={id} className="mb-2 flex items-center gap-2 last:mb-0">
                    <span className="min-w-0 flex-1 truncate">{employeesMap[id] ?? id}</span>
                    <input className="input w-32" placeholder="Rôle" value={editAssignedRoles[id] ?? ''} onChange={ev=> setEditAssignedRoles(m=>({ ...m, [id]: ev.target.value }))} />
                    <button className="text-xs underline" onClick={()=>editUnassignEmployee(id)}>Retirer</button>
                  </div>
                ))}
                {editAssignedEmployeeIds.length === 0 && <div className="text-sm text-gray-500">Aucun</div>}
              </div>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button className="rounded border px-3 py-1" onClick={()=> setShowEdit(false)}>Annuler</button>
            <button className="rounded bg-[#214A33] px-3 py-1 text-white" onClick={async ()=>{
              if (!editId) return;
              if (!editForm.code || !editForm.name || !editForm.client_id) { alert('Code, Nom, Client requis'); return; }
              const { error: upErr } = await supabaseBrowser
                .from('projects')
                .update({ code: editForm.code, name: editForm.name, client_id: editForm.client_id, owner_id: editForm.owner_id || null, status: editForm.status })
                .eq('id', editId);
              if (upErr) { alert(upErr.message); return; }
              // Upsert des rôles actuels
              if (editAssignedEmployeeIds.length > 0) {
                const rows = editAssignedEmployeeIds.map(empId => ({ project_id: editId, employee_id: empId, role: editAssignedRoles[empId] || null }));
                const { error: roleErr } = await supabaseBrowser.from('project_employees').upsert(rows as any, { onConflict: 'project_id,employee_id' } as any);
                if (roleErr) { alert(roleErr.message); /* continue */ }
              }
              // refresh list
              const pr = await supabaseBrowser.from('projects').select('id, code, name, client_id, owner_id, status').order('code', { ascending: true, nullsFirst: true });
              if (!pr.error && pr.data) setProjects(pr.data as any as ProjectRow[]);
              setShowEdit(false);
            }}>Enregistrer</button>
          </div>
        </div>
      </div>
    )}
    
    </>
  );
}

