import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBotSettings } from "@/context/BotSettingsContext";
import { useAuth } from "@/context/AuthContext";
import { getLlmStatus } from "@/api/adminLlm";
import { showError, showSuccess } from "@/utils/toast";

const AdminBot: React.FC = () => {
  const { loading: authLoading, employee } = useAuth();
  const isAdmin = employee?.role === "admin";

  const { settings, setEnabled, setHour, setRepeatMinutes } = useBotSettings();

  const [hour, setHourInput] = React.useState<string>(String(settings.afternoonReminderHour));
  const [repeat, setRepeatInput] = React.useState<string>(String(settings.afternoonReminderRepeatMinutes));
  const [llm, setLlm] = React.useState<{ configured: boolean; provider: string | null } | null>(null);

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

  if (authLoading) {
    return <div className="mx-auto max-w-3xl px-4 py-6 text-[#214A33]/80">Chargement…</div>;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Bot — Paramètres</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isAdmin && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Astuce: ces préférences sont locales à votre navigateur.
            </div>
          )}

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
                <Label className="text-[#214A33]">Heure de relance (0–23)</Label>
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
              <Label className="text-[#214A33]">Tester maintenant</Label>
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
                  Déclencher la relance
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
    </div>
  );
};

export default AdminBot;