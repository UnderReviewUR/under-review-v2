/**
 * Deterministic NBA roster grounding redirect — structured UR Take with lean headline.
 * Used when the user names a player who is off tonight's slate or outside the focused matchup.
 */

import { repairStructuredForDelivery } from "./types/urTakeResponse.js";
import { sanitizeLeanBroTone } from "./_urTakeCoreVoice.js";

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function prettyPlayerName(key) {
  return String(key || "")
    .split(" ")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

/**
 * @param {string} output
 * @param {Map<string, string>} knownPlayerToTeam lower-case keys
 */
function buildUniqueLastNameToPlayerKey(knownPlayerToTeam) {
  /** @type {Map<string, string[]>} */
  const byLast = new Map();
  for (const k of knownPlayerToTeam.keys()) {
    const parts = String(k || "")
      .split(/\s+/)
      .filter(Boolean);
    const last = parts[parts.length - 1];
    if (!last || last.length < 4) continue;
    const lastLower = last.toLowerCase();
    if (!byLast.has(lastLower)) byLast.set(lastLower, []);
    byLast.get(lastLower).push(k);
  }
  /** @type {Map<string, string>} */
  const unique = new Map();
  for (const [lastLower, keys] of byLast) {
    if (keys.length === 1) unique.set(lastLower, keys[0]);
  }
  return unique;
}

function extractMentionedPlayersFromVerifiedMap(output, knownPlayerToTeam) {
  const text = String(output || "");
  if (!text || !knownPlayerToTeam || knownPlayerToTeam.size === 0) return [];
  const names = [...knownPlayerToTeam.keys()]
    .map((k) => {
      const pretty = k
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      return { key: k, pretty };
    })
    .sort((a, b) => b.pretty.length - a.pretty.length);
  const hits = new Set();
  for (const n of names) {
    const re = new RegExp(`\\b${escapeRegExp(n.pretty)}\\b`, "i");
    if (re.test(text)) hits.add(n.key);
  }
  const lastUnique = buildUniqueLastNameToPlayerKey(knownPlayerToTeam);
  for (const [lastLower, key] of lastUnique) {
    if (hits.has(key)) continue;
    const re = new RegExp(`\\b${escapeRegExp(lastLower)}\\b`, "i");
    if (!re.test(text)) continue;
    let suppressed = false;
    for (const otherKey of knownPlayerToTeam.keys()) {
      if (otherKey === key) continue;
      const op = String(otherKey || "")
        .split(/\s+/)
        .filter(Boolean);
      if (op.length < 2) continue;
      if (op[0].toLowerCase() !== lastLower) continue;
      const otherPretty = op.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      if (new RegExp(`\\b${escapeRegExp(otherPretty)}\\b`, "i").test(text)) {
        suppressed = true;
        break;
      }
    }
    if (!suppressed) hits.add(key);
  }
  return [...hits];
}

/**
 * @param {string} teamAbbr
 * @param {object} nbaContext
 */
function collectSlateTeamAbbrevs(nbaContext) {
  const slateTeams = new Set();
  for (const g of nbaContext?.todaysGames || []) {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (a && a !== "?") slateTeams.add(a);
    if (h && h !== "?") slateTeams.add(h);
  }
  if (slateTeams.size === 0) {
    for (const k of Object.keys(nbaContext?.rosterGrounding?.playersByTeamAbbrev || {})) {
      const u = String(k || "").toUpperCase();
      if (u && u !== "?") slateTeams.add(u);
    }
  }
  return slateTeams;
}

/**
 * @param {string} teamAbbr
 * @param {object} nbaContext
 */
function findTeamGameLabel(teamAbbr, nbaContext) {
  const team = String(teamAbbr || "").toUpperCase();
  for (const g of nbaContext?.todaysGames || []) {
    const away = String(g?.awayTeam?.abbr || "").toUpperCase();
    const home = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (away === team || home === team) {
      return `${away} @ ${home}`;
    }
  }
  return null;
}

/**
 * @param {string} playerKey
 * @param {string} teamAbbr
 * @param {object} nbaContext
 */
function isPlayerOnTeamRosterTonight(playerKey, teamAbbr, nbaContext) {
  const roster =
    nbaContext?.rosterGrounding?.playersByTeamAbbrev?.[String(teamAbbr || "").toUpperCase()] ||
    [];
  if (!roster.length) return true;
  const keys = new Set(roster.map((n) => normalizePlayerNameKey(n)));
  return keys.has(playerKey);
}

/**
 * @param {object} nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string }} matchup
 * @param {ReturnType<import("./ur-take.js").buildAllowedMatchupPlayerPool>} pool
 * @param {Set<string>} excludeKeys
 */
function pickAlternateLeanPlayer(nbaContext, matchup, pool, excludeKeys) {
  const allowed = new Set(
    matchup?.awayAbbr && matchup?.homeAbbr
      ? [String(matchup.awayAbbr).toUpperCase(), String(matchup.homeAbbr).toUpperCase()]
      : (pool?.allowedTeams || []).map((t) => String(t || "").toUpperCase()),
  );
  if (!allowed.size) return null;

  const stats = Array.isArray(nbaContext?.playerStats) ? nbaContext.playerStats : [];
  const ranked = stats
    .filter((row) => allowed.has(String(row?.team || "").toUpperCase()))
    .map((row) => ({
      key: normalizePlayerNameKey(row?.name),
      name: String(row?.name || "").trim(),
      score:
        Number(row?.pts || 0) +
        Number(row?.reb || 0) * 0.9 +
        Number(row?.ast || 0) * 1.1,
    }))
    .filter((r) => r.name && r.key && !excludeKeys.has(r.key))
    .sort((a, b) => b.score - a.score);

  if (ranked.length) return ranked[0].name;

  for (const team of allowed) {
    for (const n of pool?.byTeam?.[team] || []) {
      const key = normalizePlayerNameKey(n);
      if (key && !excludeKeys.has(key)) return String(n).trim();
    }
  }
  return null;
}

/**
 * @param {object} params
 * @param {string} params.question
 * @param {object} params.nbaContext
 * @param {{ awayAbbr?: string, homeAbbr?: string, label?: string } | null} params.nbaMatchup
 * @param {ReturnType<import("./ur-take.js").buildAllowedMatchupPlayerPool> | null} params.nbaMatchupPool
 * @param {{ verifiedPlayerToTeam?: Map<string, string> } | null} [params.nbaGroundingSnapshot]
 * @param {{ playerKey: string, teamAbbr: string, reason: 'off_slate' | 'off_roster' | 'off_matchup' } | null} [params.forcedOffPlayer]
 * @returns {Record<string, unknown> | null}
 */
export function tryBuildNbaGroundingRedirectStructured({
  question,
  nbaContext,
  nbaMatchup,
  nbaMatchupPool,
  nbaGroundingSnapshot,
  forcedOffPlayer = null,
}) {
  if (!nbaContext || typeof nbaContext !== "object") return null;
  if (!nbaMatchup?.awayAbbr || !nbaMatchup?.homeAbbr) return null;

  const knownMap =
    nbaMatchupPool?.knownPlayerToTeam instanceof Map
      ? nbaMatchupPool.knownPlayerToTeam
      : nbaGroundingSnapshot?.verifiedPlayerToTeam instanceof Map
        ? nbaGroundingSnapshot.verifiedPlayerToTeam
        : null;
  if (!knownMap || knownMap.size === 0) return null;

  const focusTeams = new Set(
    [nbaMatchup.awayAbbr, nbaMatchup.homeAbbr].map((t) => String(t || "").toUpperCase()),
  );
  const slateTeams = collectSlateTeamAbbrevs(nbaContext);
  const matchupLabel = `${String(nbaMatchup.awayAbbr).toUpperCase()} @ ${String(nbaMatchup.homeAbbr).toUpperCase()}`;

  /** @type {{ playerKey: string, teamAbbr: string, reason: string } | null} */
  let off = forcedOffPlayer
    ? {
        playerKey: forcedOffPlayer.playerKey,
        teamAbbr: String(forcedOffPlayer.teamAbbr || "").toUpperCase(),
        reason: forcedOffPlayer.reason,
      }
    : null;

  if (!off) {
    const mentioned = extractMentionedPlayersFromVerifiedMap(question, knownMap);
    for (const key of mentioned) {
      const team = String(knownMap.get(key) || "").toUpperCase();
      if (!team) continue;
      if (!slateTeams.has(team)) {
        off = { playerKey: key, teamAbbr: team, reason: "off_slate" };
        break;
      }
      if (!isPlayerOnTeamRosterTonight(key, team, nbaContext)) {
        off = { playerKey: key, teamAbbr: team, reason: "off_roster" };
        break;
      }
      if (!focusTeams.has(team)) {
        off = { playerKey: key, teamAbbr: team, reason: "off_matchup" };
        break;
      }
    }
  }

  if (!off) return null;

  const playerName = prettyPlayerName(off.playerKey);
  const excludeKeys = new Set([off.playerKey]);
  const altPlayer = pickAlternateLeanPlayer(nbaContext, nbaMatchup, nbaMatchupPool, excludeKeys);
  const altFirst = altPlayer ? String(altPlayer).split(/\s+/)[0] : "a live player in this game";
  const teamGameLabel = findTeamGameLabel(off.teamAbbr, nbaContext);

  let lean = "";
  if (off.reason === "off_slate" && teamGameLabel) {
    lean = `Lean: Pass. ${playerName} is on ${off.teamAbbr} (${teamGameLabel}) — off tonight; for ${matchupLabel}, ${altFirst} is the sharper lean.`;
  } else if (off.reason === "off_slate") {
    lean = `Lean: Pass. ${playerName}'s team (${off.teamAbbr}) is off tonight — for ${matchupLabel}, ${altFirst} is the sharper lean.`;
  } else if (off.reason === "off_roster") {
    lean = `Lean: Pass. ${playerName} isn't on tonight's verified ${off.teamAbbr} roster — for ${matchupLabel}, ${altFirst} is the sharper lean.`;
  } else {
    lean = `Lean: Pass. ${playerName} isn't in tonight's ${matchupLabel} game — ${altFirst} is the sharper lean here.`;
  }

  lean = sanitizeLeanBroTone(lean);
  if (lean.length > 120) {
    lean = sanitizeLeanBroTone(
      `Lean: Pass. ${playerName} isn't in ${matchupLabel} — ${altFirst} is the sharper lean.`,
    );
  }

  const slateNote =
    off.reason === "off_slate" && teamGameLabel
      ? `${playerName} is on ${off.teamAbbr} (${teamGameLabel}), which is not on tonight's board.`
      : off.reason === "off_roster"
        ? `${playerName} isn't on tonight's verified ${off.teamAbbr} roster strings.`
        : `${playerName} isn't part of ${matchupLabel}.`;

  const whyNow = `${playerName} isn't in tonight's game — ${slateNote} For ${matchupLabel}, the sharpest lean is ${altPlayer || altFirst}. Want that take instead?`;
  const edge =
    "Wrong-player questions waste a pick — redirect to a name actually on tonight's verified board for this matchup.";

  const raw = {
    lean,
    call: "PASS — matchup redirect",
    confidence: "Medium",
    whyNow,
    edge,
    callType: "prop",
    analysis: {
      matchupAnalysis: `Focused on ${matchupLabel} only — ${playerName} is outside this game's verified player pool.`,
      injuryContext: "No relevant injuries for this redirect.",
      marketContext: "Use posted lines for players listed in tonight's roster strings for this matchup.",
      lineMovement: "Line stable; no sharp movement on the redirect pivot.",
      statisticalEdge: "Limited sample — pivot uses verified stats for in-matchup players only.",
    },
    caveats: ["Confirm tonight's slate and starters before locking any play."],
    parlayLegs: null,
    parlayTotalOdds: null,
    sport: "NBA",
    timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, ".000Z"),
  };

  const repaired = repairStructuredForDelivery(raw, "nba");
  repaired.lean = sanitizeLeanBroTone(repaired.lean);
  return repaired;
}
