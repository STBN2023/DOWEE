import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { showError, showSuccess } from "@/utils/toast";
import { clearLlmKey, getLlmStatus, setOpenAIKey, type LlmStatus } from "@/api/adminLlm";

const AdminLLM: React.FC = () => {
  const { loading: authLoading, employee } = useAuth();

  const [status, setStatus] = React.useState<LlmStatus | null>(null);
  const [loading, setLoading] = React.useState(true);

  const [key, setKey] = React.useState("");
  const [show, setShow] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [clearing, setClearing] = React.useState(false);

  const isAdmin = employee?.role === "admin";

  const refresh = async () => {
    setLoading(true);
    try {
      const s = await getLlmStatus();
      setStatus(s);
    } catch (e: any) {
      showError(e?.message || "Impossible de récupérer l’état.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (authLoading || !employee) return;
    refresh();
  }, [authLoading, employee]);

  const saveKey = async () => {
    const v = key.trim();
    if (!v) {
      showError("Veuillez saisir une clé API OpenAI.");
      return;
    }
    setSaving(true);
    try {
      await setOpenAIKey(v);
      setKey("");
      await refresh();
      showSuccess("Clé OpenAI enregistrée (côté serveur).");
    } catch (e: any) {
      showError(e?.message || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const clearKey = async () => {
    setClearing(true);
    try {
      await clearLlmKey();
      await refresh();
      showSuccess("Clé supprimée.");
    } catch (e: any) {
      showError(e?.message || "Suppression impossible.");
    } finally {
      setClearing(false);
    }
  };

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-6 text-[#214A33]/80">Chargement…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-6">
        <Card className="border-[#BFBFBF]">
          <CardHeader>
            <CardTitle className="text-[#214A33]">LLM — OpenAI</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-[#214A33]">Vous devez être administrateur pour accéder à cette page.</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const configured = !!status?.configured;
  const updatedStr = status?.updated_at ? new Date(status.updated_at).toLocaleString() : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[#214A33]">
            <KeyRound className="h-5 w-5 text-[#F2994A]" />
            LLM — OpenAI (clé API)
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-[#214A33]/70">
            <ShieldCheck className="h-4 w-4" />
            Stockage sécurisé côté serveur (jamais renvoyé au navigateur)
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 text-sm text-[#214A33]">
            <div>
              État:{" "}
              {loading ? (
                <span className="text-[#214A33]/70">Chargement…</span>
              ) : configured ? (
                <span className="font-medium text-emerald-700">Clé configurée</span>
              ) : (
                <span className="font-medium text-[#214A33]/70">Aucune clé configurée</span>
              )}
            </div>
            <div className="text-xs text-[#214A33]/70">
              {updatedStr ? `Mise à jour: ${updatedStr}` : "—"}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Clé OpenAI</Label>
            <div className="flex gap-2">
              <Input
                type={show ? "text" : "password"}
                placeholder="sk-************************"
                value={key}
                onChange={(e) => setKey(e.target.value)}
              />
              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer" : "Afficher"}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button className="bg-[#F2994A] text-white hover:bg-[#F2994A]/90" onClick={saveKey} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
            <div className="text-xs text-[#214A33]/60">
              La clé est envoyée à une fonction serveur et stockée côté base. Elle n’est jamais renvoyée en clair au navigateur.
            </div>
          </div>

          <div className="pt-2">
            <Button variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" onClick={clearKey} disabled={clearing || !configured}>
              {clearing ? "Suppression…" : "Supprimer la clé"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLLM;