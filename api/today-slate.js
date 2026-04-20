import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";

const CACHE_KEY = "today-slate:daily";
const CACHE_TTL_SECONDS = 15 * 60;

function originFromReq(req) {
  const xfProto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const proto = xfProto || "http";
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "localhost:5173").split(",")[0].trim();
  return `${proto}://${host}`;
}

async function fetchBoardJson(base, path) {
  try {
    const res = await fetch(`${base}${path}`, { cache: "no-store" });
    if (!res.ok) return { ok: false, status: res.status, data: null };
    return { ok: true, status: res.status, data: await res.json() };
  } catch (e) {
    return { ok: false, status: 0, data: null, error: e?.message };
  }
}

function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block?.type === "text" && block?.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function safeParseSlateJson(text) {
  const raw = String(text || "").trim();
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let o = tryParse(raw);
  if (o) return o;
  const m = raw.match(/\{[\s\S]*\}\s*$/);
  if (m) return tryParse(m[0]);
  return null;
}

function summarizeNba(nba) {
  const games = Array.isArray(nba?.todaysGames) ? nba.todaysGames : [];
  const pre = games.find((g) => g?.state === "pre") || games[0];
  if (!pre) return null;
  const away = pre?.awayTeam?.abbr || pre?.awayTeam?.name || "AWAY";
  const home = pre?.homeTeam?.abbr || pre?.homeTeam?.name || "HOME";
  return `${away} @ ${home}`;
}

function summarizeMlb(mlb) {
  const games = Array.isArray(mlb?.games) ? mlb.games : [];
  const pre = games.find((g) => g?.state === "pre") || games[0];
  if (!pre) return null;
  const away = pre?.awayTeam?.abbr || pre?.awayTeam?.name || "AWAY";
  const home = pre?.homeTeam?.abbr || pre?.homeTeam?.name || "HOME";
  const parkName = String(pre?.park?.name || pre?.venue || "").trim();
  return {
    label: `${away} @ ${home}`,
    parkName,
    parkFactor: Number(pre?.park?.pf || 0) || null,
  };
}

function summarizeF1(f1) {
  const nextRace =
    (Array.isArray(f1?.schedule?.upcoming) && f1.schedule.upcoming[0]) ||
    (Array.isArray(f1?.schedule?.races) && f1.schedule.races.find((r) => r?.is_next)) ||
    null;
  if (!nextRace) return null;
  return String(nextRace?.meeting_name || nextRace?.name || "Next Grand Prix");
}

function buildFallbackSlate(bundle, reason = "fallback") {
  const generatedAt = new Date().toISOString();
  const nbaGame = summarizeNba(bundle?.nba);
  const mlb = summarizeMlb(bundle?.mlb);
  const f1Race = summarizeF1(bundle?.f1);

  const safeLean = mlb
    ? {
        sport: "mlb",
        game: mlb.label,
        angle: "Venue-first total read",
        why:
          mlb.parkFactor && mlb.parkFactor >= 105
            ? `${mlb.parkName || "This park"} boosts run environment (PF ${mlb.parkFactor}) — lean over/early offense when starters are TBD.`
            : `${mlb.parkName || "Venue context"} + confirmed slate row gives the cleanest low-volatility angle right now.`,
      }
    : {
        sport: "nba",
        game: nbaGame || "Tonight's board",
        angle: "Game-flow read",
        why: "Use posted matchup/series context from board rows and avoid unsupported player-name assumptions.",
      };

  const sharpAngle = nbaGame
    ? {
        sport: "nba",
        event: nbaGame,
        angle: "Series/game-total context over narrative",
        why: "Prioritize playoffSeries + gameTotals + injuries before any player-level assumptions.",
      }
    : {
        sport: "golf",
        event: String(bundle?.golf?.currentEvent?.shortName || bundle?.golf?.currentEvent?.name || "Current event"),
        angle: "Placement over outrights",
        why: "Leaderboard context is usually more stable than volatile outright pricing.",
      };

  const contrarian = f1Race
    ? {
        sport: "f1",
        match: f1Race,
        angle: "Qualifying gap fade setup",
        why: "If market overreacts to one-session pace, look for H2H/value on race-pace regression.",
      }
    : {
        sport: "tennis",
        match: "ATP card",
        angle: "Serve-volume prop over outrights",
        why: "Ace/double-fault profile edges can price cleaner than broad match-winner narratives.",
      };

  return { generatedAt, safeLean, sharpAngle, contrarian, _fallbackReason: reason };
}

export default async function handler(req, res) {
  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const cached = await getDurableJson(CACHE_KEY);
    if (cached && cached.generatedAt) {
      const age = Date.now() - Date.parse(cached.generatedAt);
      if (!Number.isNaN(age) && age >= 0 && age < CACHE_TTL_SECONDS * 1000) {
        res.setHeader("Cache-Control", "private, max-age=60");
        return res.status(200).json(cached);
      }
    }

    const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
    const ANTHROPIC_MODEL = getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";
    if (!ANTHROPIC_API_KEY) {
      return res.status(503).json({ error: "Missing ANTHROPIC_API_KEY" });
    }

    const base = originFromReq(req);

    const [nba, mlb, golf, tennis, f1] = await Promise.all([
      fetchBoardJson(base, "/api/nba?view=board"),
      fetchBoardJson(base, "/api/mlb?view=board"),
      fetchBoardJson(base, "/api/golf?view=board"),
      fetchBoardJson(base, "/api/tennis?tour=atp"),
      fetchBoardJson(base, "/api/f1?view=board"),
    ]);

    const bundle = {
      fetchedAt: new Date().toISOString(),
      nba: nba.ok ? nba.data : null,
      mlb: mlb.ok ? mlb.data : null,
      golf: golf.ok ? golf.data : null,
      tennis: tennis.ok ? tennis.data : null,
      f1: f1.ok ? f1.data : null,
    };

    const userPrompt = `You are Under Review's cross-sport slate editor.

Below is JSON with live-ish board snapshots from NBA, MLB, Golf, ATP tennis, and F1 (may be partial or empty for some sports).

DATA
${JSON.stringify(bundle, null, 2)}

TASK
Return ONLY a single JSON object (no markdown, no prose outside JSON) with exactly this shape and keys:

{
  "generatedAt": "<ISO-8601 UTC timestamp for when you authored this>",
  "safeLean": { "sport": "nba|mlb|golf|tennis|f1", "game": "AWAY @ HOME or event label", "angle": "short label", "why": "one sentence" },
  "sharpAngle": { "sport": "...", "event": "tournament or slate label", "angle": "...", "why": "one sentence" },
  "contrarian": { "sport": "...", "match": "optional — player or matchup string", "angle": "...", "why": "one sentence" }
}

RULES
- safeLean: the most reliable edge on tonight's slate across all sports (pick the strongest single lean grounded in the data).
- sharpAngle: a non-obvious but data-supported angle most casual users would miss.
- contrarian: an angle nobody's talking about — fade of chalk, live trigger, or correlated underpriced situation.
- Use only facts visible in the JSON; do not invent games, scores, or prices.
- If a sport has no usable slate in the payload, you may still reference it only if another field clearly supports it; otherwise favor sports with real rows.
- "game" for golf can be the tournament short name; for tennis include player surnames vs; for F1 use next GP name from schedule if present.`;

    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 45000);
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: ctrl.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1200,
        temperature: 0.35,
        system:
          "You output valid JSON only. No markdown fences. Keys must match the user schema exactly.",
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    clearTimeout(t);

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("today-slate Anthropic error:", response.status, data);
      const fb = buildFallbackSlate(bundle, `upstream_error_${response.status}`);
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return res.status(200).json(fb);
    }

    const text = extractAnthropicText(data);
    const parsed = safeParseSlateJson(text);
    if (!parsed || typeof parsed !== "object") {
      console.error("today-slate: unparseable model output", text?.slice(0, 400));
      const fb = buildFallbackSlate(bundle, "bad_model_json");
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return res.status(200).json(fb);
    }

    const generatedAt = typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString();
    const out = {
      generatedAt,
      safeLean: parsed.safeLean || null,
      sharpAngle: parsed.sharpAngle || null,
      contrarian: parsed.contrarian || null,
    };

    await setDurableJson(CACHE_KEY, out, { ttlSeconds: CACHE_TTL_SECONDS });
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json(out);
  } catch (err) {
    console.error("today-slate handler error:", err);
    try {
      const base = originFromReq(req);
      const [nba, mlb, golf, tennis, f1] = await Promise.all([
        fetchBoardJson(base, "/api/nba?view=board"),
        fetchBoardJson(base, "/api/mlb?view=board"),
        fetchBoardJson(base, "/api/golf?view=board"),
        fetchBoardJson(base, "/api/tennis?tour=atp"),
        fetchBoardJson(base, "/api/f1?view=board"),
      ]);
      const bundle = {
        fetchedAt: new Date().toISOString(),
        nba: nba.ok ? nba.data : null,
        mlb: mlb.ok ? mlb.data : null,
        golf: golf.ok ? golf.data : null,
        tennis: tennis.ok ? tennis.data : null,
        f1: f1.ok ? f1.data : null,
      };
      const fb = buildFallbackSlate(bundle, "server_error");
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return res.status(200).json(fb);
    } catch {
      return res.status(500).json({ error: "server_error", message: "today-slate unavailable" });
    }
  }
}
