import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTickerSettings } from "@/context/TickerSettingsContext";
import { useTicker } from "@/components/ticker/TickerProvider";
import { Info } from "lucide-react";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-md border border-[#BFBFBF] bg-white px-3 py-2">
    {children}
  </div>
);

const TickerSettingsPage: React.FC = () => {
  const { settings, setModules, setWeatherCity } = useTickerSettings();
  const { refresh } = useTicker();

  const [city, setCity] = React.useState(settings.weatherCity);

  const saveCity = () => {
    const v = city.trim();
    setWeatherCity(v || "Paris");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Card className="border-[#BFBFBF]">
        <CardHeader>
          <CardTitle className="text-[#214A33]">Paramètres du bandeau</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border border-[#BFBFBF] bg-[#F7F7F7] p-3 text-sm text-[#214A33]">
            <div className="flex items-start gap-2">
              <Info className="mt-0.5 h-4 w-4 text-[#F2994A]" />
              <div>
                Activez des modules pour enrichir le bandeau. Vous pouvez combiner Alertes internes, Météo et Astuces.
                Les choix sont enregistrés localement pour votre navigateur.
              </div>
            </div>
          </div>

          <Row>
            <div className="flex items-center gap-3">
              <Label className="text-[#214A33]">Alertes internes</Label>
              <span className="text-xs text-[#214A33]/60">projets (échéances, budgets, marges)</span>
            </div>
            <Switch checked={settings.modules.alerts} onCheckedChange={(v) => setModules({ alerts: !!v })} />
          </Row>

          <Row>
            <div className="flex items-center gap-3">
              <Label className="text-[#214A33]">Météo</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#214A33]/60">Ville</span>
                <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 w-[180px]" placeholder="Paris" />
                <Button variant="outline" className="h-8 border-[#BFBFBF] text-[#214A33]" onClick={saveCity}>Enregistrer</Button>
              </div>
            </div>
            <Switch checked={settings.modules.weather} onCheckedChange={(v) => setModules({ weather: !!v })} />
          </Row>

          <Row>
            <div className="flex items-center gap-3">
              <Label className="text-[#214A33]">Astuces</Label>
              <span className="text-xs text-[#214A33]/60">petits conseils d’utilisation</span>
            </div>
            <Switch checked={settings.modules.tips} onCheckedChange={(v) => setModules({ tips: !!v })} />
          </Row>

          <div className="pt-2">
            <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90" onClick={refresh}>
              Rafraîchir le bandeau
            </Button>
          </div>

          <div className="text-xs text-[#214A33]/60">
            Autres idées possibles: annonces internes, rappel événements (Google Agenda), KPI hebdo, statut services (uptime), citation du jour.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TickerSettingsPage;