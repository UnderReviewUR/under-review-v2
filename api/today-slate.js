import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  classifyF1Race,
  classifyGolfEvent,
  classifyMlbGame,
  classifyNbaGame,
  classifyTennisMatch,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../shared/eventValidity.js";
import { compareSlateRowsBySport, isNflSlateActiveFromBundle } from "../shared/slateModulePriority.js";
import { attachSlateRowEventKeys } from "../shared/slateRowEventKeys.js";

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
  const nextRace = getDisplayableF1NextRace(f1);
  if (!nextRace) return null;
  return String(nextRace?.meeting_name || nextRace?.name || "Next Grand Prix");
}

function sanitizeNbaBoard(nba) {
  if (!nba || typeof nba !== "object") return null;
  const todaysGames = (Array.isArray(nba.todaysGames) ? nba.todaysGames : []).filter((g) =>
    isDisplayableValidity(classifyNbaGame(g)),
  );
  return { ...nba, todaysGames };
}

function sanitizeMlbBoard(mlb) {
  if (!mlb || typeof mlb !== "object") return null;
  const games = (Array.isArray(mlb.games) ? mlb.games : []).filter((g) =>
    isDisplayableValidity(classifyMlbGame(g)),
  );
  return { ...mlb, games };
}

function sanitizeGolfBoard(golf) {
  if (!golf || typeof golf !== "object") return null;
  const nowMs = Date.now();
  const currentState = classifyGolfEvent(golf.currentEvent || null, nowMs);
  if (currentState === "active") return golf;

  const tournament = golf.tournament || null;
  const tournamentState = classifyGolfEvent(tournament, nowMs);
  const startMs = Date.parse(String(tournament?.startDate || ""));
  const within72h =
    Number.isFinite(startMs) && startMs >= nowMs && startMs - nowMs <= 72 * 60 * 60 * 1000;
  if (tournamentState === "upcoming" && within72h) {
    return {
      ...golf,
      currentEvent: null,
      tournament,
    };
  }
  return null;
}

function sanitizeTennisBoard(tennis) {
  if (!Array.isArray(tennis)) return null;
  return tennis.filter((m) => isDisplayableValidity(classifyTennisMatch(m)));
}

function sanitizeF1Board(f1) {
  if (!f1 || typeof f1 !== "object") return null;
  const races = Array.isArray(f1?.schedule?.races) ? f1.schedule.races : [];
  const validRaces = races.filter((r) => isDisplayableValidity(classifyF1Race(r)));
  const nextRace = getDisplayableF1NextRace({ ...f1, schedule: { ...(f1.schedule || {}), races: validRaces } });
  if (!nextRace) return null;
  return {
    ...f1,
    schedule: {
      ...(f1.schedule || {}),
      races: validRaces.map((r) => ({ ...r, is_next: r === nextRace })),
    },
  };
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
    : bundle?.golf?.currentEvent
    ? {
        sport: "golf",
        event: String(bundle?.golf?.currentEvent?.shortName || bundle?.golf?.currentEvent?.name || "Current event"),
        angle: "Placement over outrights",
        why: "Leaderboard context is usually more stable than volatile outright pricing.",
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
  if (s === "golf") return Boolean(bundle?.golf?.currentEvent);
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

    const [nba, mlb, golf, tennis, f1, nfl] = await Promise.all([
      fetchBoardJson(base, "/api/nba?view=board"),
      fetchBoardJson(base, "/api/mlb?view=board"),
      fetchBoardJson(base, "/api/golf?view=board"),
      fetchBoardJson(base, "/api/tennis?tour=atp"),
      fetchBoardJson(base, "/api/f1?view=board"),
      fetchBoardJson(base, "/api/nfl-context"),
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
    };

    const userPrompt = `You are Under Review's cross-sport slate editor.

Below is JSON with live-ish board snapshots from NBA, NFL context, MLB, Golf, ATP tennis, and F1 (may be partial or empty for some sports).

DATA
${JSON.stringify(bundle, null, 2)}

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

    const out = sanitizeSlateOutput(parsed, bundle);

    await setDurableJson(CACHE_KEY, out, { ttlSeconds: CACHE_TTL_SECONDS });
    res.setHeader("Cache-Control", "private, max-age=60");
    return res.status(200).json(out);
  } catch (err) {
    console.error("today-slate handler error:", err);
    try {
      const base = originFromReq(req);
      const [nba, mlb, golf, tennis, f1, nfl] = await Promise.all([
        fetchBoardJson(base, "/api/nba?view=board"),
        fetchBoardJson(base, "/api/mlb?view=board"),
        fetchBoardJson(base, "/api/golf?view=board"),
        fetchBoardJson(base, "/api/tennis?tour=atp"),
        fetchBoardJson(base, "/api/f1?view=board"),
        fetchBoardJson(base, "/api/nfl-context"),
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
