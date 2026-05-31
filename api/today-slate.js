import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { safeParseSlateJson } from "./_todaySlateParse.js";
import buildHomeBoardBundle from "./_homeBoardBundle.js";
import {
  classifyMlbGame,
  classifyNbaGame,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../shared/eventValidity.js";
import { compareSlateRowsBySport, isNflSlateActiveFromBundle } from "../shared/slateModulePriority.js";
import { attachSlateRowEventKeys } from "../shared/slateRowEventKeys.js";
/** Anthropic-backed slate JSON — short TTL so Home polls don’t contend with user UR Take quota. */
const CACHE_KEY = "today_slate_cache_v4";
const CACHE_TTL_SECONDS = 300;
const slateCache = {};

function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block?.type === "text" && block?.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
}

/** Cut token volume to Anthropic (same Haiku org TPM); full boards can exceed 50k TPM when Home polls often. */
function slimBundleForSlatePrompt(bundle) {
  if (!bundle || typeof bundle !== "object") return bundle;
  const out = { fetchedAt: bundle.fetchedAt };

  if (bundle.nba) {
    out.nba = {
      todaysGames: (bundle.nba.todaysGames || []).slice(0, 12).map((g) => ({
        awayTeam: { abbr: g?.awayTeam?.abbr, name: g?.awayTeam?.name, score: g?.awayTeam?.score },
        homeTeam: { abbr: g?.homeTeam?.abbr, name: g?.homeTeam?.name, score: g?.homeTeam?.score },
        state: g?.state,
        status: g?.status,
        period: g?.period,
        clock: g?.clock,
        seriesContext: g?.seriesContext,
      })),
      playoffSeries: Array.isArray(bundle.nba.playoffSeries) ? bundle.nba.playoffSeries.slice(0, 8) : [],
      propLines: (bundle.nba.propLines || []).slice(0, 35).map((p) => ({
        player: p.player,
        game: p.game,
        prop: p.prop || p.propRaw,
      })),
      gameTotals: bundle.nba.gameTotals,
      injuries: (bundle.nba.injuries || []).slice(0, 22).map((i) => ({
        player: i.player,
        team: i.team,
        status: i.status,
      })),
    };
  }

  if (bundle.mlb) {
    out.mlb = {
      games: (bundle.mlb.games || []).slice(0, 12).map((g) => ({
        awayTeam: { abbr: g?.awayTeam?.abbr },
        homeTeam: { abbr: g?.homeTeam?.abbr },
        state: g?.state,
        park: g?.park ? { name: g.park?.name, pf: g.park?.pf } : null,
      })),
      propLines: (bundle.mlb.propLines || []).slice(0, 35).map((p) => ({
        player: p.player,
        game: p.game,
        prop: p.prop || p.propRaw,
      })),
      gameTotals: bundle.mlb.gameTotals,
    };
  }

  if (bundle.golf) {
    const ge = bundle.golf.currentEvent || bundle.golf.tournament;
    out.golf = ge
      ? {
          event: {
            name: ge.name || ge.shortName,
            shortName: ge.shortName || ge.name,
          },
        }
      : { note: "golf board present" };
  }

  if (Array.isArray(bundle.tennis)) {
    out.tennis = bundle.tennis.slice(0, 18).map((m) => ({
      home: m.home || m.home_team,
      away: m.away || m.away_team,
      round: m.round,
    }));
  }

  if (bundle.f1) {
    const races = bundle.f1.schedule?.races || [];
    const past = Array.isArray(bundle.f1.schedule?.past) ? bundle.f1.schedule.past : [];
    const lastCompleted = past.length ? past[past.length - 1] : null;
    const nextRace = races.find((r) => r.is_next) || races[0] || null;
    out.f1 = {
      lastCompletedGrandPrix: lastCompleted
        ? {
            meeting_name: lastCompleted.meeting_name,
            circuit_short_name: lastCompleted.circuit_short_name,
          }
        : null,
      nextGrandPrix: nextRace
        ? {
            meeting_name: nextRace.meeting_name,
            circuit_short_name: nextRace.circuit_short_name,
            is_next: !!nextRace.is_next,
          }
        : null,
      upcomingSchedulePreview: races.slice(0, 8).map((r) => ({
        meeting_name: r.meeting_name,
        is_next: !!r.is_next,
        circuit_short_name: r.circuit_short_name,
      })),
    };
  }

  if (bundle.nfl) {
    out.nfl = bundle.nfl;
  }

  return out;
}

function summarizeNba(nba) {
  const games = (Array.isArray(nba?.todaysGames) ? nba.todaysGames : []).filter((g) =>
    isDisplayableValidity(classifyNbaGame(g)),
  );
  const pre = games.find((g) => g?.state === "pre") || games[0];
  if (!pre) return null;
  const away = pre?.awayTeam?.abbr || pre?.awayTeam?.name || "AWAY";
  const home = pre?.homeTeam?.abbr || pre?.homeTeam?.name || "HOME";
  return `${away} @ ${home}`;
}

function summarizeMlb(mlb) {
  const games = (Array.isArray(mlb?.games) ? mlb.games : []).filter((g) =>
    isDisplayableValidity(classifyMlbGame(g)),
  );
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
  const nextRace = getDisplayableF1NextRace(f1);
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
        why: "Tonight's playoff slate — ask for props, totals, or live angles on any matchup.",
      };

  const sharpAngle = bundle?.golf
    ? {
        sport: "golf",
        event: String(
          bundle?.golf?.currentEvent?.shortName ||
            bundle?.golf?.currentEvent?.name ||
            bundle?.golf?.tournament?.shortName ||
            bundle?.golf?.tournament?.name ||
            "Current event",
        ),
        angle: "Placement over outrights",
        why: "Leaderboard context is usually more stable than volatile outright pricing during the event.",
      }
    : nbaGame
    ? {
        sport: "nba",
        event: nbaGame,
        angle: "Series/game-total context over narrative",
        why: "Prioritize playoffSeries + gameTotals + injuries before any player-level assumptions.",
      }
    : {
        sport: "tennis",
        event: "ATP card",
        angle: "Return-game pressure over highlight bias",
        why: "Hold/break profile usually carries more signal than recent highlight outcomes.",
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

  return attachSlateOutputEventKeys(
    { generatedAt, safeLean, sharpAngle, contrarian, _fallbackReason: reason },
    bundle,
  );
}

function sportHasValidData(bundle, sport) {
  const s = String(sport || "").toLowerCase();
  if (s === "nba") return Array.isArray(bundle?.nba?.todaysGames) && bundle.nba.todaysGames.length > 0;
  if (s === "nfl") return isNflSlateActiveFromBundle(bundle);
  if (s === "mlb") return Array.isArray(bundle?.mlb?.games) && bundle.mlb.games.length > 0;
  if (s === "golf") return Boolean(bundle?.golf);
  if (s === "tennis") return Array.isArray(bundle?.tennis) && bundle.tennis.length > 0;
  if (s === "f1") return Boolean(summarizeF1(bundle?.f1));
  return false;
}

function applySlateRowOrder(out, bundle) {
  const rows = [
    { key: "safeLean", item: out.safeLean },
    { key: "sharpAngle", item: out.sharpAngle },
    { key: "contrarian", item: out.contrarian },
  ];
  rows.sort((a, b) => compareSlateRowsBySport(a, b, bundle));
  return {
    ...out,
    _slateRowOrder: rows.map((r) => r.key),
  };
}

function attachSlateOutputEventKeys(out, bundle) {
  const base = applySlateRowOrder(out, bundle);
  return {
    ...base,
    safeLean: attachSlateRowEventKeys(base.safeLean, bundle),
    sharpAngle: attachSlateRowEventKeys(base.sharpAngle, bundle),
    contrarian: attachSlateRowEventKeys(base.contrarian, bundle),
  };
}

function sanitizeSlateOutput(parsed, bundle) {
  const fallback = buildFallbackSlate(bundle, "sport_guard");
  const sanitizeRow = (row, fallbackRow) => {
    if (!row || typeof row !== "object") return fallbackRow || null;
    const sport = String(row.sport || "").toLowerCase();
    if (!sportHasValidData(bundle, sport)) return fallbackRow || null;
    return row;
  };

  const merged = {
    generatedAt:
      typeof parsed.generatedAt === "string" ? parsed.generatedAt : new Date().toISOString(),
    safeLean: sanitizeRow(parsed.safeLean, fallback.safeLean),
    sharpAngle: sanitizeRow(parsed.sharpAngle, fallback.sharpAngle),
    contrarian: sanitizeRow(parsed.contrarian, fallback.contrarian),
  };
  return attachSlateOutputEventKeys(merged, bundle);
}

export default async function handler(req, res) {
  const requestStart = Date.now();
  const respondWithDuration = (statusCode, payload) => {
    console.log(JSON.stringify({
      event: "today_slate_complete",
      durationMs: Date.now() - requestStart,
      statusCode,
    }));
    return res.status(statusCode).json(payload);
  };

  if (!applyCors(req, res)) return;
  if (req.method !== "GET") {
    return respondWithDuration(405, { error: "Method not allowed" });
  }

  try {
    const cached = await getDurableJson(CACHE_KEY);
    if (cached && !cached._empty) {
      res.setHeader("Cache-Control", "private, max-age=60");
      return respondWithDuration(200, cached);
    }

    const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
    const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
    if (!ANTHROPIC_API_KEY) {
      return respondWithDuration(503, { error: "Missing ANTHROPIC_API_KEY" });
    }

    const sport = String(req.query?.sport || req.query?.tab || "home").toLowerCase();
    const cacheKey = `${sport}_${Math.floor(Date.now() / (30 * 60 * 1000))}`;
    if (slateCache[cacheKey]) {
      res.setHeader("Cache-Control", "private, max-age=60");
      return respondWithDuration(200, slateCache[cacheKey]);
    }

    const bundle = await buildHomeBoardBundle(req);

    const slimBundle = slimBundleForSlatePrompt(bundle);

    const userPrompt = `You are Under Review's cross-sport slate editor — write like a sharp bettor texting friends, not a press release.

Below is JSON with live-ish board snapshots from NBA, NFL context, MLB, Golf, ATP tennis, and F1 (may be partial or empty for some sports). Rows may be truncated for size — still ground leans only in what is present.

DATA
${JSON.stringify(slimBundle, null, 2)}

TASK
Return ONLY a single JSON object (no markdown, no prose outside JSON) with exactly this shape and keys:

{
  "generatedAt": "<ISO-8601 UTC timestamp for when you authored this>",
  "safeLean": { "sport": "nba|nfl|mlb|golf|tennis|f1", "game": "AWAY @ HOME or event label", "angle": "short label", "why": "one sentence" },
  "sharpAngle": { "sport": "...", "event": "tournament or slate label", "angle": "...", "why": "one sentence" },
  "contrarian": { "sport": "...", "match": "optional — player or matchup string", "angle": "...", "why": "one sentence" }
}

RULES
- Ordering priority for which sport to lead with (when multiple sports have real rows): (1) NBA during playoffs if today has games in the payload, (2) NFL when in-season or draft is live, (3) MLB with a live game, (4) tennis with matchups, (5) F1 on race weekend, (6) golf when active/upcoming is valid.
- If NBA playoffs with games exist, the first row you want users to read must be NBA (set safeLean to NBA in that case unless data clearly favors another sport — default to NBA first).
- safeLean: the most reliable edge on tonight's slate across all sports (pick the strongest single lean grounded in the data).
- sharpAngle: a non-obvious but data-supported angle most casual users would miss.
- contrarian: an angle nobody's talking about — fade of chalk, live trigger, or correlated underpriced situation.
- Use only facts visible in the JSON; do not invent games, scores, or prices.
- If a sport has no usable slate in the payload, you may still reference it only if another field clearly supports it; otherwise favor sports with real rows.
- "game" for golf can be the tournament short name; for tennis include player surnames vs; for F1 use next GP name from schedule if present.
- F1 discipline: DATA may include f1.lastCompletedGrandPrix and f1.nextGrandPrix. If your angle compares the next venue to a prior Grand Prix, "last week," or recency / form carryover, you may name a specific previous GP only when f1.lastCompletedGrandPrix is non-null — use that object's meeting_name verbatim (same race). Do not name any other prior GP (for example do not assume Monaco) unless it appears as meeting_name inside f1.lastCompletedGrandPrix. If f1.lastCompletedGrandPrix is null, do not attribute market behavior to form from a named prior race; anchor the take in circuit traits, tyres, weather, or other fields present in the JSON instead.

OUTPUT
Respond ONLY with raw JSON (no markdown, no code fences). The first character must be {.
`;

    const anthropicResult = await fetchAnthropicMessages({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_MODEL,
      max_tokens: 1200,
      temperature: 0.35,
      system:
        "You output valid JSON only. Bro voice in why/angle fields: plain, first-person-friendly, no structural-angle jargon or injury-report tone. Never wrap output in markdown. Respond ONLY with raw JSON: the first character must be {.",
      messages: [{ role: "user", content: userPrompt }],
      timeoutMs: 45000,
      maxRetries: 3,
    });

    const data = anthropicResult.data;
    if (!anthropicResult.ok) {
      console.error(
        "today-slate Anthropic error:",
        anthropicResult.status,
        anthropicResult.rateLimitedExhausted ? "(retries exhausted)" : "",
        data,
      );
      const fb = buildFallbackSlate(
        bundle,
        anthropicResult.rateLimitedExhausted
          ? "upstream_rate_limit"
          : `upstream_error_${anthropicResult.status}`,
      );
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return respondWithDuration(200, fb);
    }

    const text = extractAnthropicText(data);
    const parsed = safeParseSlateJson(text);
    if (!parsed || typeof parsed !== "object") {
      console.error("today-slate: unparseable model output", text?.slice(0, 400));
      const fb = buildFallbackSlate(bundle, "bad_model_json");
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return respondWithDuration(200, fb);
    }

    const out = sanitizeSlateOutput(parsed, bundle);
    slateCache[cacheKey] = out;

    await setDurableJson(CACHE_KEY, out, { ttlSeconds: CACHE_TTL_SECONDS });
    res.setHeader("Cache-Control", "private, max-age=60");
    return respondWithDuration(200, out);
  } catch (err) {
    console.error("today-slate handler error:", err);
    try {
      const bundle = await buildHomeBoardBundle(req);
      const fb = buildFallbackSlate(bundle, "server_error");
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return respondWithDuration(200, fb);
    } catch {
      return respondWithDuration(500, { error: "server_error", message: "today-slate unavailable" });
    }
  }
}
