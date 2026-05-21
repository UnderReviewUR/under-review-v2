import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  buildNbaStructuralPlayerIndex,
  fetchEspnDepthRotationKeysByTeam,
  filterInjurySummaryForStructuralAngles,
  validateStructuralAngleCopy,
} from "../shared/structuralAngleValidation.js";

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
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(stripped);
  } catch {
    // fall through to raw parse + brace-tail parse
  }
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
      playerStats = [],
      propLines = [],
    } = req.body || {};
    const dateKey = String(dateKeyEt || "").trim();
    const matchupLabel = String(matchup || "").trim();
    if (!dateKey || !matchupLabel) {
      return res.status(400).json({ error: "missing_date_or_matchup" });
    }

    const kvCacheKey = `featured_card_${sanitizeKeyPart(dateKey)}_${sanitizeKeyPart(matchupLabel)}`;
    const cached = await getDurableJson(kvCacheKey);
    console.log('[angle-copy] durable', cached ? 'HIT' : 'MISS', kvCacheKey);
    if (cached?.lean && cached?.reason) {
      res.setHeader("Cache-Control", "private, max-age=120");
      return res.status(200).json(cached);
    }

    const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "Missing ANTHROPIC_API_KEY" });
    }

    const awayAbbr = String(game?.away || "").trim().toUpperCase();
    const homeAbbr = String(game?.home || "").trim().toUpperCase();
    const depthRotationByTeam = await fetchEspnDepthRotationKeysByTeam(
      [awayAbbr, homeAbbr].filter(Boolean),
    );
    const structuralIndex = buildNbaStructuralPlayerIndex({
      playerStats: Array.isArray(playerStats) ? playerStats : [],
      propLines: Array.isArray(propLines) ? propLines : [],
      depthRotationByTeam,
    });
    const filteredInjurySummary = filterInjurySummaryForStructuralAngles(
      Array.isArray(injurySummary) ? injurySummary : [],
      structuralIndex,
    );

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
      injurySummary: filteredInjurySummary.slice(0, 10),
    };

    const buildPrompt = (excludedPlayers = []) => {
      const excludeBlock =
        excludedPlayers.length > 0
          ? `\n- Do NOT mention these players (failed structural validation): ${excludedPlayers.join(", ")}.`
          : "";
      return `You are writing Home featured-card copy for UnderReview.
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
- If seriesGameNumber > 0, include series leverage naturally.
- Never name deep-bench players with minimal playoff minutes (e.g. Bismack Biyombo, David Jones) as a structural angle — only starters and rotation players who move the market.
- Never cite a guard (PG/SG/G) as creating an interior, frontcourt, paint, or rebound vacancy.
- Only cite injured players with 15+ MPG (last 10), 3+ recent starts, ESPN depth-chart rotation role, or active prop markets.
- Respond with only a raw JSON object. No markdown, no code fences, no preamble, no explanation. First character must be { and last character must be }.${excludeBlock}`;
    };

    async function callAnthropic(userPrompt) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 180,
          temperature: 0.35,
          system: "Output strict JSON only with keys lean and reason.",
          messages: [{ role: "user", content: userPrompt }],
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        console.error(
          "[home-featured-angle-copy] anthropic upstream error:",
          response.status,
          data?.error?.message || data?.error || data,
        );
        return { error: "anthropic_upstream_error" };
      }
      return { parsed: parseCopyJson(extractAnthropicText(data)) };
    }

    let parsed = null;
    let excludedPlayers = [];
    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        const result = await callAnthropic(buildPrompt(excludedPlayers));
        if (result.error) return res.status(502).json({ error: result.error });
        parsed = result.parsed;
        const leanTry = String(parsed?.lean || "").trim();
        const reasonTry = String(parsed?.reason || "").trim();
        const validation = validateStructuralAngleCopy(
          { lean: leanTry, reason: reasonTry },
          structuralIndex,
        );
        if (validation.ok) break;
        excludedPlayers = [
          ...new Set(
            (validation.violations || [])
              .map((v) => String(v?.player || "").trim())
              .filter(Boolean),
          ),
        ];
        console.log(
          JSON.stringify({
            event: "home_featured_angle_structural_validation_failed",
            attempt: attempt + 1,
            codes: validation.criticalCodes || [],
            excludedPlayers,
          }),
        );
        if (attempt === 1) {
          return res.status(502).json({ error: "structural_angle_validation_failed" });
        }
      }
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
    const finalValidation = validateStructuralAngleCopy({ lean, reason }, structuralIndex);
    if (!finalValidation.ok) {
      return res.status(502).json({ error: "structural_angle_validation_failed" });
    }
    const out = { lean, reason };
    await setDurableJson(kvCacheKey, out, { ttlSeconds: CACHE_TTL_SECONDS });
    console.log('[angle-copy] stored', kvCacheKey);
    res.setHeader("Cache-Control", "private, max-age=120");
    return res.status(200).json(out);
  } catch (err) {
    console.error("home-featured-angle-copy error:", err?.message || err);
    return res.status(500).json({ error: "internal_error" });
  }
}
