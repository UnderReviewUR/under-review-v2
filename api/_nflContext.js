import RBs from "./nfl-rb.js";
import WRsAndTEs from "./nfl-wr-te.js";
import { QBs } from "./nfl-players.js";
import { defenses } from "./nfl-defense.js";
import { getDurableJson } from "./_durableStore.js";
import { getEnv } from "./_env.js";
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import { buildNflFantasyContextBlock } from "./_nflFantasyContext.js";
import { getNflQbStats2025 } from "./data/nfl-qb-stats-2025.js";
import { getNflPlayerStats2025 } from "./data/nfl-player-stats-2025.js";
import { getNflDefenseAllowed2025 } from "./data/nfl-defense-allowed-2025.js";
import { readNflGameDayStatusSnapshot } from "./_nflEspnGameDayStatus.js";
import {
  buildNflDraftBoardBlock,
  getActiveDraftBundle,
  getNflDraftMeta,
  getNflTeamAbbrFromName,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";
import { formatPropContextForPlayers } from "./_nflPropLineContext.js";

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

function questionNeedsNflWeather(question) {
  return /\b(weather|wind|rain|snow|storm|cold|heat|outdoor|kicker|field goal|total|over|under|passing|receiving)\b/i.test(
    String(question || ""),
  );
}

function questionExplicitlyAsksWeather(question) {
  return /\b(weather|wind|rain|snow|storm|cold|heat|outdoor)\b/i.test(String(question || ""));
}

function weatherCodeLooksImpactful(code) {
  const n = Number(code);
  return (
    n === 45 ||
    n === 48 ||
    (n >= 51 && n <= 67) ||
    (n >= 71 && n <= 77) ||
    (n >= 80 && n <= 86) ||
    (n >= 95 && n <= 99)
  );
}

function describeWeatherImpact(cur = {}) {
  const temp = Number(cur.temperature_2m);
  const wind = Number(cur.wind_speed_10m);
  const gust = Number(cur.wind_gusts_10m);
  const precip = Number(cur.precipitation);
  const code = Number(cur.weather_code);
  const factors = [];
  if (Number.isFinite(wind) && wind >= 15) factors.push(`sustained wind ${wind} mph`);
  if (Number.isFinite(gust) && gust >= 25) factors.push(`gusts ${gust} mph`);
  if (Number.isFinite(precip) && precip >= 0.02) factors.push(`precipitation ${precip} in`);
  if (weatherCodeLooksImpactful(code)) factors.push(`weather code ${code}`);
  if (Number.isFinite(temp) && temp <= 25) factors.push(`cold ${temp}F`);
  if (Number.isFinite(temp) && temp >= 95) factors.push(`heat ${temp}F`);
  return factors;
}

function buildNflInactiveDisciplineBlock(question) {
  if (!/\b(inactive|active|out|questionable|will .*play|playing|suit up|available|injur)/i.test(String(question || ""))) {
    return "";
  }
  return "\n\nNFL ACTIVE/INACTIVE DISCIPLINE: ESPN roster refresh supplies current availability when posted. If official 90-minute inactives are not present in the roster/injury rows, do not claim a player is officially active/inactive; say status is unconfirmed and use the listed ESPN status as the latest signal.";
}

async function buildNflWeatherBlock(scope, question, matchupContext = null) {
  if (!questionNeedsNflWeather(question)) return "";
  const explicitWeatherAsk = questionExplicitlyAsksWeather(question);
  const team = resolveWeatherVenueTeam(scope, question, matchupContext);
  if (!team || NFL_STADIUM_META[team]?.domed) return "";
  const meta = NFL_STADIUM_META[team];
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${meta.lat}&longitude=${meta.lon}` +
    "&current=temperature_2m,precipitation,wind_speed_10m,wind_gusts_10m,weather_code" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch";
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) throw new Error(`weather HTTP ${res.status}`);
    const json = await res.json();
    const cur = json?.current || {};
    const impactFactors = describeWeatherImpact(cur);
    if (!impactFactors.length && !explicitWeatherAsk) return "";
    const units = json?.current_units || {};
    const temp = cur.temperature_2m != null ? `${cur.temperature_2m}${units.temperature_2m || "F"}` : "n/a";
    const wind = cur.wind_speed_10m != null ? `${cur.wind_speed_10m} mph` : "n/a";
    const gust = cur.wind_gusts_10m != null ? `${cur.wind_gusts_10m} mph gusts` : "gust n/a";
    const precip = cur.precipitation != null ? `${cur.precipitation} in precip` : "precip n/a";
    const impact =
      impactFactors.length > 0
        ? `Potential weather factor: ${impactFactors.join(", ")}.`
        : "No material weather factor in the current snapshot.";
    return `\n\nNFL WEATHER SNAPSHOT (${team}, ${meta.stadium}, current Open-Meteo): ${temp}, wind ${wind}, ${gust}, ${precip}. ${impact} Treat as current weather only; confirm kickoff forecast for bets near game time.`;
  } catch (err) {
    return explicitWeatherAsk
      ? `\n\nNFL WEATHER SNAPSHOT: unavailable for ${team} (${err?.message || "fetch failed"}). Do not invent weather; ask user to verify kickoff forecast if weather matters.`
      : "";
  }
}

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

function normalizeNflRosterNameKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const NFL_SCOPE_ALIAS_TO_ABBR = {
  ravens: "BAL",
  bengals: "CIN",
  browns: "CLE",
  steelers: "PIT",
  bills: "BUF",
  dolphins: "MIA",
  patriots: "NE",
  jets: "NYJ",
  texans: "HOU",
  colts: "IND",
  jaguars: "JAX",
  titans: "TEN",
  broncos: "DEN",
  chiefs: "KC",
  raiders: "LV",
  chargers: "LAC",
  cowboys: "DAL",
  eagles: "PHI",
  giants: "NYG",
  commanders: "WAS",
  bears: "CHI",
  lions: "DET",
  packers: "GB",
  vikings: "MIN",
  falcons: "ATL",
  panthers: "CAR",
  saints: "NO",
  buccaneers: "TB",
  bucs: "TB",
  cardinals: "ARI",
  rams: "LAR",
  "49ers": "SF",
  niners: "SF",
  seahawks: "SEA",
};

function detectNflScopeAlias(question) {
  const q = String(question || "").toLowerCase();
  for (const [alias, abbr] of Object.entries(NFL_SCOPE_ALIAS_TO_ABBR)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(q)) return abbr;
  }
  return null;
}

function resolveNflAliasToAbbr(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (NFL_STADIUM_META[upper]) return upper;
  return NFL_SCOPE_ALIAS_TO_ABBR[raw.toLowerCase()] || null;
}

function detectHomeTeamFromQuestion(question) {
  const raw = String(question || "");
  const abbrPair = raw.toUpperCase().match(/\b([A-Z]{2,4})\s*(?:@|AT)\s*([A-Z]{2,4})\b/);
  if (abbrPair) {
    const home = resolveNflAliasToAbbr(abbrPair[2]);
    if (home) return home;
  }
  const q = ` ${raw.toLowerCase().replace(/[^a-z0-9@]+/g, " ")} `;
  const aliases = Object.keys(NFL_SCOPE_ALIAS_TO_ABBR).sort((a, b) => b.length - a.length);
  for (const away of aliases) {
    for (const home of aliases) {
      if (away === home) continue;
      if (q.includes(` ${away} at ${home} `) || q.includes(` ${away} @ ${home} `)) {
        return NFL_SCOPE_ALIAS_TO_ABBR[home];
      }
    }
  }
  return null;
}

function resolveWeatherVenueTeam(scope, question, matchupContext) {
  const leagueStr = String(matchupContext?.league || "").toUpperCase();
  if (matchupContext && leagueStr.includes("NFL")) {
    const raw = matchupContext.raw || {};
    const home = resolveNflAliasToAbbr(
      raw.homeTeam?.abbr || raw.home_abbr || raw.home || matchupContext.homeTeam || matchupContext.home,
    );
    if (home) return home;
  }
  const textHome = detectHomeTeamFromQuestion(question);
  if (textHome) return textHome;
  const teams = [...(scope || [])]
    .map((team) => String(team || "").toUpperCase())
    .filter((team) => NFL_STADIUM_META[team]);
  return teams.length === 1 ? teams[0] : null;
}

function buildRosterByName(rosterData) {
  const out = new Map();
  for (const player of Array.isArray(rosterData?.players) ? rosterData.players : []) {
    const key = normalizeNflRosterNameKey(player?.name);
    if (key && !out.has(key)) out.set(key, player);
  }
  return out;
}

function overlayCurrentRosterOnEntries(entries, rosterData) {
  const byName = buildRosterByName(rosterData);
  if (!byName.size) return entries;
  return entries.map(([name, player]) => {
    const current = byName.get(normalizeNflRosterNameKey(name));
    if (!current?.team) return [name, player];
    const staticTeam = player?.team || "UNK";
    return [
      name,
      {
        ...player,
        staticTeam,
        team: current.team,
        rosterStatus: current.rosterStatus || current.status || "",
        availability: current.availability || "",
        injuryStatus: current.injuryStatus || "",
        injuryDetail: Array.isArray(current.injuries)
          ? current.injuries.map((inj) => inj.summary).filter(Boolean).join(" | ")
          : "",
        currentRosterSource: "espn_roster",
        currentRosterAsOf: rosterData?.fetchedAt || null,
      },
    ];
  });
}

function formatRosterStatusLine(player) {
  const parts = [];
  const status = String(player?.rosterStatus || player?.availability || "").trim();
  const injury = String(player?.injuryDetail || player?.injuryStatus || "").trim();
  if (status && status !== "Active") parts.push(`status ${status}`);
  if (injury && injury !== status) parts.push(injury);
  if (player?.staticTeam && player.staticTeam !== player.team) {
    parts.push(`static DB team was ${player.staticTeam}; ESPN roster says ${player.team}`);
  }
  return parts.length ? `  Roster: ${parts.join(" | ")}` : "";
}

function formatCurrentRosterBlock(rosterData, scope, leagueCompact) {
  const players = Array.isArray(rosterData?.players) ? rosterData.players : [];
  if (!players.length) return "";
  const asOf = rosterData.fetchedAt ? new Date(rosterData.fetchedAt).toISOString() : "unknown";
  if (leagueCompact) {
    return `\n\nCURRENT NFL ROSTERS (ESPN): loaded ${players.length} players as of ${asOf}; omitted in league mode. Ask with a team or matchup for current roster/injury detail.`;
  }
  const posOrder = new Map([
    ["QB", 1],
    ["RB", 2],
    ["FB", 3],
    ["WR", 4],
    ["TE", 5],
  ]);
  const scopedPlayers = players
    .filter((p) => scopeMatchesTeam(scope, p?.team))
    .filter((p) => posOrder.has(String(p?.position || "").toUpperCase()))
    .sort((a, b) => {
      const ap = posOrder.get(String(a?.position || "").toUpperCase()) || 99;
      const bp = posOrder.get(String(b?.position || "").toUpperCase()) || 99;
      if (ap !== bp) return ap - bp;
      return String(a?.name || "").localeCompare(String(b?.name || ""));
    })
    .slice(0, 80);
  if (!scopedPlayers.length) return "";
  const lines = scopedPlayers.map((p) => {
    const status = String(p.availability || p.rosterStatus || "").trim();
    const injury = String(p.injuryStatus || "").trim();
    const suffix = injury && injury !== status ? ` | ${injury}` : "";
    return `${p.team} ${p.position} ${p.name}${status && status !== "active" ? ` | ${status}` : ""}${suffix}`;
  });
  return `\n\nCURRENT ROSTER SNAPSHOT (ESPN, as of ${asOf}):\n${lines.join("\n")}`;
}

function formatRosterChangesBlock(rosterData, scope, leagueCompact) {
  const changes = Array.isArray(rosterData?.changesSinceLastRefresh)
    ? rosterData.changesSinceLastRefresh
    : [];
  if (!changes.length) return "";
  const scoped = changes.filter((change) => {
    const teams = [change.team, change.fromTeam, change.toTeam].filter(Boolean);
    return !teams.length || teams.some((team) => scopeMatchesTeam(scope, team));
  });
  const selected = (leagueCompact ? changes : scoped).slice(0, leagueCompact ? 10 : 25);
  if (!selected.length) return "";
  const lines = selected.map((change) => {
    if (change.type === "team_changed") {
      return `${change.player} (${change.pos}): team changed ${change.fromTeam} -> ${change.toTeam}`;
    }
    if (change.type === "injury_changed") {
      return `${change.player} (${change.pos}, ${change.team}): injury/status changed to ${change.to || "clear"}`;
    }
    if (change.type === "status_changed") {
      return `${change.player} (${change.pos}, ${change.team}): roster status ${change.fromStatus || "n/a"} -> ${change.toStatus || "n/a"}`;
    }
    if (change.type === "removed") {
      return `${change.player} (${change.pos}): removed from ${change.fromTeam}`;
    }
    return `${change.player} (${change.pos}, ${change.team}): added to roster`;
  });
  return `\n\nNFL ROSTER CHANGES SINCE LAST REFRESH:\n${lines.join("\n")}`;
}

function formatGameDayStatusBlock(snapshot, scope, leagueCompact) {
  if (!snapshot?.events?.length) return "";
  const events = snapshot.events.filter((event) =>
    (event.teams || []).some((team) => scopeMatchesTeam(scope, team.abbr)),
  );
  const selected = (leagueCompact ? snapshot.events : events).slice(0, leagueCompact ? 5 : 8);
  if (!selected.length) return "";
  const lines = [];
  for (const event of selected) {
    const teams = (event.teams || []).map((team) => `${team.homeAway}:${team.abbr}`).join(" ");
    lines.push(`${event.name || event.id} | ${event.status || "status n/a"} | ${teams}`);
    for (const injury of (event.injuries || []).slice(0, 10)) {
      if (!leagueCompact && injury.team && !scopeMatchesTeam(scope, injury.team)) continue;
      const detail = [injury.status, injury.type, injury.detail].filter(Boolean).join(" — ");
      if (injury.player || detail) lines.push(`  ${injury.team || "NFL"} ${injury.player || "status"}: ${detail || "listed"}`);
    }
  }
  return `\n\nNFL GAME-DAY STATUS / INACTIVES SNAPSHOT (ESPN, as of ${new Date(snapshot.fetchedAt).toISOString()}):\n${lines.join("\n")}`;
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
  const directAlias = detectNflScopeAlias(q);
  if (directAlias) return new Set([directAlias]);

  try {
    const hint = detectNflTeamHint(q) || detectNflScopeAlias(q);
    if (hint) set.add(String(hint).toUpperCase());
  } catch {
    const hint = detectNflScopeAlias(q);
    if (hint) set.add(String(hint).toUpperCase());
  }

  const qUpper = q.toUpperCase();
  const pair = qUpper.match(/\b([A-Z]{2,4})\s*(?:@|VS\.?|V\.?)\s*([A-Z]{2,4})\b/);
  if (pair) {
    set.add(pair[1]);
    set.add(pair[2]);
  }

  if (set.size > 0 && set.size <= 2) return set;

  const focusFullName = resolveNflTeamFromQuestion(q);
  if (focusFullName) {
    const ab = getNflTeamAbbrFromName(focusFullName);
    if (ab) set.add(ab);
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
  const playerStats2025 = getNflPlayerStats2025(name);
  const rec = player?.rec2025 || {};
  const ydsPg = playerStats2025?.receivingYardsPerGame ?? toNumber(rec.ydsPg);
  const recPg = playerStats2025?.receptionsPerGame ?? (rec.recPg != null ? toNumber(rec.recPg) : null);
  return [
    name,
    {
      pos: player?.pos || "WR",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg,
      rec2025: {
        g: playerStats2025?.games ?? toNumber(rec.g),
        td: playerStats2025?.receivingTds ?? toNumber(rec.td),
        ypr: playerStats2025?.yardsPerReception ?? toNumber(rec.ypr),
        tgt: playerStats2025?.targets ?? (rec.tgt != null ? toNumber(rec.tgt) : null),
        recPg,
      },
      playerStats2025,
      props: player?.props || {},
      situation: player?.situation2026 || player?.situation || "Role context unavailable.",
      bettingAngles: Array.isArray(player?.bettingAngles) ? player.bettingAngles : [],
      source: "wr_te_db",
    },
  ];
}

function mapRbToUi(name, player) {
  const playerStats2025 = getNflPlayerStats2025(name);
  const rush = player?.rush2025 || {};
  const rushYds = player?.props?.rushYds || null;
  const rushYdsPg = playerStats2025?.rushingYardsPerGame ?? toNumber(rush.ydsPg);
  return [
    name,
    {
      pos: "RB",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: rushYdsPg,
      rec2025: {
        g: playerStats2025?.games ?? toNumber(rush.g),
        td: playerStats2025?.rushingTds ?? toNumber(rush.td),
        ypr: toNumber(rush.ypa), // Kept for existing UI slot.
        tgt: null,
        recPg: null,
      },
      playerStats2025,
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
  const qbStats2025 = getNflQbStats2025(name);
  const stats = player?.stats2024 || {};
  const games = Math.max(1, toNumber(qbStats2025?.games ?? stats.games, 17));
  const passYds = qbStats2025?.passingYards ?? toNumber(stats.yds);
  const passTds = qbStats2025?.passingTds ?? toNumber(stats.td);
  const ypa = qbStats2025?.yardsPerAttempt ?? toNumber(stats.ypa);
  const passYdsPg = qbStats2025?.passingYardsPerGame ?? Math.round((passYds / games) * 10) / 10;

  return [
    name,
    {
      pos: "QB",
      team: player?.team || "UNK",
      tier: player?.tier || "STARTER",
      ydsPg: passYdsPg,
      rec2025: {
        g: games,
        td: passTds,
        ypr: ypa,
        tgt: null,
        recPg: null,
      },
      qbStats2025,
      props: {
        recYds: {
          floor: Math.max(140, Math.round(passYdsPg - 35)),
          ceil: Math.round(passYdsPg + 45),
          lean: qbStats2025
            ? `2025 nflverse baseline: ${passYdsPg} pass yds/g, ${qbStats2025.tdRate}% TD rate, ${qbStats2025.sackPct}% sack rate.`
            : "Use matchup + team script context for pass-yardage lean.",
        },
        td: {
          lean: qbStats2025
            ? `${passTds} pass TDs in ${games} games (${qbStats2025.tdRate}% TD rate) via nflverse 2025.`
            : `${toNumber(stats.td)} passing TD baseline sample.`,
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
      const statLine =
        p.pos === "QB" && p.qbStats2025
          ? `  2025 QB stats (nflverse): ${p.qbStats2025.passingYardsPerGame} pass yds/g, ${p.qbStats2025.passingTds} TD, ${p.qbStats2025.interceptions} INT, ${p.qbStats2025.sackPct}% sack rate, EPA/att ${p.qbStats2025.epaPerAttempt}, ${p.qbStats2025.rushingYardsPerGame} rush yds/g`
          : p.pos === "RB" && p.playerStats2025
            ? `  2025 RB stats (nflverse): ${p.playerStats2025.rushingYardsPerGame} rush yds/g, ${p.playerStats2025.touchesPerGame} touches/g, ${p.playerStats2025.targetsPerGame} targets/g, ${p.playerStats2025.rushingTds} rush TD, ${p.playerStats2025.receivingYardsPerGame} rec yds/g`
            : (p.pos === "WR" || p.pos === "TE") && p.playerStats2025
              ? `  2025 ${p.pos} stats (nflverse): ${p.playerStats2025.targetsPerGame} targets/g, ${p.playerStats2025.receptionsPerGame} rec/g, ${p.playerStats2025.receivingYardsPerGame} rec yds/g, ${p.playerStats2025.receivingTds} TD, target share ${p.playerStats2025.targetShare}`
          : `  Stats: ${p.ydsPg} yds/g, ${stats.td ?? 0} TD, ${stats.g ?? 0}g`;
      const leanLine = `  Lean: ${yLean} | TD: ${tdLean}`;
      return [core, statLine, leanLine, formatRosterStatusLine(p)].filter(Boolean).join("\n");
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
    ([abbr, d]) => {
      const allowed = getNflDefenseAllowed2025(abbr);
      const allowedLine = allowed
        ? ` | 2025 allowed: ${allowed.passYardsAllowedPerGame} pass yds/g, ${allowed.passTdsAllowedPerGame} pass TD/g, ${allowed.rushYardsAllowedPerGame} rush yds/g, sack ${allowed.sacksPerGame}/g`
        : "";
      return `${abbr} (${d.tier}): ${d.overall.ptsAllowed} pts/g | Pass rank ${d.pass.rank} | Rush rank ${d.rush.rank}${allowedLine} | ${d.propImpact.qb}`;
    },
  );
  return "\n\nNFL DEFENSE TENDENCIES (2025 season, all 32 teams):\n" + lines.join("\n");
}

/** Short defense lines — league-wide mode without long propImpact strings (token budget). */
function formatDefensePromptCompact(defensesMap) {
  const lines = Object.entries(defensesMap || {}).map(
    ([abbr, d]) => {
      const allowed = getNflDefenseAllowed2025(abbr);
      const allowedLine = allowed
        ? ` | allowed ${allowed.passYardsAllowedPerGame} pass yds/g, ${allowed.rushYardsAllowedPerGame} rush yds/g`
        : "";
      return `${abbr} (${d.tier}): ${d.overall.ptsAllowed} pts/g | pass rank ${d.pass.rank} | rush rank ${d.rush.rank}${allowedLine}`;
    },
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
  const [rosterData, gameDayStatus] = await Promise.all([
    getDurableJson("nfl_espn_roster"),
    readNflGameDayStatusSnapshot().catch(() => null),
  ]);

  let wrteEntries = Object.entries(WRsAndTEs || {}).map(([name, player]) => mapWrTeToUi(name, player));
  let rbEntries = Object.entries(RBs || {}).map(([name, player]) => mapRbToUi(name, player));
  let qbEntries = Object.entries(QBs || {}).map(([name, player]) => mapQbToUi(name, player));

  wrteEntries = overlayCurrentRosterOnEntries(wrteEntries, rosterData);
  rbEntries = overlayCurrentRosterOnEntries(rbEntries, rosterData);
  qbEntries = overlayCurrentRosterOnEntries(qbEntries, rosterData);

  if (scoped) {
    wrteEntries = filterObjectEntriesByTeam(wrteEntries, scope);
    rbEntries = filterObjectEntriesByTeam(rbEntries, scope);
    qbEntries = filterObjectEntriesByTeam(qbEntries, scope);
  }

  const uiPlayers = Object.fromEntries([...wrteEntries, ...rbEntries, ...qbEntries]);
  const draftBundle = getActiveDraftBundle();
  const draftMeta = getNflDraftMeta(new Date(), draftBundle);
  const draftBlock = buildNflDraftBoardBlock(draftMeta, draftBundle);
  const rosterAsOf = rosterData?.fetchedAt ? new Date(rosterData.fetchedAt).toISOString() : null;
  const nflBreaking = String(getEnv("NFL_BREAKING") || "").trim();
  const nflRosterVerificationBanner = rosterAsOf
    ? `NOTE: Current team/status comes from ESPN roster refresh as of ${rosterAsOf}. Static stat baselines remain historical; use ESPN roster rows for current team, availability, cuts/signings/trades, and injury status.`
    : "NOTE: NFL roster data last verified May 2026. ESPN roster refresh has not populated KV yet; treat static team/status fields as stale until /api/nfl-roster-refresh runs.";
  let promptContext = [nflRosterVerificationBanner, buildPromptContext(uiPlayers), draftBlock].join("\n\n---\n\n");
  promptContext +=
    "\n\nNFL RESPONSE DISCIPLINE: Do not mention weather, dome status, or 'no weather penalty' unless the user explicitly asks about weather or the NFL WEATHER SNAPSHOT says there is a potential weather factor. If no weather block is present, leave weather out entirely.";
  if (nflBreaking) {
    promptContext += `\n\nNFL BREAKING NEWS / MANUAL OVERRIDE:\n${nflBreaking}`;
  }
  promptContext += formatCurrentRosterBlock(rosterData, scope, leagueCompact);
  promptContext += formatRosterChangesBlock(rosterData, scope, leagueCompact);
  promptContext += formatGameDayStatusBlock(gameDayStatus, scope, leagueCompact);
  promptContext += buildNflFantasyContextBlock({
    question,
    playerNames: scoped ? Object.keys(uiPlayers) : [],
    scopeTeamAbbrs: scoped ? [...scope] : [],
  });
  promptContext += buildNflInactiveDisciplineBlock(question);
  if (scoped) {
    promptContext += await buildNflWeatherBlock(scope, question, matchupContext);
  }

  const depthData = await getDurableJson("nfl_depth_chart");
  const depthFiltered =
    depthData?.depth && scoped ? filterDepthByScope(depthData.depth, scope) : depthData?.depth;

  if (scoped && depthFiltered && typeof depthFiltered === "object" && Object.keys(depthFiltered).length > 0) {
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
    let pool = rosterData.players.filter(
      (p) =>
        p.injuryStatus &&
        p.injuryStatus !== "Active" &&
        p.structuralImpact !== false,
    );
    if (scoped) {
      pool = pool.filter((p) => scopeMatchesTeam(scope, p.team));
    }
    const injCap = leagueCompact ? 12 : 40;
    const injured = pool
      .map((p) => {
        const detail = Array.isArray(p.injuries)
          ? p.injuries.map((inj) => inj.summary).filter(Boolean).join(" | ")
          : "";
        return `${p.name} (${p.team}, ${p.position}): ${detail || p.injuryStatus || p.availability}`;
      })
      .slice(0, injCap);
    if (injured.length) {
      promptContext += "\n\nNFL INJURY / AVAILABILITY REPORT (ESPN roster refresh):\n" + injured.join("\n");
    }
  }

  // ── PROP LINE CONTEXT (before char budget trim) ─────────────────
  const propPlayerNames = extractNflPlayerNamesFromPromptText(promptContext);
  const propSlice = formatPropContextForPlayers(propPlayerNames, 4);
  if (propSlice) {
    promptContext += propSlice;
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
      lastVerified: rosterAsOf || "2026-03-30",
      rosterSource: rosterAsOf ? "espn_site_api" : "static_fallback",
      rosterFetchedAt: rosterData?.fetchedAt || null,
      rosterPreviousFetchedAt: rosterData?.previousFetchedAt || null,
      rosterChangeSummary: rosterData?.changeSummary || { total: 0 },
      isCurrentSeason: Boolean(rosterAsOf),
      warning:
        "Historical stat baselines remain prior-season data. Current team, active roster, and injury/availability context should come from ESPN roster refresh plus Ourlads depth where available.",
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
