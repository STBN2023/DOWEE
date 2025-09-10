import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { kbIndex, kbListDocs, kbActivate } from "@/api/doweeBot";

const AdminRag: React.FC = () => {
  const { loading: authLoading, employee } = useAuth();
  const [text, setText] = React.useState("");
  const [name, setName] = React.useState("guide_utilisateur.md");
  const [chunkSize, setChunkSize] = React.useState("1200");
  const [overlap, setOverlap] = React.useState("200");
  const [docs, setDocs] = React.useState<Array<{ id: string; name: string; version: string; active: boolean; chunks_count: number; created_at: string }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [activateAfter, setActivateAfter] = React.useState(true);

  const isAdmin = employee?.role === "admin";

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await kbListDocs();
      setDocs(res.documents || []);
    } catch (e: any) {
      showError(e?.message || "Impossible de lister les documents.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (authLoading || !employee) return;
    refresh();
  }, [authLoading, employee]);

  const fromFile = async (file: File) => {
    const txt = await file.text();
    setText(txt);
    setName(file.name);
  };

  const indexDoc = async () => {
    const t = text.trim();
    if (!t) {
      showError("Veuillez coller le contenu du guide (Markdown).");
      return;
    }
    try {
      const res = await kbIndex({
        text: t,
        name,
        version: new Date().toISOString(),
        activate: activateAfter,
        chunkSize: Number(chunkSize),
        overlap: Number(overlap),
      });
      showSuccess(`Indexation OK: ${res.chunks} morceaux.`);
      setText("");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Indexation impossible.");
    }
  };

  const activate = async (id: string) => {
    try {
      await kbActivate(id);
      showSuccess("Version activée.");
      await refresh();
    } catch (e: any) {
      showError(e?.message || "Activation impossible.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Card className="border-[#BFBFBF]">
          <CardHeader><CardTitle className="text-[#214A33]">Base de connaissance (RAG)</CardTitle></CardHeader>
          <CardContent>
            <div className="text-sm text-[#214A33]">Accès réservé aux administrateurs.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Dowee Bot — Base de connaissance (RAG)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1">
                <div className="text-xs text-[#214A33]/70">Nom du document</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-[#214A33]/70">Chunk size (mots)</div>
                <Input inputMode="numeric" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} />
              </div>
              <div className="grid gap-1">
                <div className="text-xs text-[#214A33]/70">Overlap</div>
                <Input inputMode="numeric" value={overlap} onChange={(e) => setOverlap(e.target.value)} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#214A33]">
                <input type="checkbox" className="accent-[#214A33]" checked={activateAfter} onChange={(e) => setActivateAfter(e.target.checked)} />
                Activer après indexation
              </label>
              <label className="ml-auto inline-flex items-center gap-2 text-sm text-[#214A33]">
                <input
                  type="file"
                  accept=".md,.txt"
                  onChange={(e) => e.target.files && e.target.files[0] && fromFile(e.target.files[0])}
                />
              </label>
            </div>
            <div className="mt-3">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Collez ici le contenu du guide (Markdown)..." className="min-h-[180px]" />
            </div>
            <div className="mt-3">
              <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={indexDoc}>Indexer</Button>
            </div>
          </div>

          <div className="rounded-md border border-[#BFBFBF] bg-white">
            <div className="border-b border-[#BFBFBF] px-3 py-2 text-sm font-medium text-[#214A33]">Versions</div>
            <div className="p-3">
              {loading ? (
                <div className="text-sm text-[#214A33]/70">Chargement…</div>
              ) : docs.length === 0 ? (
                <div className="text-sm text-[#214A33]/70">Aucune version indexée.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="bg-[#F7F7F7]">
                        <th className="p-2 text-left text-[#214A33]">Nom</th>
                        <th className="p-2 text-left text-[#214A33]">Version</th>
                        <th className="p-2 text-left text-[#214A33]">Chunks</th>
                        <th className="p-2 text-left text-[#214A33]">Active</th>
                        <th className="p-2 text-left text-[#214A33]">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {docs.map((d) => (
                        <tr key={d.id} className="border-t border-[#BFBFBF]">
                          <td className="p-2">{d.name}</td>
                          <td className="p-2">{d.version}</td>
                          <td className="p-2">{d.chunks_count}</td>
                          <td className="p-2">{d.active ? "Oui" : "Non"}</td>
                          <td className="p-2">
                            {!d.active && (
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => activate(d.id)}>
                                Activer
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <div className="text-[11px] text-[#214A33]/60">Note: cette version utilise la recherche plein texte (français). Les embeddings pourront être ajoutés ultérieurement sans changer l’UI.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRag;