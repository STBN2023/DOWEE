"use client";
import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@/lib/supabaseBrowser";
import { ArrowUpTrayIcon, ArrowDownTrayIcon, PlusCircleIcon } from "@heroicons/react/24/outline";

type ClientRow = {
  id: string;
  name: string;
  contact_email: string | null;
};

function toCsv(rows: ClientRow[]): string {
  const headers = ["name", "contact_email"]; 
  const lines = rows.map((r) => [r.name ?? "", r.contact_email ?? ""].map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","));
  return [headers.join(","), ...lines].join("\n");
}

export default function ClientsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [q, setQ] = useState("");

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", contact_email: "" });

  const [showEdit, setShowEdit] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: "", contact_email: "" });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await supabaseBrowser
        .from("clients")
        .select("id, name, contact_email")
        .order("name", { ascending: true, nullsFirst: true });
      if (!mounted) return;
      if (error) setError(error.message); else setRows((data as any[]) as ClientRow[]);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => [r.name ?? "", r.contact_email ?? ""].some(v => v.toLowerCase().includes(term)));
  }, [rows, q]);

  function handleExportCsv() {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clients_export_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImportCsv(file: File) {
    try {
      const text = await file.text();
      const [header, ...lines] = text.split(/\r?\n/).filter(Boolean);
      const cols = header.split(",").map((s) => s.replace(/^\"|\"$/g, "").trim().toLowerCase());
      const idxName = cols.indexOf("name");
      const idxEmail = cols.indexOf("contact_email");
      if (idxName === -1) { alert('CSV manquant colonne "name"'); return; }
      let inserted = 0, errors = 0;
      for (const line of lines) {
        const values = line.split(/,(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)/).map((s) => s.replace(/^\"|\"$/g, ""));
        const name = values[idxName]?.trim();
        const contact_email = idxEmail >= 0 ? (values[idxEmail]?.trim() || null) : null;
        if (!name) continue;
        const { error } = await supabaseBrowser.from('clients').insert({ name, contact_email });
        if (error) { errors++; } else { inserted++; }
      }
      alert(`Import terminé: ${inserted} insérés, ${errors} erreurs`);
      // reload
      setLoading(true);
      const { data, error } = await supabaseBrowser
        .from("clients")
        .select("id, name, contact_email")
        .order("name", { ascending: true, nullsFirst: true });
      if (error) setError(error.message); else setRows((data as any[]) as ClientRow[]);
      setLoading(false);
    } catch (e: any) {
      alert(e?.message || String(e));
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-3">
        <h1 className="h1">Clients ({rows.length})</h1>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[#214A33] hover:bg-white/60 cursor-pointer">
            <ArrowUpTrayIcon className="h-5 w-5" />
            <span>Importer CSV</span>
            <input type="file" accept=".csv" className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportCsv(f);
              e.currentTarget.value = "";
            }} />
          </label>
          <button onClick={handleExportCsv} className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-[#214A33] hover:bg-white/60">
            <ArrowDownTrayIcon className="h-5 w-5" />
            <span>Exporter CSV</span>
          </button>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-[#214A33] px-3 py-2 text-white hover:brightness-110">
            <PlusCircleIcon className="h-5 w-5" />
            <span>Ajouter Client</span>
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input
          className="input"
          placeholder="Rechercher (nom, email contact)"
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
                <th className="py-2 pr-4">Nom</th>
                <th className="py-2 pr-4">Email de contact</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="py-2 pr-4">{r.name}</td>
                  <td className="py-2 pr-4">{r.contact_email ?? "—"}</td>
                  <td className="py-2 pr-4">
                    <div className="flex items-center gap-2">
                      <button title="Exporter ligne" className="rounded border px-2 py-1 hover:bg-white/60" onClick={() => {
                        const csv = toCsv([r]);
                        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `client_${r.name}.csv`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}>
                        Exporter
                      </button>
                      <button title="Modifier" className="rounded border px-2 py-1 hover:bg-white/60" onClick={() => {
                        setEditId(r.id);
                        setEditForm({ name: r.name ?? "", contact_email: r.contact_email ?? "" });
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
                  <td colSpan={3} className="py-6 text-center text-gray-500">Aucun résultat</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#214A33]">Ajouter un client</h2>
              <button onClick={() => setShowCreate(false)} className="rounded px-2 py-1 hover:bg-gray-100">✖</button>
            </div>
            <form className="grid grid-cols-2 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!form.name.trim()) { alert('Nom requis'); return; }
              const { error } = await supabaseBrowser.from('clients').insert({ name: form.name.trim(), contact_email: form.contact_email.trim() || null });
              if (error) { alert(error.message); return; }
              setShowCreate(false);
              setLoading(true);
              const { data, error: e2 } = await supabaseBrowser.from('clients').select('id, name, contact_email').order('name', { ascending: true, nullsFirst: true });
              if (e2) setError(e2.message); else setRows((data as any[]) as ClientRow[]);
              setLoading(false);
            }}>
              <input className="input col-span-2" placeholder="Nom" value={form.name} onChange={(e)=>setForm(f=>({...f, name: e.target.value}))} required />
              <input className="input col-span-2" placeholder="Email de contact (optionnel)" type="email" value={form.contact_email} onChange={(e)=>setForm(f=>({...f, contact_email: e.target.value}))} />
              <div className="col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded border px-3 py-2">Annuler</button>
                <button type="submit" className="rounded bg-[#214A33] px-3 py-2 text-white">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="w-full max-w-md rounded-xl border bg-white p-4 shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#214A33]">Modifier le client</h2>
              <button onClick={() => setShowEdit(false)} className="rounded px-2 py-1 hover:bg-gray-100">✖</button>
            </div>
            <form className="grid grid-cols-2 gap-3" onSubmit={async (e) => {
              e.preventDefault();
              if (!editId) return;
              if (!editForm.name.trim()) { alert('Nom requis'); return; }
              const { error } = await supabaseBrowser.from('clients').update({ name: editForm.name.trim(), contact_email: editForm.contact_email.trim() || null }).eq('id', editId);
              if (error) { alert(error.message); return; }
              setShowEdit(false);
              setLoading(true);
              const { data, error: e2 } = await supabaseBrowser.from('clients').select('id, name, contact_email').order('name', { ascending: true, nullsFirst: true });
              if (e2) setError(e2.message); else setRows((data as any[]) as ClientRow[]);
              setLoading(false);
            }}>
              <input className="input col-span-2" placeholder="Nom" value={editForm.name} onChange={(e)=>setEditForm(f=>({...f, name: e.target.value}))} required />
              <input className="input col-span-2" placeholder="Email de contact (optionnel)" type="email" value={editForm.contact_email} onChange={(e)=>setEditForm(f=>({...f, contact_email: e.target.value}))} />
              <div className="col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowEdit(false)} className="rounded border px-3 py-2">Annuler</button>
                <button type="submit" className="rounded bg-[#214A33] px-3 py-2 text-white">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
