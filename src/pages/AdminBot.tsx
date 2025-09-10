import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useBotSettings } from "@/context/BotSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { getLlmStatus } from "@/api/adminLlm";
import { kbIndex, kbListDocs, kbActivate } from "@/api/doweeBot";
import { showError, showSuccess } from "@/utils/toast";

const AdminBot: React.FC = () => {
  const { loading: authLoading, employee } = useAuth();
  const isAdmin = employee?.role === "admin";

  // Réglages bot (relance)
  const { settings, setEnabled, setHour, setRepeatMinutes } = useBotSettings();
  const [hour, setHourInput] = React.useState<string>(String(settings.afternoonReminderHour));
  const [repeat, setRepeatInput] = React.useState<string>(String(settings.afternoonReminderRepeatMinutes));

  // LLM
  const [llm, setLlm] = React.useState<{ configured: boolean; provider: string | null } | null>(null);

  // RAG
  const [text, setText] = React.useState("");
  const [name, setName] = React.useState("guide_utilisateur.md");
  const [chunkSize, setChunkSize] = React.useState("1200");
  const [overlap, setOverlap] = React.useState("200");
  const [docs, setDocs] = React.useState<Array<{ id: string; name: string; version: string; active: boolean; chunks_count: number; created_at: string }>>([]);
  const [docsLoading, setDocsLoading] = React.useState(true);
  const [activateAfter, setActivateAfter] = React.useState(true);

  React.useEffect(() => {
    setHourInput(String(settings.afternoonReminderHour));
    setRepeatInput(String(settings.afternoonReminderRepeatMinutes));
  }, [settings.afternoonReminderHour, settings.afternoonReminderRepeatMinutes]);

  React.useEffect(() => {
    const load = async () => {
      try {
        const s = await getLlmStatus();
        setLlm({ configured: s.configured, provider: s.provider });
      } catch {
        // silencieux
      }
    };
    load();
  }, []);

  const refreshDocs = React.useCallback(async () => {
    setDocsLoading(true);
    try {
      const res = await kbListDocs();
      setDocs(res.documents || []);
    } catch (e: any) {
      showError(e?.message || "Impossible de lister les documents.");
    } finally {
      setDocsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (authLoading || !employee) return;
    refreshDocs();
  }, [authLoading, employee, refreshDocs]);

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
      await refreshDocs();
    } catch (e: any) {
      showError(e?.message || "Indexation impossible.");
    }
  };

  const activate = async (id: string) => {
    try {
      await kbActivate(id);
      showSuccess("Version activée.");
      await refreshDocs();
    } catch (e: any) {
      showError(e?.message || "Activation impossible.");
    }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-6 text-[#214A33]/80">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
      {/* Réglages relance */}
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between rounded-md border border-[#BFBFBF] bg-white px-3 py-2">
              <div className="flex flex-col">
                <Label className="text-[#214A33]">Relance l’après‑midi (validation du planning)</Label>
                <span className="text-xs text-[#214A33]/60">Ouvre le chat à l’heure choisie si la journée n’est pas validée.</span>
              </div>
              <Switch checked={settings.afternoonReminderEnabled} onCheckedChange={(v) => setEnabled(!!v)} />
            </div>

            <div className="grid gap-2 rounded-md border border-[#BFBFBF] bg-white p-3 md:grid-cols-2">
              <div className="grid gap-1">
                <Label className="text-[#214A33]">Heure (0–23)</Label>
                <Input
                  inputMode="numeric"
                  value={hour}
                  onChange={(e) => setHourInput(e.target.value)}
                  onBlur={() => {
                    const h = Number(hour);
                    if (!Number.isFinite(h)) return setHourInput(String(settings.afternoonReminderHour));
                    const clamped = Math.max(0, Math.min(23, Math.round(h)));
                    setHour(clamped);
                    setHourInput(String(clamped));
                    showSuccess("Heure enregistrée.");
                  }}
                  placeholder="16"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-[#214A33]">Répétition (minutes)</Label>
                <Input
                  inputMode="numeric"
                  value={repeat}
                  onChange={(e) => setRepeatInput(e.target.value)}
                  onBlur={() => {
                    const m = Number(repeat);
                    if (!Number.isFinite(m)) return setRepeatInput(String(settings.afternoonReminderRepeatMinutes));
                    const clamped = Math.max(5, Math.min(240, Math.round(m)));
                    setRepeatMinutes(clamped);
                    setRepeatInput(String(clamped));
                    showSuccess("Intervalle enregistré.");
                  }}
                  placeholder="30"
                />
              </div>
            </div>

            <div className="rounded-md border border-[#BFBFBF] bg-white p-3">
              <Label className="text-[#214A33]">Tester la relance</Label>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  className="border-[#BFBFBF] text-[#214A33]"
                  onClick={() => {
                    try {
                      window.dispatchEvent(new Event("dowee:bot:triggerAfternoon"));
                      showSuccess("Relance déclenchée.");
                    } catch {
                      showError("Impossible de déclencher la relance.");
                    }
                  }}
                >
                  Déclencher maintenant
                </Button>
              </div>
              <div className="mt-2 text-xs text-[#214A33]/60">
                Le chat s’ouvre si la journée n’est pas validée; sinon, rien ne s’affiche.
              </div>
            </div>

            <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 text-sm text-[#214A33]">
              <div>LLM: {llm?.configured ? (<span className="text-emerald-700">configuré ({llm?.provider})</span>) : (<span className="text-[#214A33]/70">non configuré</span>)} — <a href="/admin/llm" className="underline hover:text-[#214A33]/80">Configurer</a></div>
              <div className="text-xs text-[#214A33]/60">La reformulation/priorisation avancée utilise OpenAI si disponible.</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RAG intégré */}
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Base de connaissance (RAG)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Accès RAG réservé aux administrateurs.
            </div>
          )}

          <div className="rounded-md border border-[#BFBFBF] bg-white p-3">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1">
                <Label className="text-[#214A33]">Nom du document</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
              </div>
              <div className="grid gap-1">
                <Label className="text-[#214A33]">Chunk size (mots)</Label>
                <Input inputMode="numeric" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} disabled={!isAdmin} />
              </div>
              <div className="grid gap-1">
                <Label className="text-[#214A33]">Overlap</Label>
                <Input inputMode="numeric" value={overlap} onChange={(e) => setOverlap(e.target.value)} disabled={!isAdmin} />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <label className="inline-flex items-center gap-2 text-sm text-[#214A33]">
                <input
                  type="checkbox"
                  className="accent-[#214A33]"
                  checked={activateAfter}
                  onChange={(e) => setActivateAfter(e.target.checked)}
                  disabled={!isAdmin}
                />
                Activer après indexation
              </label>
              <label className="ml-auto inline-flex items-center gap-2 text-sm text-[#214A33]">
                <input
                  type="file"
                  accept=".md,.txt"
                  onChange={(e) => e.target.files && e.target.files[0] && fromFile(e.target.files[0])}
                  disabled={!isAdmin}
                />
              </label>
            </div>
            <div className="mt-3">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Collez ici le contenu du guide (Markdown)..." className="min-h-[180px]" disabled={!isAdmin} />
            </div>
            <div className="mt-3">
              <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={indexDoc} disabled={!isAdmin}>
                Indexer
              </Button>
            </div>
          </div>

          <div className="rounded-md border border-[#BFBFBF] bg-white">
            <div className="border-b border-[#BFBFBF] px-3 py-2 text-sm font-medium text-[#214A33]">Versions</div>
            <div className="p-3">
              {docsLoading ? (
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
                              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => activate(d.id)} disabled={!isAdmin}>
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
          <div className="text-[11px] text-[#214A33]/60">Cette version utilise la recherche plein texte (français). Les embeddings pourront être ajoutés ultérieurement sans changer l’UI.</div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBot;