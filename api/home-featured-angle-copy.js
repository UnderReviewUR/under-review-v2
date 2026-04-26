import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

const CACHE_TTL_SECONDS = 2 * 60 * 60;

function sanitizeKeyPart(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block?.type === "text" && block?.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function parseCopyJson(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const m = raw.match(/\{[\s\S]*\}$/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch {
      return null;
    }
  }
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      dateKeyEt,
      matchup,
      game,
      injuryImpactCount = 0,
      seriesGameNumber = 0,
      injurySummary = [],
    } = req.body || {};
    const dateKey = String(dateKeyEt || "").trim();
    const matchupLabel = String(matchup || "").trim();
    if (!dateKey || !matchupLabel) {
      return res.status(400).json({ error: "missing_date_or_matchup" });
    }

    const cacheKey = `featured_card_${sanitizeKeyPart(dateKey)}_${sanitizeKeyPart(matchupLabel)}`;
    const cached = await getDurableJson(cacheKey);
    if (cached?.lean && cached?.reason) {
      res.setHeader("Cache-Control", "private, max-age=120");
      return res.status(200).json(cached);
    }

    const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
    const HAIKU_MODEL = process.env.ANTHROPIC_MODEL || getEnv("ANTHROPIC_MODEL");
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "Missing ANTHROPIC_API_KEY" });
    }

    const seed = {
      matchup: matchupLabel,
      game: {
        away: game?.away || "",
        home: game?.home || "",
        startTimeUtc: game?.startTimeUtc || null,
        state: game?.state || null,
        status: game?.status || null,
      },
      injuryImpactCount: Number(injuryImpactCount || 0),
      seriesGameNumber: Number(seriesGameNumber || 0),
      injurySummary: Array.isArray(injurySummary) ? injurySummary.slice(0, 10) : [],
    };

    const prompt = `You are writing Home featured-card copy for UnderReview.
Return ONLY valid JSON:
{"lean":"...","reason":"..."}

CONTEXT
${JSON.stringify(seed, null, 2)}

RULES
- Write one bold-style lean sentence and one supporting reason sentence.
- Keep product voice sharp, conversational, and specific.
- No template jargon ("availability tags", "reprice possessions", "pipeline", "context payload").
- No odds-book references, no posted lines, no implied probabilities.
- Ground wording in matchup script, injuries, series leverage, pace/rotation pressure.
- Keep each field <= 24 words.
- Do not use markdown.
- If injuryImpactCount > 0, make injuries part of the reason.
- If seriesGameNumber > 0, include series leverage naturally.`;

    let parsed = null;
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: HAIKU_MODEL,
          max_tokens: 180,
          temperature: 0.35,
          system: "Output strict JSON only with keys lean and reason.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(
          "[home-featured-angle-copy] anthropic upstream error:",
          response.status,
          data?.error?.message || data?.error || data,
        );
        return res.status(502).json({ error: "anthropic_upstream_error" });
      }
      parsed = parseCopyJson(extractAnthropicText(data));
    } catch (anthropicErr) {
      console.error(
        "[home-featured-angle-copy] anthropic call failed:",
        anthropicErr?.message || anthropicErr,
      );
      return res.status(502).json({ error: "anthropic_call_failed" });
    }
    const lean = String(parsed?.lean || "").trim();
    const reason = String(parsed?.reason || "").trim();
    if (!lean || !reason) {
      return res.status(502).json({ error: "bad_model_json" });
    }
    const out = { lean, reason };
    await setDurableJson(cacheKey, out, { ttlSeconds: CACHE_TTL_SECONDS });
    res.setHeader("Cache-Control", "private, max-age=120");
    return res.status(200).json(out);
  } catch (err) {
    console.error("home-featured-angle-copy error:", err?.message || err);
    return res.status(500).json({ error: "internal_error" });
  }
}
