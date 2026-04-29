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

/** Hard ceiling for `promptContext` text sent with UR Take (Anthropic payload budget). */
export const NFL_PROMPT_CONTEXT_BUDGET_CHARS = 20000;

// WEATHER RULE: Always use home team's stadium coords.
// Never use away team. Never use neutral site.
// If domed === true, skip weather evaluation entirely regardless of conditions.
export const NFL_STADIUM_META = {
  ARI: { lat: 33.5277, lon: -112.2626, domed: true, stadium: "State Farm Stadium" },
  ATL: { lat: 33.7553, lon: -84.4006, domed: true, stadium: "Mercedes-Benz Stadium" },
  BAL: { lat: 39.278, lon: -76.6227, domed: false, stadium: "M&T Bank Stadium" },
  BUF: { lat: 42.7738, lon: -78.787, domed: false, stadium: "Highmark Stadium" },
  CAR: { lat: 35.2258, lon: -80.8528, domed: false, stadium: "Bank of America Stadium" },
  CHI: { lat: 41.8623, lon: -87.6167, domed: false, stadium: "Soldier Field" },
  CIN: { lat: 39.0955, lon: -84.516, domed: false, stadium: "Paycor Stadium" },
  CLE: { lat: 41.5061, lon: -81.6995, domed: false, stadium: "Cleveland Browns Stadium" },
  DAL: { lat: 32.748, lon: -97.093, domed: true, stadium: "AT&T Stadium" },
  DEN: { lat: 39.7439, lon: -105.0201, domed: false, stadium: "Empower Field" },
  DET: { lat: 42.34, lon: -83.0456, domed: true, stadium: "Ford Field" },
  GB: { lat: 44.5013, lon: -88.0622, domed: false, stadium: "Lambeau Field" },
  HOU: { lat: 29.6847, lon: -95.4107, domed: true, stadium: "NRG Stadium" },
  IND: { lat: 39.7601, lon: -86.1639, domed: true, stadium: "Lucas Oil Stadium" },
  JAX: { lat: 30.3239, lon: -81.6373, domed: false, stadium: "EverBank Stadium" },
  KC: { lat: 39.0489, lon: -94.4839, domed: false, stadium: "GEHA Field" },
  LAC: { lat: 33.9535, lon: -118.3392, domed: true, stadium: "SoFi Stadium" },
  LAR: { lat: 33.9535, lon: -118.3392, domed: true, stadium: "SoFi Stadium" },
  LV: { lat: 36.0909, lon: -115.1833, domed: true, stadium: "Allegiant Stadium" },
  MIA: { lat: 25.958, lon: -80.2389, domed: false, stadium: "Hard Rock Stadium" },
  MIN: { lat: 44.9737, lon: -93.2577, domed: true, stadium: "U.S. Bank Stadium" },
  NE: { lat: 42.0909, lon: -71.2643, domed: false, stadium: "Gillette Stadium" },
  NO: { lat: 29.9511, lon: -90.0812, domed: true, stadium: "Caesars Superdome" },
  NYG: { lat: 40.8135, lon: -74.0745, domed: false, stadium: "MetLife Stadium" },
  NYJ: { lat: 40.8135, lon: -74.0745, domed: false, stadium: "MetLife Stadium" },
  PHI: { lat: 39.9008, lon: -75.1675, domed: false, stadium: "Lincoln Financial Field" },
  PIT: { lat: 40.4468, lon: -80.0158, domed: false, stadium: "Acrisure Stadium" },
  SEA: { lat: 47.5952, lon: -122.3316, domed: false, stadium: "Lumen Field" },
  SF: { lat: 37.4033, lon: -121.9694, domed: false, stadium: "Levi's Stadium" },
  TB: { lat: 27.9759, lon: -82.5033, domed: false, stadium: "Raymond James Stadium" },
  TEN: { lat: 36.1665, lon: -86.7713, domed: false, stadium: "Nissan Stadium" },
  WAS: { lat: 38.9076, lon: -76.8645, domed: false, stadium: "Northwest Stadium" },
};

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

function filterDefensesMap(scope) {
  if (!scope || scope.size === 0) return defenses;
  const out = {};
  for (const abbr of Object.keys(defenses)) {
    let hit = false;
    for (const s of scope) {
      if (nflAbbrAliasKeys(s).includes(abbr)) hit = true;
    }
    if (hit) out[abbr] = defenses[abbr];
  }
  return out;
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
  const stats = player?.stats2024 || {};
  const games = Math.max(1, toNumber(stats.games, 17));
  const passYdsPg = Math.round((toNumber(stats.yds) / games) * 10) / 10;

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
          lean: "Use matchup + team script context for pass-yardage lean.",
        },
        td: {
          lean: `${toNumber(stats.td)} passing TD baseline sample.`,
        },
      },
      situation: player?.situation2025 || "QB context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "qb_db",
    },
  ];
}

function buildPromptContext(uiPlayers) {
  const lines = Object.entries(uiPlayers)
    .map(([name, p]) => {
      const stats = p.rec2025 || {};
      const tdLean = p?.props?.td?.lean || "—";
      const yLean = p?.props?.recYds?.lean || p?.props?.rushYds?.lean || "—";
      const core = `${name} | ${p.pos} | ${p.team} | ${p.tier}`;
      const statLine = `  Stats: ${p.ydsPg} yds/g, ${stats.td ?? 0} TD, ${stats.g ?? 0}g`;
      const leanLine = `  Lean: ${yLean} | TD: ${tdLean}`;
      return [core, statLine, leanLine].join("\n");
    })
    .join("\n\n");

  return lines;
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

function formatDefensePrompt(defensesMap) {
  const lines = Object.entries(defensesMap || {}).map(
    ([abbr, d]) =>
      `${abbr} (${d.tier}): ${d.overall.ptsAllowed} pts/g | Pass rank ${d.pass.rank} | Rush rank ${d.rush.rank} | ${d.propImpact.qb}`,
  );
  return "\n\nNFL DEFENSE TENDENCIES (2025 season, all 32 teams):\n" + lines.join("\n");
}

/** Short defense lines — league-wide mode without long propImpact strings (token budget). */
function formatDefensePromptCompact(defensesMap) {
  const lines = Object.entries(defensesMap || {}).map(
    ([abbr, d]) =>
      `${abbr} (${d.tier}): ${d.overall.ptsAllowed} pts/g | pass rank ${d.pass.rank} | rush rank ${d.rush.rank}`,
  );
  return "\n\nNFL DEFENSE TENDENCIES (2025 season, all 32 teams — compact):\n" + lines.join("\n");
}

/**
 * @param {object} options
 * @param {string} [options.question]
 * @param {object | null} [options.matchupContext]
 * @param {Set<string>|string[]|null} [options.scopeTeamAbbrs]
 */
export async function buildCanonicalNflContext(options = {}) {
  const { question = "", matchupContext = null, scopeTeamAbbrs = null } = options;

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
  const draftBlock = buildNflDraftBoardBlock(draftMeta, draftBundle);
  let promptContext = [buildPromptContext(uiPlayers), draftBlock].join("\n\n---\n\n");

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

  if (scoped) {
    const rbMap = Object.fromEntries(filterObjectEntriesByTeam(Object.entries(RBs || {}), scope));
    const wrMap = Object.fromEntries(filterObjectEntriesByTeam(Object.entries(WRsAndTEs || {}), scope));
    promptContext += formatRbDatabasePrompt(rbMap);
    promptContext += formatWrTeDatabasePrompt(wrMap);
    promptContext += formatDefensePrompt(filterDefensesMap(scope));
  } else {
    promptContext +=
      "\n\nLeague mode: RB/WR duplicate rows omitted — ask with a team/matchup for full positional + coaching slices.";
    promptContext += formatDefensePromptCompact(defenses);
  }

  const rosterData = await getDurableJson("nfl_espn_roster");
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

  if (rosterData?.players?.length) {
    let pool = rosterData.players.filter((p) => p.injuryStatus && p.injuryStatus !== "Active");
    if (scoped) {
      pool = pool.filter((p) => scopeMatchesTeam(scope, p.team));
    }
    const injCap = leagueCompact ? 12 : 40;
    const injured = pool.map((p) => `${p.name} (${p.team}, ${p.position}): ${p.injuryStatus}`).slice(0, injCap);
    if (injured.length) {
      promptContext += "\n\nNFL INJURY REPORT (ESPN, updated every 6hrs):\n" + injured.join("\n");
    }
  }

  if (promptContext.length > NFL_PROMPT_CONTEXT_BUDGET_CHARS) {
    const suffix =
      "\n\n[NFL context truncated to token budget — narrow the question to a team or matchup.]";
    const room = Math.max(0, NFL_PROMPT_CONTEXT_BUDGET_CHARS - suffix.length);
    promptContext = `${promptContext.slice(0, room)}${suffix}`;
  }

  return {
    uiPlayers,
    promptContext,
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
    },
    dataFreshness: {
      qbDataSeason: "2024",
      rbDataSeason: "2025",
      wrTeDataSeason: "2025",
      lastVerified: "2026-03-30",
      isCurrentSeason: false,
      warning:
        "QB baseline stats are 2024. Roster situations reflect March 2026 Ourlads. 2026 in-season data not yet integrated.",
      nflDraft: {
        phase: draftMeta.phase,
        draftClassYear: draftMeta.draftYear,
        roundOneBoardSource: draftMeta.roundOneBoardSource,
        officialRoundOnePicksLoaded: draftMeta.officialRoundOneCount > 0,
        bundleWarning: draftMeta.bundleWarning || null,
      },
    },
  };
}
