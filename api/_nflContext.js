import RBs from "./nfl-rb.js";
import WRsAndTEs from "./nfl-wr-te.js";
import { QBs } from "./nfl-players.js";
import { defenses } from "./nfl-defense.js";
import { getDurableJson } from "./_durableStore.js";
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import {
  buildNflDraftBoardBlock,
  getActiveDraftBundle,
  getNflDraftMeta,
  getNflTeamAbbrFromName,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";
import { formatPropContextForPlayers } from "./_nflPropLineContext.js";
import { buildNflClayPromptSlice } from "./_nflClayProjections.js";
import { buildNflAskBriefcaseHealth } from "./_nflAskBriefcase.js";
import { buildNflMatchupCard } from "./_nflMatchupCard.js";
import {
  fetchNflEspnInjurySnapshot,
  formatNflAvailabilityPromptBlock,
  pickNflAvailabilityForQuestion,
} from "./_nflEspnInjuries.js";
import { fetchNflEspnInactivesSnapshot } from "./_nflEspnInactives.js";
import { formatNflInactivesPromptBlock } from "../shared/nflEspnInactives.js";
import { NFL_STADIUM_META } from "./_nflStadiumMeta.js";
import { shouldSkipNflLiveBoardForAsk } from "./_nflAskBoardPolicy.js";
import { formatNflGameStateLine } from "../shared/nflGameState.js";
import { buildNflLiveBoard } from "./_nflBoard.js";
import { buildNflAskDisciplinePromptBlock } from "../shared/nflAskDiscipline.js";
import { mergeNflDefenseMaps } from "../shared/nflBdlDefenseNormalize.js";
import { formatNflRostersPromptBlock } from "../shared/formatLeagueRostersPrompt.js";
import { inferNflSeasonYear } from "../shared/bdlSeasonDefaults.js";
import { trimNflPlayerPropsForAsk } from "../shared/nflAskPropTrim.js";
import { isNflScopedPropFastPath } from "../shared/nflAskFastPath.js";

export { NFL_STADIUM_META };

/** Hard ceiling for `promptContext` text sent with UR Take (Anthropic payload budget). */
export const NFL_PROMPT_CONTEXT_BUDGET_CHARS = 20000;

/**
 * Extract player names already present in assembled NFL prompt text.
 * @param {string} promptText
 * @returns {string[]}
 */
export function extractNflPlayerNamesFromPromptText(promptText) {
  const names = new Set();
  const text = String(promptText || "");

  const pipeRe = /^([^\n|]{2,})\s+\|\s+(RB|WR|TE|QB)\s+\|/gm;
  let match;
  while ((match = pipeRe.exec(text))) {
    const name = String(match[1] || "").trim();
    if (name) names.add(name);
  }

  const dbRe =
    /^([A-Z][a-zA-Z'.-]+(?:\s+(?:Jr\.|Sr\.|[A-Z][a-zA-Z'.-]+)){0,3})\s+\([A-Z]{2,4}/gm;
  while ((match = dbRe.exec(text))) {
    const name = String(match[1] || "").trim();
    if (name) names.add(name);
  }

  return [...names];
}

/** BallDontLie is not used for NFL game-by-game logs in this stack — no NBA-style recentGames sort path here. */

/**
 * @param {string} abbr
 * @returns {string[]}
 */
function nflAbbrAliasKeys(abbr) {
  const a = String(abbr || "")
    .toUpperCase()
    .trim();
  if (!a) return [];
  if (a === "WSH") return ["WAS", "WSH"];
  if (a === "WAS") return ["WAS", "WSH"];
  if (a === "ARI" || a === "ARZ") return ["ARI", "ARZ"];
  return [a];
}

/**
 * @param {Set<string>} scope
 * @param {string} teamFromRow
 */
function scopeMatchesTeam(scope, teamFromRow) {
  if (!scope || scope.size === 0) return true;
  const t = String(teamFromRow || "")
    .toUpperCase()
    .trim();
  if (!t) return false;
  for (const s of scope) {
    for (const k of nflAbbrAliasKeys(s)) {
      if (t === k) return true;
    }
  }
  return false;
}

/**
 * Resolve 1–2 NFL team abbreviations from question text + optional matchup card (NBA-style scope).
 * Empty set ⇒ league-wide prompts use compact injections (token budget).
 * @param {string} question
 * @param {object | null | undefined} matchupContext
 * @returns {Set<string>}
 */
export function resolveNflScopeTeamAbbrevSet(question, matchupContext = null) {
  const set = new Set();
  const q = String(question || "").trim();

  try {
    const hint = detectNflTeamHint(q);
    if (hint) set.add(String(hint).toUpperCase());
  } catch {
    /* ignore */
  }

  const focusFullName = resolveNflTeamFromQuestion(q);
  if (focusFullName) {
    const ab = getNflTeamAbbrFromName(focusFullName);
    if (ab) set.add(ab);
  }

  const qUpper = q.toUpperCase();
  const pair = qUpper.match(/\b([A-Z]{2,4})\s*(?:@|VS\.?|V\.?)\s*([A-Z]{2,4})\b/);
  if (pair) {
    set.add(pair[1]);
    set.add(pair[2]);
  }

  const leagueStr = String(matchupContext?.league || "").toUpperCase();
  if (matchupContext && leagueStr.includes("NFL")) {
    const raw = matchupContext.raw || {};
    const ha = String(raw.homeTeam?.abbr || raw.home_abbr || "").toUpperCase();
    const aa = String(raw.awayTeam?.abbr || raw.away_abbr || "").toUpperCase();
    if (ha && /^[A-Z]{2,4}$/.test(ha)) set.add(ha);
    if (aa && /^[A-Z]{2,4}$/.test(aa)) set.add(aa);
  }

  if (set.size > 2) return new Set();
  return set;
}

function filterObjectEntriesByTeam(entries, scope) {
  if (!scope || scope.size === 0) return entries;
  return entries.filter(([, p]) => scopeMatchesTeam(scope, p?.team));
}

function filterDefensesMap(scope, defenseMap = defenses) {
  const source = defenseMap && typeof defenseMap === "object" ? defenseMap : defenses;
  if (!scope || scope.size === 0) return source;
  const out = {};
  for (const abbr of Object.keys(source)) {
    let hit = false;
    for (const s of scope) {
      if (nflAbbrAliasKeys(s).includes(abbr)) hit = true;
    }
    if (hit) out[abbr] = source[abbr];
  }
  return out;
}

/**
 * @param {Array<Record<string, unknown>>} primary
 * @param {Array<Record<string, unknown>>} secondary
 */
function mergeInjuryRows(primary, secondary) {
  /** @type {Map<string, Record<string, unknown>>} */
  const map = new Map();
  for (const row of [...(secondary || []), ...(primary || [])]) {
    const key = String(row.player || row.name || "")
      .toLowerCase()
      .trim();
    if (!key) continue;
    map.set(key, row);
  }
  return [...map.values()];
}

function filterDepthByScope(depthObj, scope) {
  if (!depthObj || typeof depthObj !== "object") return depthObj;
  if (!scope || scope.size === 0) return depthObj;
  const out = {};
  for (const [teamKey, row] of Object.entries(depthObj)) {
    let hit = false;
    for (const s of scope) {
      if (nflAbbrAliasKeys(s).includes(teamKey)) hit = true;
    }
    if (hit) out[teamKey] = row;
  }
  return out;
}

function toNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function mapWrTeToUi(name, player) {
  const rec = player?.rec2025 || {};
  return [
    name,
    {
      pos: player?.pos || "WR",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: toNumber(rec.ydsPg),
      rec2025: {
        g: toNumber(rec.g),
        td: toNumber(rec.td),
        ypr: toNumber(rec.ypr),
        tgt: rec.tgt != null ? toNumber(rec.tgt) : null,
        recPg: rec.recPg != null ? toNumber(rec.recPg) : null,
      },
      props: player?.props || {},
      situation: player?.situation2026 || player?.situation || "Role context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "wr_te_db",
    },
  ];
}

function mapRbToUi(name, player) {
  const rush = player?.rush2025 || {};
  const rushYds = player?.props?.rushYds || null;
  return [
    name,
    {
      pos: "RB",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: toNumber(rush.ydsPg),
      rec2025: {
        g: toNumber(rush.g),
        td: toNumber(rush.td),
        ypr: toNumber(rush.ypa), // Kept for existing UI slot.
        tgt: null,
        recPg: null,
      },
      props: {
        recYds: rushYds
          ? {
              floor: rushYds.floor,
              ceil: rushYds.ceil,
              lean: rushYds.lean,
            }
          : null,
        td: player?.props?.td || null,
      },
      situation: player?.situation2026 || "Role context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "rb_db",
    },
  ];
}

function mapQbToUi(name, player) {
  const stats = player?.stats2025 || player?.stats2024 || {};
  const games = Math.max(1, toNumber(stats.games, 17));
  const passYdsPg = Math.round((toNumber(stats.yds) / games) * 10) / 10;
  const seasonLabel = player?.stats2025 ? "2025" : "2024 prior";

  return [
    name,
    {
      pos: "QB",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: passYdsPg,
      rec2025: {
        g: toNumber(stats.games, 17),
        td: toNumber(stats.td),
        ypr: toNumber(stats.ypa),
        tgt: null,
        recPg: null,
      },
      props: {
        recYds: {
          floor: Math.max(140, Math.round(passYdsPg - 35)),
          ceil: Math.round(passYdsPg + 45),
          lean: `Use ${seasonLabel} + 2026 market pace + matchup for pass-yardage lean.`,
        },
        td: {
          lean: `${toNumber(stats.td)} passing TD (${seasonLabel}) — cross-check season O/U when present.`,
        },
      },
      situation: player?.situation2025 || "QB context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "qb_db",
    },
  ];
}

function isUnconfirmedStarter(player) {
  const blob = `${player?.tier || ""} ${player?.situation || ""}`;
  return /UNCONFIRMED|placeholder|unsettled/i.test(blob);
}

function buildPromptContext(uiPlayers) {
  const lines = Object.entries(uiPlayers)
    .map(([name, p]) => {
      const stats = p.rec2025 || {};
      const tdLean = p?.props?.td?.lean || "—";
      const yLean = p?.props?.recYds?.lean || p?.props?.rushYds?.lean || "—";
      const unsettled = isUnconfirmedStarter(p);
      const core = unsettled
        ? `${name} | ${p.pos} | ${p.team} | UNCONFIRMED — not a locked starter`
        : `${name} | ${p.pos} | ${p.team} | ${p.tier}`;
      const statLine = `  Stats: ${p.ydsPg} yds/g, ${stats.td ?? 0} TD, ${stats.g ?? 0}g`;
      const leanLine = `  Lean: ${yLean} | TD: ${tdLean}`;
      const sit = unsettled && p.situation
        ? `  Situation: ${String(p.situation).slice(0, 220)}`
        : "";
      return [core, statLine, leanLine, sit].filter(Boolean).join("\n");
    })
    .join("\n\n");

  return lines;
}

/**
 * Compact live board so "tonight's slate" asks cannot claim games are missing.
 * @param {Array<Record<string, unknown>>} games
 */
function formatLiveSlatePrompt(games) {
  if (!Array.isArray(games) || !games.length) return "";
  const lines = games.slice(0, 16).map((g) => {
    const spread = g?.spread?.displayLine ? ` · ${g.spread.displayLine}` : "";
    const tot = g?.total?.line != null ? ` · tot ${g.total.line}` : "";
    const state = formatNflGameStateLine(g);
    return `${g.awayAbbr || "?"} @ ${g.homeAbbr || "?"} · ${state}${spread}${tot}`;
  });
  const kind = games[0]?.seasonType || games[0]?.season_type || "unk";
  return (
    `\n\nNFL SLATE (${games.length} games, ${kind}) — each row has GAME STATE (pregame / LIVE / final).\n` +
    `Write to that state. Pregame = who's in, the number. LIVE = still on it / what changed. Final = grade, don't talk like kickoff is ahead.\n` +
    `Do not use live language on a pregame row. Do not use "who's dressing" as if kickoff hasn't happened when the row says LIVE.\n` +
    `Posted favorite/total are authoritative. If you fade a favorite, keep their number (CIN -6.5 too big → DET +6.5). Never invert a posted line into the other team as favorite.\n` +
    lines.join("\n")
  );
}

function formatRbDatabasePrompt(rbMap) {
  const lines = Object.entries(rbMap || {}).map(([name, p]) => {
    const s = p.stats2025 || {};
    const r = p.rush2025 || {};
    const carries = s.carries ?? r.att ?? "n/a";
    const yards = s.yards ?? r.yds ?? "n/a";
    const tds = s.tds ?? r.td ?? "n/a";
    return `${name} (${p.team}): ${carries} car, ${yards} yds, ${tds} TDs | Tier: ${p.tier}`;
  });
  return (
    "\n\n2025 SEASON RB DATABASE (trend context — not current season):\n" + lines.join("\n")
  );
}

function formatWrTeDatabasePrompt(wrMap) {
  const lines = Object.entries(wrMap || {}).map(([name, p]) => {
    const s = p.stats2025 || {};
    const r = p.rec2025 || {};
    const rec = s.rec ?? r.rec ?? "n/a";
    const yds = s.yds ?? r.yds ?? "n/a";
    const td = s.td ?? r.td ?? "n/a";
    return `${name} (${p.team}, ${p.pos || "WR"}): ${rec} rec, ${yds} yds, ${td} TDs | Tier: ${p.tier}`;
  });
  return (
    "\n\n2025 SEASON WR/TE DATABASE (trend context — not current season):\n" + lines.join("\n")
  );
}

/**
 * @param {Record<string, Record<string, unknown>>} defensesMap
 * @param {{ label?: string }} [opts]
 */
function formatDefensePrompt(defensesMap, opts = {}) {
  const label = opts.label || "prior season static";
  const lines = Object.entries(defensesMap || {}).map(
    ([abbr, d]) =>
      `${abbr} (${d.tier}): ${d.overall?.ptsAllowed ?? "?"} pts/g | Pass rank ${d.pass?.rank ?? "?"} | Rush rank ${d.rush?.rank ?? "?"} | ${d.propImpact?.qb || ""}`,
  );
  return `\n\nNFL DEFENSE TENDENCIES (${label}):\n` + lines.join("\n");
}

/** Short defense lines — league-wide mode without long propImpact strings (token budget). */
function formatDefensePromptCompact(defensesMap, opts = {}) {
  const label = opts.label || "prior season static — compact";
  const lines = Object.entries(defensesMap || {}).map(
    ([abbr, d]) =>
      `${abbr} (${d.tier}): ${d.overall?.ptsAllowed ?? "?"} pts/g | pass rank ${d.pass?.rank ?? "?"} | rush rank ${d.rush?.rank ?? "?"}`,
  );
  return `\n\nNFL DEFENSE TENDENCIES (${label}):\n` + lines.join("\n");
}

/**
 * @param {object} options
 * @param {string} [options.question]
 * @param {object | null} [options.matchupContext]
 * @param {Set<string>|string[]|null} [options.scopeTeamAbbrs]
 */
export async function buildCanonicalNflContext(options = {}) {
  const { question = "", matchupContext = null, scopeTeamAbbrs = null, forceFull = false } = options;

  if (!forceFull && isNflScopedPropFastPath(question)) {
    const { buildNflFastAskContext } = await import("./_nflContextFast.js");
    const fast = await buildNflFastAskContext({ question, matchupContext });
    if (fast) return fast;
  }

  let scope = resolveNflScopeTeamAbbrevSet(question, matchupContext);
  if (scopeTeamAbbrs instanceof Set && scopeTeamAbbrs.size > 0 && scopeTeamAbbrs.size <= 2) {
    scope = scopeTeamAbbrs;
  } else if (Array.isArray(scopeTeamAbbrs) && scopeTeamAbbrs.length > 0 && scopeTeamAbbrs.length <= 2) {
    scope = new Set(scopeTeamAbbrs.map((x) => String(x || "").toUpperCase()));
  }
  if (scope.size > 2) scope = new Set();

  const scoped = Boolean(scope && scope.size > 0 && scope.size <= 2);
  const leagueCompact = !scoped;

  let wrteEntries = Object.entries(WRsAndTEs || {}).map(([name, player]) => mapWrTeToUi(name, player));
  let rbEntries = Object.entries(RBs || {}).map(([name, player]) => mapRbToUi(name, player));
  let qbEntries = Object.entries(QBs || {}).map(([name, player]) => mapQbToUi(name, player));

  if (scoped) {
    wrteEntries = filterObjectEntriesByTeam(wrteEntries, scope);
    rbEntries = filterObjectEntriesByTeam(rbEntries, scope);
    qbEntries = filterObjectEntriesByTeam(qbEntries, scope);
  }

  const uiPlayers = Object.fromEntries([...wrteEntries, ...rbEntries, ...qbEntries]);
  const draftBundle = getActiveDraftBundle();
  const draftMeta = getNflDraftMeta(new Date(), draftBundle);
  const draftBlock =
    scoped && !/\bdraft\b|\bprospect\b|\brookie class\b/i.test(question)
      ? ""
      : buildNflDraftBoardBlock(draftMeta, draftBundle);
  const nflRosterVerificationBanner =
    `NOTE: Verified NFL rosters (${inferNflSeasonYear()} season) from BallDontLie GOAT + ESPN snapshot. Static QB/RB/WR notes below are usage/stats baselines only — resolve player-team from verified roster blocks when they conflict.`;
  let promptContext = [nflRosterVerificationBanner, buildPromptContext(uiPlayers), draftBlock]
    .filter(Boolean)
    .join("\n\n---\n\n");

  const depthData = await getDurableJson("nfl_depth_chart");
  const depthFiltered =
    depthData?.depth && scoped ? filterDepthByScope(depthData.depth, scope) : depthData?.depth;

  if (depthFiltered && typeof depthFiltered === "object" && Object.keys(depthFiltered).length > 0) {
    promptContext +=
      "\n\nDEPTH CHARTS (Ourlads, updated weekly):\n" +
      Object.entries(depthFiltered)
        .map(([team, d]) => `${team}: QB1 ${d.qb1 || "n/a"} | QB2 ${d.qb2 || "n/a"} | QB3 ${d.qb3 || "n/a"}`)
        .join("\n");
  } else if (depthData?.depth && leagueCompact) {
    promptContext +=
      "\n\nDepth charts (Ourlads): omitted in league mode — ask with a team or matchup for QB1–QB3.";
  }

  const unconfirmedQbs = qbEntries.filter(([, p]) => isUnconfirmedStarter(p));
  if (unconfirmedQbs.length) {
    promptContext +=
      "\n\nQB STARTER HARD STOP:\n" +
      unconfirmedQbs
        .map(
          ([name, p]) =>
            `${p.team} passer is UNSETTLED. ${name} is a placeholder — do not treat them as locked QB1 or build script around them.`,
        )
        .join("\n");
  }

  const skipLiveBoard = shouldSkipNflLiveBoardForAsk(question);
  /** @type {Record<string, unknown>|null} */
  let liveBoard = null;
  if (!skipLiveBoard) {
    try {
      liveBoard = await buildNflLiveBoard({
        includeProps: true,
        maxPropGames: scoped ? 1 : 4,
        scopeAbbrs: scoped ? scope : undefined,
      });
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nfl_context_board_failed",
          error: err?.message || String(err),
        }),
      );
    }
  }

  const rosterData = await getDurableJson("nfl_espn_roster");
  const espnInjSnap = await fetchNflEspnInjurySnapshot();
  let espnInactives = { games: [], fetchedAt: Date.now(), asOf: Date.now(), source: "skip", postedCount: 0 };
  if (!skipLiveBoard) {
    try {
      espnInactives = await fetchNflEspnInactivesSnapshot({
        maxGames: scoped ? 4 : 6,
        scopeAbbrs: scoped ? scope : null,
        liveBoardGames: liveBoard?.games || [],
      });
    } catch (err) {
      console.warn(
        JSON.stringify({
          event: "nfl_context_inactives_failed",
          error: err?.message || String(err),
        }),
      );
    }
  }

  /** @type {Array<Record<string, unknown>>} */
  const espnInjuryRows = [];
  for (const row of espnInjSnap.rows || []) {
    const status = String(row.status || "");
    const part = String(row.participation || "unknown");
    if (/^active$/i.test(status) && part === "unknown") continue;
    if (scoped && row.team && !scopeMatchesTeam(scope, row.team)) continue;
    espnInjuryRows.push(row);
  }
  if (rosterData?.players?.length) {
    for (const p of rosterData.players) {
      if (!p?.injuryStatus || p.injuryStatus === "Active" || p.structuralImpact === false) continue;
      if (scoped && !scopeMatchesTeam(scope, p.team)) continue;
      espnInjuryRows.push({
        player: p.name,
        team: p.team,
        position: p.position,
        status: p.injuryStatus,
        source: "espn_roster",
      });
    }
  }

  const briefcaseHealth = await buildNflAskBriefcaseHealth({
    question,
    depth: depthFiltered || depthData?.depth || null,
    espnRosterPlayers: rosterData?.players || [],
    injuries: espnInjuryRows,
    uiPlayers,
    includeLiveBoard: false,
    board: liveBoard,
    maxPropGames: scoped ? 1 : 4,
    scopeAbbrs: scoped ? scope : undefined,
  });

  const trimmedPropLines = trimNflPlayerPropsForAsk(
    liveBoard?.propLines || briefcaseHealth.briefcase?.slate?.playerProps || [],
    { scope: scoped ? scope : [], question, maxRows: scoped ? 56 : 120 },
  );
  if (liveBoard && Array.isArray(liveBoard.propLines)) {
    liveBoard.propLines = trimmedPropLines;
  }
  if (briefcaseHealth.briefcase?.slate) {
    briefcaseHealth.briefcase.slate.playerProps = trimmedPropLines;
  }

  const liveDefense = briefcaseHealth.briefcase?.league?.teamDefense || {};
  const defenseMerged = mergeNflDefenseMaps(liveDefense, defenses);
  const defenseIsLive = Object.keys(liveDefense).length >= 20;
  const defenseLabel = defenseIsLive
    ? "live season ranks (opp yards/pts allowed)"
    : "2025 season static prior";

  if (scoped) {
    const rbMap = Object.fromEntries(filterObjectEntriesByTeam(Object.entries(RBs || {}), scope));
    const wrMap = Object.fromEntries(filterObjectEntriesByTeam(Object.entries(WRsAndTEs || {}), scope));
    promptContext += formatRbDatabasePrompt(rbMap);
    promptContext += formatWrTeDatabasePrompt(wrMap);
    promptContext += formatDefensePrompt(filterDefensesMap(scope, defenseMerged), {
      label: defenseLabel,
    });
  } else {
    promptContext +=
      "\n\nLeague mode: RB/WR duplicate rows omitted — ask with a team/matchup for full positional + coaching slices.";
    promptContext += formatDefensePromptCompact(defenseMerged, {
      label: `${defenseLabel} — compact`,
    });
  }

  if (!leagueCompact && rosterData?.coaches && typeof rosterData.coaches === "object") {
    let coachEntries = Object.entries(rosterData.coaches);
    if (scoped) {
      coachEntries = coachEntries.filter(([team]) => {
        for (const s of scope) {
          if (nflAbbrAliasKeys(s).includes(team)) return true;
        }
        return false;
      });
    }
    if (coachEntries.length) {
      const coachLines = coachEntries
        .map(([team, c]) => `${team}: HC ${c.hc || "n/a"} | OC ${c.oc || "n/a"} | DC ${c.dc || "n/a"}`)
        .join("\n");
      promptContext += "\n\nNFL COACHING STAFF (current per ESPN):\n" + coachLines;
    }
  }

  const goatInjuries = Array.isArray(briefcaseHealth.briefcase?.league?.injuries)
    ? briefcaseHealth.briefcase.league.injuries
    : [];
  /** Prefer live injury pocket when filled; else ESPN structural list. */
  const injuryRows = goatInjuries.length
    ? mergeInjuryRows(goatInjuries, espnInjuryRows)
    : espnInjuryRows;

  if (injuryRows.length) {
    const injCap = leagueCompact ? 12 : 40;
    const injured = injuryRows
      .filter((p) => !/^active$/i.test(String(p.status || "")))
      .map((p) => `${p.player || p.name} (${p.team || "?"}, ${p.position || "?"}): ${p.status || "?"}`)
      .slice(0, injCap);
    if (injured.length) {
      promptContext += "\n\nNFL INJURY REPORT (updated):\n" + injured.join("\n");
    }
  }

  const homeFromMatchup = (() => {
    const raw = matchupContext?.raw || {};
    const ha = String(raw.homeTeam?.abbr || raw.home_abbr || "").toUpperCase();
    return /^[A-Z]{2,4}$/.test(ha) ? ha : null;
  })();
  const matchupCard = buildNflMatchupCard({
    question,
    scopeTeams: scope,
    homeAbbr: homeFromMatchup,
    games: liveBoard?.games || briefcaseHealth.briefcase?.slate?.games || [],
    propLines: trimmedPropLines,
    injuries: injuryRows,
    depth: depthFiltered || depthData?.depth || null,
    injuryMeta: {
      fetchedAt: rosterData?.fetchedAt ?? null,
      asOf: liveBoard?.asOf || briefcaseHealth.briefcase?.asOf || null,
    },
    defenseByTeam: defenseMerged,
    recentStats: briefcaseHealth.briefcase?.players?.recentStats || [],
  });
  const cardOnly =
    String(matchupCard.cardBlock || "").trim() ||
    (matchupCard.promptBlock && !String(matchupCard.promptBlock).includes("NFL ASK DISCIPLINE")
      ? String(matchupCard.promptBlock).trim()
      : "");
  if (cardOnly) {
    promptContext += `\n\n${cardOnly}`;
  }

  // ── PROP LINE CONTEXT (season O/Us — before budget trim) ────────
  const propPlayerNames = extractNflPlayerNamesFromPromptText(promptContext);
  const propSlice = formatPropContextForPlayers(propPlayerNames, 4);
  if (propSlice) {
    promptContext += propSlice;
  }

  // ── CLAY VOLUME PRIORS (usage baseline vs Vegas — not fantasy ranks) ──
  try {
    const clay = await buildNflClayPromptSlice(question, propPlayerNames);
    if (clay.block) promptContext += clay.block;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "nfl_context_clay_failed",
        error: err?.message || String(err),
      }),
    );
  }

  if (briefcaseHealth.promptBlock) {
    promptContext += `\n\n${briefcaseHealth.promptBlock}`;
  }

  const liveRosters = briefcaseHealth.briefcase?.league?.rostersByTeam;
  const rosterTeamCount = liveRosters ? Object.keys(liveRosters).length : 0;
  if (rosterTeamCount > 0) {
    const rosterBlock = formatNflRostersPromptBlock(liveRosters, {
      scopeAbbrs: scoped ? scope : undefined,
      maxTeams: scoped ? 2 : Math.min(rosterTeamCount, 32),
      maxPlayersPerTeam: scoped ? 32 : 22,
      label: `NFL VERIFIED ROSTERS (${briefcaseHealth.briefcase?.season || inferNflSeasonYear()} season — BDL + ESPN)`,
    });
    if (rosterBlock) promptContext += `\n\n${rosterBlock}`;
  }

  if (skipLiveBoard) {
    promptContext +=
      "\n\nNFL BOARD SKIP: draft/futures/predictor ask — live props not hydrated (latency). Use structural + season context.";
  }

  // Discipline always last so trim cannot drop anti-blur / NEXT.
  const disciplineProtect =
    String(matchupCard.disciplineBlock || "").trim() ||
    buildNflAskDisciplinePromptBlock({
      question,
      marketId: matchupCard.marketId || undefined,
      phase: matchupCard.phase || undefined,
      hasLiveLine: Boolean(liveBoard?.propLines?.length || liveBoard?.games?.length),
      injuryFlag: injuryRows.length > 0 || Boolean(matchupCard.injuryLine),
      ambiguousPlayer: matchupCard.ambiguous
        ? (matchupCard.candidates || []).join(" / ")
        : null,
    });
  const slateTail =
    Array.isArray(liveBoard?.games) && liveBoard.games.length
      ? formatLiveSlatePrompt(liveBoard.games)
      : "";
  const extraNames = (matchupCard.namedIdentities || []).map((p) => p.name);
  let availHits = pickNflAvailabilityForQuestion(espnInjSnap.rows || [], question, extraNames);
  if (
    !availHits.length &&
    /\b(dress(?:ing)?|sit(?:ting)?|starters?|inactive|one series|yanked|preseason)\b/i.test(question)
  ) {
    availHits = (espnInjSnap.rows || [])
      .filter((r) => {
        const part = String(r.participation || "");
        if (part !== "play" && part !== "sit" && part !== "limited") return false;
        if (!scoped || !r.team) return true;
        return scopeMatchesTeam(scope, r.team);
      })
      .slice(0, 10);
  }
  const availTail = `\n\n${formatNflAvailabilityPromptBlock(availHits, {
    asOf: espnInjSnap.fetchedAt,
    source: espnInjSnap.source,
  })}`;
  const inactivesTail = `\n\n${formatNflInactivesPromptBlock(espnInactives, {
    scopeAbbrs: scoped ? scope : [],
  })}`;
  const disciplineTail = `${slateTail}${availTail}${inactivesTail}\n\n${disciplineProtect}`;

  if (promptContext.length + disciplineTail.length > NFL_PROMPT_CONTEXT_BUDGET_CHARS) {
    const suffix =
      "\n\n[NFL context truncated to token budget — narrow the question to a team or matchup.]";
    const room = Math.max(
      0,
      NFL_PROMPT_CONTEXT_BUDGET_CHARS - suffix.length - disciplineTail.length,
    );
    const body =
      promptContext.length > room ? `${promptContext.slice(0, room)}` : promptContext;
    promptContext = `${body}${suffix}${disciplineTail}`;
  } else {
    promptContext += disciplineTail;
  }

  return {
    uiPlayers,
    promptContext,
    briefcase: {
      grade: briefcaseHealth.interaction?.grade || null,
      smooth: briefcaseHealth.interaction?.smooth ?? null,
      marketId: briefcaseHealth.interaction?.detected?.marketId || null,
      detected: briefcaseHealth.interaction?.detected || null,
      propMatch: briefcaseHealth.interaction?.propMatch || null,
      forcePass: Boolean(briefcaseHealth.interaction?.forcePass),
      eliteReady: briefcaseHealth.interaction?.eliteReady ?? null,
      requiredPct: briefcaseHealth.interaction?.requiredPct ?? null,
      propCatalog: briefcaseHealth.propCatalog || null,
      promptBlock: briefcaseHealth.promptBlock || "",
    },
    propLines: trimmedPropLines,
    draft: {
      ...draftMeta,
      bundleYear: draftBundle.year,
      fullOrderCount: Array.isArray(draftBundle.fullOrder) ? draftBundle.fullOrder.length : 0,
      teamNeeds: draftBundle.teamNeeds || {},
      prospects: Array.isArray(draftBundle.prospects) ? draftBundle.prospects : [],
      boardLocation: draftBundle?.event?.location || null,
    },
    meta: {
      totalPlayers: Object.keys(uiPlayers).length,
      wrteCount: wrteEntries.length,
      rbCount: rbEntries.length,
      qbCount: qbEntries.length,
      generatedAt: new Date().toISOString(),
      nflDraftPhase: draftMeta.phase,
      nflPromptContextChars: promptContext.length,
      nflPromptScopeMode: scoped ? `scoped:${[...scope].sort().join("+")}` : "league_compact",
      briefcaseGrade: briefcaseHealth.interaction?.grade || null,
      briefcaseSmooth: briefcaseHealth.interaction?.smooth ?? null,
      briefcaseMarketId: briefcaseHealth.interaction?.detected?.marketId || null,
      matchupPlayer: matchupCard.player?.name || null,
      matchupOpponent: matchupCard.opponent || null,
      matchupThesis: matchupCard.thesis || null,
      skipLiveBoard,
    },
    games: Array.isArray(liveBoard?.games) ? liveBoard.games : [],
    inactives: {
      postedCount: espnInactives.postedCount ?? (espnInactives.games || []).filter((g) => g.posted).length,
      asOf: espnInactives.asOf || espnInactives.fetchedAt || null,
      source: espnInactives.source || null,
      games: Array.isArray(espnInactives.games) ? espnInactives.games : [],
    },
    matchup: {
      thesis: matchupCard.thesis || "",
      player: matchupCard.player || null,
      opponent: matchupCard.opponent || null,
      homeAbbr: matchupCard.homeAbbr || null,
      defenseTier: matchupCard.defenseTier || null,
      liveLine: matchupCard.liveLine
        ? {
            prop: matchupCard.liveLine.prop || matchupCard.liveLine.propRaw || null,
            line: matchupCard.liveLine.line ?? null,
            book: matchupCard.liveLine.book || null,
          }
        : null,
      injuryFlag: Boolean(matchupCard.injuryLine),
      promptBlock: matchupCard.promptBlock || "",
      namedIdentities: matchupCard.namedIdentities || [],
    },
    dataFreshness: {
      qbDataSeason: "2024_prior_plus_2026_market_pace",
      rbDataSeason: "2025",
      wrTeDataSeason: "2025",
      lastVerified: "2026-03-30",
      isCurrentSeason: false,
      warning:
        "QB prior box scores are 2024; matchup cards also use May 2026 season O/U market pace. RB/WR baselines are 2025. Roster/depth from Ourlads + ESPN injuries.",
      briefcase: {
        grade: briefcaseHealth.interaction?.grade || null,
        smooth: briefcaseHealth.interaction?.smooth ?? null,
        marketId: briefcaseHealth.interaction?.detected?.marketId || null,
        eliteReady: briefcaseHealth.interaction?.eliteReady ?? null,
        guidance: briefcaseHealth.interaction?.guidance || null,
      },
      matchupThesis: matchupCard.thesis || null,
      skipLiveBoard,
      inactivesPosted: Boolean(
        (espnInactives.games || []).some((g) => g.posted && (g.players || []).length),
      ),
      defenseSource: defenseIsLive ? "live_team_season_stats" : "static_2025",
      defenseTeamCount: Object.keys(defenseMerged).length,
      nflDraft: {
        phase: draftMeta.phase,
        draftClassYear: draftMeta.draftYear,
        nextClassYearPending: draftMeta.nextClassYearPending || null,
        roundOneBoardSource: draftMeta.roundOneBoardSource,
        officialRoundOnePicksLoaded: draftMeta.officialRoundOneCount > 0,
        bundleWarning: draftMeta.bundleWarning || null,
      },
    },
  };
}
