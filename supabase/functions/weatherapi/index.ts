import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
} as const;

type ByCity = { action: "byCity"; city: string };
type ByCoords = { action: "byCoords"; lat: number; lon: number };
type Payload = ByCity | ByCoords;

serve(async (req) => {
  // Réponse au préflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: corsHeaders });
  }

  const key = Deno.env.get("WEATHERAPI_KEY");
  if (!key) {
    return new Response(JSON.stringify({ error: "Missing WEATHERAPI_KEY" }), { status: 400, headers: corsHeaders });
  }

  const body = (await req.json().catch(() => ({}))) as Partial<Payload>;

  const base = "https://api.weatherapi.com/v1/forecast.json";
  let url: string | null = null;

  if (body.action === "byCity" && typeof body.city === "string" && body.city.trim()) {
    const q = encodeURIComponent(body.city.trim());
    url = `${base}?key=${encodeURIComponent(key)}&q=${q}&days=1&aqi=no&alerts=no&lang=fr`;
  } else if (body.action === "byCoords" && typeof body.lat === "number" && typeof body.lon === "number") {
    const q = `${body.lat},${body.lon}`;
    url = `${base}?key=${encodeURIComponent(key)}&q=${encodeURIComponent(q)}&days=1&aqi=no&alerts=no&lang=fr`;
  } else {
    return new Response(JSON.stringify({ error: "Invalid payload" }), { status: 400, headers: corsHeaders });
  }

  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const text = await resp.text();
      return new Response(JSON.stringify({ error: `WeatherAPI error: ${resp.status}`, details: text }), { status: 400, headers: corsHeaders });
    }
    const data = await resp.json();

    const loc = data?.location ?? {};
    const cur = data?.current ?? {};
    const day = data?.forecast?.forecastday?.[0]?.day ?? {};

    const label = (() => {
      const name = String(loc.name ?? "").trim();
      const country = String(loc.country ?? "").trim();
      const region = String(loc.region ?? "").trim();
      if (name && country) return `${name} (${country})`;
      if (name && region) return `${name} (${region})`;
      return name || country || region || "Localisation";
    })();

    const result = {
      label,
      temp_c: Math.round(Number(cur.temp_c ?? day.avgtemp_c ?? 0)),
      tmin_c: Math.round(Number(day.mintemp_c ?? cur.temp_c ?? 0)),
      tmax_c: Math.round(Number(day.maxtemp_c ?? cur.temp_c ?? 0)),
      condition: String(cur?.condition?.text ?? day?.condition?.text ?? "Météo"),
    };

    return new Response(JSON.stringify(result), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Fetch failed", message: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});