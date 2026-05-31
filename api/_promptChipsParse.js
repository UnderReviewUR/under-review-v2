const SUPPORTED_SPORTS = new Set(["nba", "mlb", "golf", "f1", "tennis", "nfl"]);
const MAX_CHIPS = 5;
const MAX_TEXT_CHARS = 90;

function stripCodeFence(rawText) {
  const text = String(rawText || "").trim();
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : text).trim();
}

function normalizeChipText(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "";
  return text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS).trimEnd() : text;
}

export default function parsePromptChips(rawText) {
  let parsed;
  try {
    parsed = JSON.parse(stripCodeFence(rawText));
  } catch {
    return [];
  }

  const rows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.chips)
      ? parsed.chips
      : null;
  if (!Array.isArray(rows)) return [];

  const out = [];
  for (const item of rows) {
    if (!item || typeof item !== "object") continue;
    const sport = String(item.sport || "").trim().toLowerCase();
    if (!SUPPORTED_SPORTS.has(sport)) continue;
    const text = normalizeChipText(item.text);
    if (!text) continue;
    out.push({ text, sport, source: "model" });
    if (out.length >= MAX_CHIPS) break;
  }
  return out;
}
