import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTickerSettings } from "@/context/TickerSettingsContext";
import { useTicker } from "@/components/ticker/TickerProvider";
import { Info, Navigation } from "lucide-react";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-md border border-[#BFBFBF] bg-white px-3 py-2">
    {children}
  </div>
);

const TickerSettingsPage: React.FC = () => {
  const { settings, setModules, setWeatherCity, setGeo } = useTickerSettings();
  const { refresh } = useTicker();

  const [city, setCity] = React.useState(settings.weatherCity);
  const [detecting, setDetecting] = React.useState(false);
  const [geoInfo, setGeoInfo] = React.useState<string | null>(null);

  const saveCity = () => {
    const v = city.trim();
    setWeatherCity(v || "Paris");
  };

  const detectPosition = async () => {
    setDetecting(true);
    setGeoInfo(null);
    try {
      if (!("geolocation" in navigator)) {
        setGeoInfo("Géolocalisation non disponible sur ce navigateur.");
        return;
      }
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Timeout")), 8000);
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timer);
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            // Active automatiquement l’usage de la position + enregistre lat/lon
            setGeo({ useGeo: true, lat, lon });
            setGeoInfo(`Position enregistrée: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            resolve();
          },
          (err) => {
            clearTimeout(timer);
            setGeoInfo(err?.message || "Impossible d’obtenir la position.");
            reject(err);
          },
          { enableHighAccuracy: false, timeout: 7000, maximumAge: 5 * 60 * 1000 }
        );
      });
    } catch {
      // déjà géré
    } finally {
      setDetecting(false);
    }
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
                Activez des modules pour enrichir le bandeau. Vous pouvez combiner Alertes internes, Météo (ville ou géolocalisation) et Astuces.
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
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Label className="text-[#214A33]">Météo</Label>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#214A33]/60">Ville</span>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 w-[180px]" placeholder="Paris" />
                  <Button variant="outline" className="h-8 border-[#BFBFBF] text-[#214A33]" onClick={saveCity}>Enregistrer</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.useGeo}
                    onCheckedChange={(v) => setGeo({ useGeo: !!v })}
                  />
                  <span className="text-xs text-[#214A33]">Utiliser ma position</span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 border-[#BFBFBF] text-[#214A33]"
                    onClick={detectPosition}
                    disabled={detecting}
                  >
                    <Navigation className="mr-2 h-4 w-4" />
                    {detecting ? "Détection…" : "Détecter ma position"}
                  </Button>
                </div>
                {settings.lat != null && settings.lon != null && (
                  <div className="text-xs text-[#214A33]/70">
                    Position actuelle: {settings.lat.toFixed(4)}, {settings.lon.toFixed(4)}
                  </div>
                )}
                {geoInfo && <div className="text-xs text-[#214A33]/70">{geoInfo}</div>}
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
            Note: la géolocalisation nécessite votre accord. En cas de refus, la météo utilise la ville configurée.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TickerSettingsPage;