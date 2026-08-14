/**
 * Official NFL inactives — posted ~90 minutes before kick, not the injury report.
 * No vendor names in user-facing copy.
 */

import { nflAvailabilityNameMatch } from "./nflEspnParticipation.js";

const ESPN_ABBR_ALIASES = Object.freeze({
  WSH: "WAS",
  JAC: "JAX",
  ARZ: "ARI",
});

/**
 * ESPN uses WSH; UR uses WAS. Keep both matchable.
 * @param {string} abbr
 */
export function normalizeEspnNflAbbr(abbr) {
  const a = String(abbr || "").toUpperCase().trim();
  if (!a) return "";
  return ESPN_ABBR_ALIASES[a] || a;
}

/**
 * @param {string} a
 * @param {string} b
 */
export function espnNflAbbrsMatch(a, b) {
  const x = normalizeEspnNflAbbr(a);
  const y = normalizeEspnNflAbbr(b);
  if (!x || !y) return false;
  if (x === y) return true;
  if ((x === "WAS" && y === "WSH") || (x === "WSH" && y === "WAS")) return true;
  if ((x === "JAX" && y === "JAC") || (x === "JAC" && y === "JAX")) return true;
  return false;
}

/**
 * "Is X dressing?" / official inactives — not every preseason sit/spread ask.
 * @param {string} question
 */
export function isNflDressingAsk(question) {
  const q = String(question || "");
  if (
    /\b(?:dress(?:ing)?|inactives?|even out there|will (?:he|she|they) play)\b/i.test(q)
  ) {
    return true;
  }
  if (/\bis [A-Za-z'.-]+(?:\s+[A-Za-z'.-]+){0,2} (?:even )?(?:dressing|playing tonight|sitting)\b/i.test(q)) {
    return true;
  }
  if (/\bare (?:the )?starters even (?:dressing|out there|playing)\b/i.test(q)) {
    return true;
  }
  return false;
}

/**
 * @param {Record<string, unknown>} json ESPN site scoreboard
 * @returns {Array<Record<string, unknown>>}
 */
export function parseEspnNflScoreboardEvents(json) {
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const event of json?.events || []) {
    const comp = Array.isArray(event.competitions) ? event.competitions[0] : null;
    if (!comp) continue;
    const competitors = Array.isArray(comp.competitors) ? comp.competitors : [];
    const home = competitors.find((c) => c.homeAway === "home") || competitors[0];
    const away = competitors.find((c) => c.homeAway === "away") || competitors[1];
    const homeAbbr = normalizeEspnNflAbbr(home?.team?.abbreviation);
    const awayAbbr = normalizeEspnNflAbbr(away?.team?.abbreviation);
    if (!homeAbbr || !awayAbbr) continue;
    const state = String(event.status?.type?.state || comp.status?.type?.state || "").toLowerCase();
    const startMs = Date.parse(String(event.date || comp.date || ""));
    out.push({
      eventId: String(event.id || ""),
      date: event.date || null,
      startMs: Number.isFinite(startMs) ? startMs : null,
      status: state === "in" || state === "inprogress" ? "in" : state === "post" ? "post" : "pre",
      awayAbbr,
      homeAbbr,
      awayId: away?.id != null ? String(away.id) : null,
      homeId: home?.id != null ? String(home.id) : null,
      shortName: event.shortName || `${awayAbbr} @ ${homeAbbr}`,
    });
  }
  return out;
}

/**
 * Official inactives = didNotPlay:true. Empty roster or all-false = list not posted.
 * @param {Record<string, unknown>} json core roster
 * @param {string} teamAbbr
 */
export function parseEspnNflGameRosterEntries(json, teamAbbr) {
  const team = normalizeEspnNflAbbr(teamAbbr);
  const entries = Array.isArray(json?.entries) ? json.entries : [];
  /** @type {Array<Record<string, unknown>>} */
  const players = [];
  for (const e of entries) {
    if (!e || e.didNotPlay !== true) continue;
    const last = String(e.displayName || "").trim();
    const athleteRef = e.athlete && typeof e.athlete === "object" ? String(e.athlete.$ref || "") : "";
    players.push({
      player: last,
      lastName: last,
      playerId: e.playerId ?? null,
      jersey: e.jersey != null ? String(e.jersey) : null,
      team,
      athleteRef: athleteRef || null,
      source: "official_inactives",
    });
  }
  return {
    team,
    rosterCount: entries.length,
    posted: players.length > 0,
    players,
  };
}

/**
 * @param {{ games?: Array<Record<string, unknown>>, asOf?: number }} snapshot
 * @param {string} question
 * @param {string[]} [extraNames]
 */
export function findNflInactivePlayer(snapshot, question, extraNames = []) {
  const q = String(question || "");
  const names = extraNames.map((n) => String(n || "").trim()).filter(Boolean);
  for (const game of snapshot?.games || []) {
    for (const p of game.players || []) {
      const player = String(p.player || p.lastName || "");
      if (!player) continue;
      const named = names.some(
        (n) => nflAvailabilityNameMatch(n, player) || nflAvailabilityNameMatch(player, n),
      );
      const inQ =
        nflAvailabilityNameMatch(player, q) ||
        nflInactiveLastNameInQuestion(String(p.lastName || player), q);
      if (!named && !inQ) continue;
      return { game, player: p, posted: Boolean(game.posted) };
    }
  }
  return null;
}

/**
 * Official lists are often last-name-only. 3-letter last names still count as a whole word.
 * @param {string} last
 * @param {string} question
 */
function nflInactiveLastNameInQuestion(last, question) {
  const token = String(last || "").trim().split(/\s+/).pop() || "";
  if (token.length < 3) return false;
  try {
    return new RegExp(`\\b${token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(
      String(question || ""),
    );
  } catch {
    return false;
  }
}

/**
 * @param {{ games?: Array<Record<string, unknown>> }} snapshot
 * @param {Set<string>|string[]|null} [scopeAbbrs]
 */
export function nflInactivesPostedForAsk(snapshot, scopeAbbrs = null) {
  const games = Array.isArray(snapshot?.games) ? snapshot.games : [];
  if (!games.length) return false;
  const scope = scopeAbbrs instanceof Set ? [...scopeAbbrs] : Array.isArray(scopeAbbrs) ? scopeAbbrs : [];
  const relevant = scope.length
    ? games.filter((g) => {
        const ha = normalizeEspnNflAbbr(g.homeAbbr);
        const aa = normalizeEspnNflAbbr(g.awayAbbr);
        return scope.some((s) => espnNflAbbrsMatch(s, ha) || espnNflAbbrsMatch(s, aa));
      })
    : games.filter((g) => g.status !== "post");
  const pool = relevant.length ? relevant : games;
  return pool.some((g) => Boolean(g.posted) && Array.isArray(g.players) && g.players.length > 0);
}

/**
 * @param {{ games?: Array<Record<string, unknown>>, asOf?: number, source?: string }} snapshot
 * @param {{ scopeAbbrs?: Set<string>|string[] }} [opts]
 */
export function formatNflInactivesPromptBlock(snapshot, opts = {}) {
  const games = Array.isArray(snapshot?.games) ? snapshot.games : [];
  const scope = opts.scopeAbbrs instanceof Set ? [...opts.scopeAbbrs] : opts.scopeAbbrs || [];
  const shown = scope.length
    ? games.filter((g) =>
        scope.some(
          (s) => espnNflAbbrsMatch(s, g.homeAbbr) || espnNflAbbrsMatch(s, g.awayAbbr),
        ),
      )
    : games;
  const rows = shown.length ? shown : games;

  if (!rows.length) {
    return "NFL INACTIVES: no game list yet. Official inactives typically post ~90 minutes before kick. PASS on dressing asks until the list is up. Do not invent sit/play.";
  }

  const ageMin =
    snapshot?.asOf && Number.isFinite(Number(snapshot.asOf))
      ? Math.max(0, Math.round((Date.now() - Number(snapshot.asOf)) / 60000))
      : null;
  const head = `NFL INACTIVES (official list${ageMin != null ? `, ~${ageMin}m old` : ""}):`;
  const lines = rows.slice(0, 8).map((g) => {
    const match = `${g.awayAbbr || "?"} @ ${g.homeAbbr || "?"}`;
    if (!g.posted) {
      return `${match} · not posted yet (~90 min before kick). PASS on dressing / starter-volume until this list is up.`;
    }
    const byTeam = new Map();
    for (const p of g.players || []) {
      const team = normalizeEspnNflAbbr(p.team) || "?";
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team).push(String(p.player || p.lastName || "?").trim());
    }
    const parts = [...byTeam.entries()].map(
      ([team, names]) => `${team}: ${names.slice(0, 12).join(", ") || "(empty)"}`,
    );
    return `${match} · POSTED — ${parts.join(" · ") || "list empty"}. Named here = not dressing. Not named ≠ starter snaps.`;
  });
  return `${head}\n${lines.join("\n")}\nInjury-report Out is not the official inactive list. Do not invent a dress/sit call before POSTED.`;
}
