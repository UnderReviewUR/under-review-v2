/**
 * Fetch official NFL inactives from ESPN game rosters (didNotPlay).
 * Empty roster before ~90 min = list not posted.
 */
import { getDurableJson, setDurableJson } from "./_durableStore.js";
import {
  normalizeEspnNflAbbr,
  parseEspnNflGameRosterEntries,
  parseEspnNflScoreboardEvents,
} from "../shared/nflEspnInactives.js";

const KV_KEY = "nfl_espn_inactives";
const UA = "Mozilla/5.0 (compatible; UnderReview/1.0)";
const SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard";

function etYmd(nowMs = Date.now(), offsetDays = 0) {
  const d = new Date(nowMs + offsetDays * 86400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/New_York" }).replace(/-/g, "");
}

function rosterUrl(eventId, competitorId) {
  return `https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/${eventId}/competitions/${eventId}/competitors/${competitorId}/roster?lang=en&region=us`;
}

async function fetchJson(url, timeoutMs = 15000) {
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * @param {string} ref
 */
async function fetchAthleteFullName(ref) {
  const url = String(ref || "").replace("http://", "https://");
  if (!url) return null;
  try {
    const json = await fetchJson(url, 8000);
    const name = String(json.displayName || json.fullName || "").trim();
    return name || null;
  } catch {
    return null;
  }
}

/**
 * @param {Record<string, unknown>} event
 */
async function hydrateGameInactives(event) {
  const awayId = event.awayId;
  const homeId = event.homeId;
  const eventId = event.eventId;
  /** @type {Array<Record<string, unknown>>} */
  let players = [];
  let rosterCount = 0;
  if (eventId && awayId && homeId) {
    const [awayRoster, homeRoster] = await Promise.all([
      fetchJson(rosterUrl(eventId, awayId)).catch(() => null),
      fetchJson(rosterUrl(eventId, homeId)).catch(() => null),
    ]);
    const away = parseEspnNflGameRosterEntries(awayRoster, event.awayAbbr);
    const home = parseEspnNflGameRosterEntries(homeRoster, event.homeAbbr);
    rosterCount = (away.rosterCount || 0) + (home.rosterCount || 0);
    players = [...away.players, ...home.players];
    const needNames = players.filter((p) => p.athleteRef && String(p.player || "").split(/\s+/).length < 2);
    if (needNames.length) {
      const resolved = await Promise.all(
        needNames.slice(0, 20).map(async (p) => {
          const full = await fetchAthleteFullName(p.athleteRef);
          return { playerId: p.playerId, full };
        }),
      );
      const byId = new Map(resolved.filter((r) => r.full).map((r) => [String(r.playerId), r.full]));
      players = players.map((p) => {
        const full = byId.get(String(p.playerId));
        return full ? { ...p, player: full } : p;
      });
    }
  }
  return {
    eventId: event.eventId,
    awayAbbr: normalizeEspnNflAbbr(event.awayAbbr),
    homeAbbr: normalizeEspnNflAbbr(event.homeAbbr),
    startMs: event.startMs,
    status: event.status,
    shortName: event.shortName,
    rosterCount,
    posted: players.length > 0,
    players,
  };
}

/**
 * @param {{
 *   nowMs?: number,
 *   maxGames?: number,
 *   scopeAbbrs?: Set<string>|string[]|null,
 *   liveBoardGames?: Array<Record<string, unknown>>,
 * }} [opts]
 */
export async function fetchNflEspnInactivesSnapshot(opts = {}) {
  const nowMs = Number(opts.nowMs) || Date.now();
  const maxGames = Math.max(1, Math.min(Number(opts.maxGames) || 6, 8));
  const nearKick = true;
  const ttlSec = nearKick ? 3 * 60 : 8 * 60;

  try {
    const cached = await getDurableJson(KV_KEY);
    if (
      cached?.games &&
      cached.fetchedAt &&
      nowMs - Number(cached.fetchedAt) < ttlSec * 1000
    ) {
      return { ...cached, asOf: cached.fetchedAt, source: "kv" };
    }
  } catch {
    /* ignore */
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();
  try {
    for (const offset of [-1, 0, 1]) {
      const dates = etYmd(nowMs, offset);
      const json = await fetchJson(`${SCOREBOARD_URL}?dates=${dates}`);
      for (const ev of parseEspnNflScoreboardEvents(json)) {
        if (ev.eventId) byId.set(String(ev.eventId), ev);
      }
    }
  } catch (err) {
    console.warn(
      JSON.stringify({ event: "nfl_espn_inactives_scoreboard_failed", error: err?.message || String(err) }),
    );
  }

  const events = [...byId.values()];
  const scope = opts.scopeAbbrs instanceof Set ? [...opts.scopeAbbrs] : opts.scopeAbbrs || [];
  const windowStart = nowMs - 4 * 3600_000;
  const windowEnd = nowMs + 10 * 3600_000;
  const ranked = events
    .map((ev) => {
      const start = Number(ev.startMs) || 0;
      const scoped =
        scope.length > 0 &&
        scope.some(
          (s) =>
            normalizeEspnNflAbbr(s) === ev.homeAbbr || normalizeEspnNflAbbr(s) === ev.awayAbbr,
        );
      const inWindow = start >= windowStart && start <= windowEnd && ev.status !== "post";
      const live = ev.status === "in";
      return { ev, scoped, inWindow, live, start };
    })
    .filter((r) => r.scoped || r.inWindow || r.live)
    .sort((a, b) => {
      if (a.scoped !== b.scoped) return a.scoped ? -1 : 1;
      if (a.live !== b.live) return a.live ? -1 : 1;
      return a.start - b.start;
    })
    .slice(0, maxGames)
    .map((r) => r.ev);

  const games = [];
  for (const ev of ranked) {
    try {
      games.push(await hydrateGameInactives(ev));
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nfl_espn_inactives_roster_failed",
          eventId: ev.eventId,
          error: err?.message || String(err),
        }),
      );
      games.push({
        eventId: ev.eventId,
        awayAbbr: ev.awayAbbr,
        homeAbbr: ev.homeAbbr,
        startMs: ev.startMs,
        status: ev.status,
        shortName: ev.shortName,
        rosterCount: 0,
        posted: false,
        players: [],
      });
    }
  }

  const fetchedAt = Date.now();
  const payload = {
    games,
    fetchedAt,
    asOf: fetchedAt,
    source: "live",
    postedCount: games.filter((g) => g.posted).length,
  };

  try {
    await setDurableJson(KV_KEY, payload, { ttlSeconds: ttlSec });
  } catch {
    /* KV optional locally */
  }

  console.info(
    JSON.stringify({
      event: "nfl_espn_inactives",
      gameCount: games.length,
      postedCount: payload.postedCount,
      sample: games.map((g) => `${g.awayAbbr}@${g.homeAbbr}:${g.posted ? g.players.length : "pending"}`),
    }),
  );

  return payload;
}
