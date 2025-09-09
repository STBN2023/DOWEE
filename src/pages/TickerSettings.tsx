import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTickerSettings } from "@/context/TickerSettingsContext";
import { useTicker } from "@/components/ticker/TickerProvider";
import { Info, Navigation } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const Row = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-center justify-between rounded-md border border-[#BFBFBF] bg-white px-3 py-2">
    {children}
  </div>
);

const TickerSettingsPage: React.FC = () => {
  const { settings, setModules, setWeatherCity, setGeo, setCustomMessage } = useTickerSettings();
  const { refresh } = useTicker();

  const [city, setCity] = React.useState(settings.weatherCity);
  const [detecting, setDetecting] = React.useState(false);
  const [geoInfo, setGeoInfo] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState(settings.customMessage);

  const saveCity = () => {
    const v = city.trim();
    setWeatherCity(v || "Paris");
  };

  const saveMessage = async () => {
    setCustomMessage(message);
    await refresh();
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
          async (pos) => {
            clearTimeout(timer);
            const lat = pos.coords.latitude;
            const lon = pos.coords.longitude;
            setGeo({ useGeo: true, lat, lon });
            setGeoInfo(`Position enregistrée: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
            await refresh();
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
      // géré ci-dessus
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
                Configurez la météo (WeatherAPI) et définissez un message personnalisé diffusé en continu.
              </div>
            </div>
          </div>

          {/* Alertes */}
          <Row>
            <div className="flex items-center gap-3">
              <Label className="text-[#214A33]">Alertes internes</Label>
              <span className="text-xs text-[#214A33]/60">projets (échéances, budgets, marges)</span>
            </div>
            <Switch checked={settings.modules.alerts} onCheckedChange={(v) => setModules({ alerts: !!v })} />
          </Row>

          {/* Météo WeatherAPI */}
          <Row>
            <div className="flex w-full flex-col gap-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Label className="text-[#214A33]">Météo (WeatherAPI)</Label>
                </div>
                <Switch checked={settings.modules.weather} onCheckedChange={(v) => setModules({ weather: !!v })} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#214A33]/60">Ville</span>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 w-[200px]" placeholder="Paris" />
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
              <div className="text-[11px] text-[#214A33]/60">
                Note: la clé WeatherAPI est gérée côté serveur (Supabase functions). Si indisponible, la météo peut ne pas s’afficher.
              </div>
            </div>
          </Row>

          {/* Message personnalisé */}
          <div className="rounded-md border border-[#BFBFBF] bg-white p-3">
            <Label className="mb-2 block text-[#214A33]">Message personnalisé</Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Saisissez ici le message à diffuser dans le bandeau…"
              className="min-h-[90px]"
            />
            <div className="mt-2 flex gap-2">
              <Button variant="outline" className="border-[#BFBFBF] text-[#214A33]" onClick={() => setMessage("")}>
                Effacer
              </Button>
              <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90" onClick={saveMessage}>
                Enregistrer le message
              </Button>
            </div>
            <div className="mt-1 text-[11px] text-[#214A33]/60">
              Le message s’ajoute aux alertes internes et à la météo lorsque ces modules sont activés.
            </div>
          </div>

          <div className="pt-2">
            <Button className="bg-[#214A33] text-white hover:bg-[#214A33]/90" onClick={refresh}>
              Rafraîchir le bandeau
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TickerSettingsPage;