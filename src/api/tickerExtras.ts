import { supabase } from "@/integrations/supabase/client";

export type TickerItem = { id: string; short: string; severity?: "critical" | "warning" | "info" };

export async function fetchWeatherItemsWeatherAPI(city: string): Promise<TickerItem[]> {
  const res = await supabase.functions.invoke("weatherapi", { body: { action: "byCity", city } });
  if (res.error) throw res.error;
  const data = res.data as { label: string; temp_c: number; tmin_c: number; tmax_c: number; condition: string };
  return [
    { id: `wx-${data.label}`, short: `Météo ${data.label}: ${data.temp_c}°C • Max ${data.tmax_c}° / Min ${data.tmin_c}° • ${data.condition}`, severity: "info" },
  ];
}

export async function fetchWeatherByCoordsWeatherAPI(lat: number, lon: number): Promise<TickerItem[]> {
  const res = await supabase.functions.invoke("weatherapi", { body: { action: "byCoords", lat, lon } });
  if (res.error) throw res.error;
  const data = res.data as { label: string; temp_c: number; tmin_c: number; tmax_c: number; condition: string };
  return [
    { id: `wx-${data.label}`, short: `Météo ${data.label}: ${data.temp_c}°C • Max ${data.tmax_c}° / Min ${data.tmin_c}° • ${data.condition}`, severity: "info" },
  ];
}