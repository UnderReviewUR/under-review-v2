import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import { safeParseSlateJson } from "./_todaySlateParse.js";
import {
  classifyMlbGame,
  classifyNbaGame,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../shared/eventValidity.js";
import { compareSlateRowsBySport, isNflSlateActiveFromBundle } from "../shared/slateModulePriority.js";
import { attachSlateRowEventKeys } from "../shared/slateRowEventKeys.js";
import {
  sanitizeF1Board,
  sanitizeGolfBoard,
  sanitizeMlbBoard,
  sanitizeNbaBoard,
  sanitizeTennisBoard,
  sanitizeWorldCupBoard,
} from "../shared/todaySlateInputBundle.js";
import { isWcHomePromoWindow } from "../shared/wc2026Constants.js";
import { ensureWorldCupInSlateOutput } from "../shared/wcSlateFeaturing.js";
import { loadWorldCupSlateBoard } from "../shared/wcSlateBundle.js";

/** Anthropic-backed slate JSON — short TTL so Home polls don’t contend with user UR Take quota. */
const CACHE_KEY = "today_slate_cache_v4";
const CACHE_TTL_SECONDS = 300;
const slateCache = {};

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

  if (bundle.worldcup) {
    const wc = bundle.worldcup;
    out.worldcup = {
      tournament: wc.tournament,
      hosts: wc.hosts,
      kickoff: wc.kickoff,
      groups: (wc.groups || []).slice(0, 12),
      upcoming: (wc.upcoming || []).slice(0, 6),
      live: wc.live || [],
      outrightsSample: wc.outrightsSample || {},
      valueOutrights: (wc.valueOutrights || []).slice(0, 6),
      favorites: (wc.favorites || []).slice(0, 12),
    };
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

function summarizeWorldCup(wc) {
  if (!wc) return null;
  const upcoming = Array.isArray(wc.upcoming) ? wc.upcoming[0] : null;
  if (upcoming?.homeTeam && upcoming?.awayTeam) {
    return `${upcoming.homeTeam} vs ${upcoming.awayTeam}${upcoming.group ? ` (Group ${upcoming.group})` : ""}`;
  }
  return "2026 FIFA World Cup group stage";
}

function pickWcContrarianFallback(wc) {
  const value = Array.isArray(wc?.valueOutrights) ? wc.valueOutrights : [];
  const nor = value.find((t) => t.team === "NOR") || { team: "NOR", name: "Norway", odds: "+2500" };
  const par =
    value.find((t) => t.team === "PAR") || { team: "PAR", name: "Paraguay", odds: "+8000" };
  const pick = value[0] || par;
  return {
    sport: "worldcup",
    match: `${pick.name} (${pick.team}) group-stage path`,
    angle: pick.team === "NOR" ? "Norway group value" : "Longshot advancement misprice",
    why:
      pick.team === "PAR"
        ? `Paraguay at ${pick.odds || "+8000"} to advance still looks wide vs a soft Group L path if the market is pricing them like a pure outsider.`
        : `Norway at ${nor.odds || "+2500"} group-stage value — the board may still be underpricing their ceiling in a winnable opening group.`,
  };
}

function buildFallbackSlate(bundle, reason = "fallback") {
  const generatedAt = new Date().toISOString();
  const wcPromo = isWcHomePromoWindow();
  const wcBoard = bundle?.worldcup;
  const nbaGame = summarizeNba(bundle?.nba);
  const mlb = summarizeMlb(bundle?.mlb);
  const f1Race = summarizeF1(bundle?.f1);
  const wcEvent = summarizeWorldCup(wcBoard);

  const safeLean = wcPromo && wcBoard
    ? {
        sport: "worldcup",
        game: wcEvent || "World Cup 2026",
        angle: "Group favorite to control the table",
        why: "Pre-tournament group favorites with host-path leverage still look like the cleanest low-volatility entry before kickoff.",
      }
    : mlb
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

  const sharpAngle = wcPromo && wcBoard
    ? {
        sport: "worldcup",
        event: wcEvent || "World Cup 2026 groups",
        angle: "Host-path scheduling edge",
        why: "USA/Mexico/Canada path and travel density can misprice group totals and advancement — look where the schedule compresses rest edges.",
      }
    : bundle?.golf
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

  const contrarian = wcPromo && wcBoard
    ? pickWcContrarianFallback(wcBoard)
    : f1Race
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
  if (s === "worldcup") return Boolean(bundle?.worldcup && isWcHomePromoWindow());
  return false;
}

function applySlateRowOrder(out, bundle, nowMs = Date.now()) {
  const rows = [
    { key: "safeLean", item: out.safeLean },
    { key: "sharpAngle", item: out.sharpAngle },
    { key: "contrarian", item: out.contrarian },
  ];
  rows.sort((a, b) => compareSlateRowsBySport(a, b, bundle, nowMs));
  return {
    ...out,
    _slateRowOrder: rows.map((r) => r.key),
  };
}

function attachSlateOutputEventKeys(out, bundle, nowMs = Date.now()) {
  const withWc = ensureWorldCupInSlateOutput(out, bundle, nowMs);
  const base = applySlateRowOrder(withWc, bundle, nowMs);
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

    const base = originFromReq(req);

    const [nba, mlb, golf, tennis, f1, nfl, worldcupKv, worldcupHttp] = await Promise.all([
      fetchBoardJson(base, "/api/nba?view=board"),
      fetchBoardJson(base, "/api/mlb?view=board"),
      fetchBoardJson(base, "/api/golf?view=board"),
      fetchBoardJson(base, "/api/tennis?tour=atp"),
      fetchBoardJson(base, "/api/f1?view=board"),
      fetchBoardJson(base, "/api/nfl-context"),
      loadWorldCupSlateBoard(),
      isWcHomePromoWindow() ? fetchBoardJson(base, "/api/world-cup") : Promise.resolve({ ok: false, data: null }),
    ]);

    const worldcupFromApi = isWcHomePromoWindow()
      ? sanitizeWorldCupBoard(worldcupKv) ||
        (worldcupHttp.ok ? sanitizeWorldCupBoard(worldcupHttp.data) : null)
      : null;

    const bundle = {
      fetchedAt: new Date().toISOString(),
      nba: nba.ok ? sanitizeNbaBoard(nba.data) : null,
      mlb: mlb.ok ? sanitizeMlbBoard(mlb.data) : null,
      golf: golf.ok ? sanitizeGolfBoard(golf.data) : null,
      tennis: tennis.ok ? sanitizeTennisBoard(tennis.data) : null,
      f1: f1.ok ? sanitizeF1Board(f1.data) : null,
      nfl:
        nfl.ok && nfl.data
          ? {
              draftPhase: nfl.data?.draft?.phase ?? nfl.data?.meta?.nflDraftPhase ?? null,
              meta: nfl.data?.meta ? { nflDraftPhase: nfl.data.meta.nflDraftPhase } : null,
            }
          : null,
      worldcup: worldcupFromApi,
    };

    const slimBundle = slimBundleForSlatePrompt(bundle);

    const userPrompt = `You are Under Review's cross-sport slate editor — write like a sharp bettor texting friends, not a press release.

Below is JSON with live-ish board snapshots from NBA, NFL context, MLB, Golf, ATP tennis, F1, and World Cup 2026 (worldcup) when present. Rows may be truncated for size — still ground leans only in what is present.

DATA
${JSON.stringify(slimBundle, null, 2)}

TASK
Return ONLY a single JSON object (no markdown, no prose outside JSON) with exactly this shape and keys:

{
  "generatedAt": "<ISO-8601 UTC timestamp for when you authored this>",
  "safeLean": { "sport": "nba|nfl|mlb|golf|tennis|f1|worldcup", "game": "AWAY @ HOME or event label", "angle": "short label", "why": "one sentence" },
  "sharpAngle": { "sport": "...", "event": "tournament or slate label", "angle": "...", "why": "one sentence" },
  "contrarian": { "sport": "...", "match": "optional — player or matchup string", "angle": "...", "why": "one sentence" }
}

RULES
- Ordering priority for which sport to lead with (when multiple sports have real rows): (1) worldcup when worldcup object is present (2026 FIFA World Cup promo through Jul 19 — lead with this over NBA/MLB), (2) NBA during playoffs if today has games, (3) NFL when in-season or draft is live, (4) MLB with a live game, (5) tennis with matchups, (6) F1 on race weekend, (7) golf when active/upcoming is valid.
- When worldcup is in DATA, safeLean should default to worldcup unless another sport has a clearly stronger live edge right now.
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
      const base = originFromReq(req);
      const [nba, mlb, golf, tennis, f1, nfl, worldcupKv] = await Promise.all([
        fetchBoardJson(base, "/api/nba?view=board"),
        fetchBoardJson(base, "/api/mlb?view=board"),
        fetchBoardJson(base, "/api/golf?view=board"),
        fetchBoardJson(base, "/api/tennis?tour=atp"),
        fetchBoardJson(base, "/api/f1?view=board"),
        fetchBoardJson(base, "/api/nfl-context"),
        loadWorldCupSlateBoard(),
      ]);
      const bundle = {
        fetchedAt: new Date().toISOString(),
        nba: nba.ok ? sanitizeNbaBoard(nba.data) : null,
        mlb: mlb.ok ? sanitizeMlbBoard(mlb.data) : null,
        golf: golf.ok ? sanitizeGolfBoard(golf.data) : null,
        tennis: tennis.ok ? sanitizeTennisBoard(tennis.data) : null,
        f1: f1.ok ? sanitizeF1Board(f1.data) : null,
        nfl:
          nfl.ok && nfl.data
            ? {
                draftPhase: nfl.data?.draft?.phase ?? nfl.data?.meta?.nflDraftPhase ?? null,
                meta: nfl.data?.meta ? { nflDraftPhase: nfl.data.meta.nflDraftPhase } : null,
              }
            : null,
        worldcup: sanitizeWorldCupBoard(worldcupKv),
      };
      const fb = buildFallbackSlate(bundle, "server_error");
      await setDurableJson(CACHE_KEY, fb, { ttlSeconds: CACHE_TTL_SECONDS });
      res.setHeader("Cache-Control", "private, max-age=60");
      return respondWithDuration(200, fb);
    } catch {
      return respondWithDuration(500, { error: "server_error", message: "today-slate unavailable" });
    }
  }
}
