export type TickerItem = { id: string; short: string; severity?: "critical" | "warning" | "info" };

// Astuces courtes locales
const TIPS: string[] = [
  "Astuce: Double-cliquez un créneau pour le supprimer.",
  "Astuce: Glissez un projet d’une case occupée pour le remplacer.",
  "Astuce: Cliquez une heure après avoir sélectionné un projet pour l’assigner.",
  "Astuce: Validez votre journée depuis la page Aujourd’hui.",
  "Astuce: Utilisez la roue dentée pour paramétrer le bandeau.",
];

function wxDescFromCode(code: number) {
  if (code === 0) return "Ciel clair";
  if ([1, 2, 3].includes(code)) return "Variable";
  if ([45, 48].includes(code)) return "Brouillard";
  if ([51, 53, 55, 56, 57].includes(code)) return "Bruine";
  if ([61, 63, 65, 66, 67].includes(code)) return "Pluie";
  if ([71, 73, 75, 77].includes(code)) return "Neige";
  if ([80, 81, 82].includes(code)) return "Averses";
  if ([95, 96, 99].includes(code)) return "Orages";
  return "Météo";
}

// Météo via ville
export async function fetchWeatherItems(city: string): Promise<TickerItem[]> {
  const name = (city || "Paris").trim();
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=fr&format=json`
  ).then((r) => r.json()).catch(() => null as any);

  const loc = geo?.results?.[0];
  const lat = loc?.latitude ?? 48.8566;
  const lon = loc?.longitude ?? 2.3522;
  const cityLabel = (loc?.name && loc?.country_code) ? `${loc.name} (${loc.country_code})` : name;

  return fetchWeatherByCoords(lat, lon, cityLabel);
}

// Météo via coordonnées; reverse geocode pour un nom humain lisible
export async function fetchWeatherByCoords(lat: number, lon: number, label?: string): Promise<TickerItem[]> {
  let cityLabel = label;
  if (!cityLabel) {
    const rev = await fetch(
      `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${lat}&longitude=${lon}&language=fr&format=json`
    ).then((r) => r.json()).catch(() => null as any);
    const loc = rev?.results?.[0];
    // Essayer plusieurs champs, puis fallback coordonnées si tout échoue
    const name =
      (loc?.name && String(loc.name)) ||
      (loc?.admin1 && String(loc.admin1)) ||
      (loc?.admin2 && String(loc.admin2)) ||
      (loc?.county && String(loc.county)) ||
      "";
    const cc = (loc?.country_code && String(loc.country_code)) || "";
    if (name) cityLabel = cc ? `${name} (${cc})` : name;
    if (!cityLabel) cityLabel = `${lat.toFixed(2)}, ${lon.toFixed(2)}`;
  }

  const wx = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&language=fr`
  ).then((r) => r.json()).catch(() => null as any);

  const t = Math.round(wx?.current?.temperature_2m ?? 0);
  const tMax = Math.round(wx?.daily?.temperature_2m_max?.[0] ?? t);
  const tMin = Math.round(wx?.daily?.temperature_2m_min?.[0] ?? t);
  const code = Number(wx?.current?.weather_code ?? -1);
  const wDesc = wxDescFromCode(code);

  return [
    { id: `wx-${cityLabel}`, short: `Météo ${cityLabel}: ${t}°C • Max ${tMax}° / Min ${tMin}° • ${wDesc}`, severity: "info" },
  ];
}

export function localTipsItems(count = 5): TickerItem[] {
  const arr = [...TIPS];
  const now = new Date().getTime();
  arr.sort((a, b) => ((a.length + now) % 7) - ((b.length + now) % 7));
  return arr.slice(0, count).map((txt, i) => ({ id: `tip-${i}`, short: txt, severity: "info" }));
}