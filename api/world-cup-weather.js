import { applyApiNoStoreHeaders, applyCors } from "./_cors.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

const WEATHER_TTL = 3600;

function weatherCodeToCondition(code) {
  const c = Number(code);
  if (c === 0) return { condition: "Clear", icon: "☀️" };
  if (c >= 1 && c <= 3) return { condition: "Cloudy", icon: "⛅" };
  if (c >= 51 && c <= 67) return { condition: "Rain", icon: "🌧️" };
  if (c >= 80 && c <= 82) return { condition: "Rain", icon: "🌧️" };
  if (c >= 95) return { condition: "Storm", icon: "⛈️" };
  if (c >= 71 && c <= 77) return { condition: "Snow", icon: "❄️" };
  return { condition: "Cloudy", icon: "⛅" };
}

function cacheKey(city, lat, lon) {
  const c = String(city || "unknown")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  return `wc_weather_${c}_${Number(lat).toFixed(2)}_${Number(lon).toFixed(2)}`;
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    applyApiNoStoreHeaders(res);
    return res.status(405).json({ error: "Method not allowed" });
  }
  applyApiNoStoreHeaders(res);

  const city = String(req.query?.city || "").trim();
  const lat = Number(req.query?.lat);
  const lon = Number(req.query?.lon);
  if (!city || !Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: "city, lat, and lon are required" });
  }

  const key = cacheKey(city, lat, lon);
  try {
    const cached = await getDurableJson(key);
    if (cached?.tempF != null) return res.status(200).json(cached);

    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      "&current=temperature_2m,precipitation,wind_speed_10m,weather_code" +
      "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto";
    const apiRes = await fetch(url, { cache: "no-store" });
    if (!apiRes.ok) {
      if (cached) return res.status(200).json({ ...cached, fallback: true });
      return res.status(502).json({ error: "Weather provider unavailable" });
    }
    const data = await apiRes.json();
    const cur = data?.current || {};
    const { condition, icon } = weatherCodeToCondition(cur.weather_code);
    const payload = {
      city,
      tempF: Math.round(Number(cur.temperature_2m ?? 0)),
      precipitation: Number(cur.precipitation ?? 0),
      windMph: Math.round(Number(cur.wind_speed_10m ?? 0)),
      condition,
      icon,
      lastUpdated: Date.now(),
    };
    await setDurableJson(key, payload, { ttlSeconds: WEATHER_TTL });
    return res.status(200).json(payload);
  } catch (err) {
    console.error("[world-cup-weather]", err);
    const cached = await getDurableJson(key);
    if (cached) return res.status(200).json({ ...cached, fallback: true });
    return res.status(500).json({ error: "Weather fetch failed" });
  }
}
