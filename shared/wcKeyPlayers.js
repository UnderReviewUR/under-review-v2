/**
 * All-encompassing KEY PLAYERS grounding per cited team.
 *
 * Merges every available signal so the model never under-names a squad (e.g. citing a
 * secondary striker while omitting the actual talisman):
 *   - resolved FIFA squad registry (position, club, age, tournament goals/assists, PK flag)
 *   - Golden Boot futures odds (tournament-level attacking threat, BDL-first when GOAT)
 *   - this fixture's posted player props (anytime scorer / shots — fixture relevance)
 *   - injuries/availability board (flag OUT/doubtful — never present them as available)
 *   - notable-star list (talisman boost so stars surface even with no live data yet)
 *
 * Output is name-grounded to the official squad, so it cannot invent players.
 */

import { normalizeEspnAbbr } from "../api/_wcEspn.js";
import {
  buildResolvedWcPlayerRegistry,
  normalizeWcPlayerName,
  playerRegistryKey,
} from "./wcPlayerRegistry.js";
import { WC_STAR_PLAYER_NAMES } from "./wcInjuriesBoard.js";

const POSITION_WEIGHT = { FW: 40, MF: 24, DF: 12, GK: 10 };
const OUT_STATUS_RE = /\b(out|ruled out|will not play|injured|suspended)\b/i;
const DOUBTFUL_STATUS_RE = /\b(doubt|doubtful|questionable|fitness test|game[- ]time)\b/i;

/**
 * @param {string} s
 */
function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, "")
    .trim();
}

/**
 * Star talismans indexed by {first, surname} tokens. A squad name matches only when BOTH
 * the star's given name and surname appear in its token set — so a fuller squad name
 * ("Erling Braut Haaland", "Lamine Yamal Nasraoui Ebana") still matches, while a same-surname
 * teammate ("Lisandro Martínez" vs "Lautaro Martínez") does NOT get falsely starred.
 * @type {Array<{ first: string, surname: string }>}
 */
const STAR_INDEX = WC_STAR_PLAYER_NAMES.map((n) => {
  const tokens = foldName(n).split(/\s+/).filter(Boolean);
  return {
    first: tokens[0] || "",
    surname: tokens.length ? tokens[tokens.length - 1] : "",
  };
}).filter((x) => x.surname.length >= 3);

/**
 * @param {string} name
 */
function isStarName(name) {
  const tokens = new Set(foldName(name).split(/\s+/).filter(Boolean));
  if (!tokens.size) return false;
  return STAR_INDEX.some((s) => {
    if (!tokens.has(s.surname)) return false;
    if (!s.first || s.first === s.surname) return true;
    return tokens.has(s.first);
  });
}

/** @type {Array<{ name: string, nationAbbr: string }> | null} */
let starsByNationCache = null;

/**
 * Star talismans mapped to their FIFA-squad nation (derived once from the static registry).
 * Used to ground squad membership when a question (e.g. an image) resolves no teams from text.
 * @returns {Array<{ name: string, nationAbbr: string }>}
 */
export function getWcStarsByNation() {
  if (starsByNationCache) return starsByNationCache;
  const registry = buildResolvedWcPlayerRegistry(null);
  /** @type {Array<{ name: string, nationAbbr: string }>} */
  const out = [];
  const seen = new Set();
  for (const [abbr, team] of Object.entries(registry?.teams || {})) {
    const nationAbbr = normalizeEspnAbbr(abbr);
    for (const p of team?.players || []) {
      if (!p?.name || !isStarName(p.name)) continue;
      const key = playerRegistryKey(p.name, nationAbbr);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ name: normalizeWcPlayerName(p.name), nationAbbr });
    }
  }
  out.sort((a, b) => a.nationAbbr.localeCompare(b.nationAbbr) || a.name.localeCompare(b.name));
  starsByNationCache = out;
  return out;
}

/** Test-only cache reset. */
export function resetWcStarsByNationCacheForTests() {
  starsByNationCache = null;
}

/**
 * Binding guard so the model never denies a player's squad membership — the failure where it
 * told a user "Haaland isn't on the squad." Always safe to inject on the World Cup path.
 * @returns {string}
 */
export function formatWcSquadTruthGuardBlock() {
  const stars = getWcStarsByNation();
  const lines = [
    "WC SQUAD TRUTH (binding):",
    '  The FIFA 2026 26-man squads are final. NEVER tell a user that a named player is not on their nation\'s squad, and never claim a star "isn\'t in this match / not on the squad" — if you are unsure, do NOT deny. Only treat a player as unavailable when the injury/availability board explicitly lists them OUT.',
  ];
  if (stars.length) {
    lines.push(
      `  Confirmed squad stars (name → nation): ${stars
        .map((s) => `${s.name} (${s.nationAbbr})`)
        .join(" · ")}`,
    );
  }
  return lines.join("\n");
}

/**
 * Build a registry-key → { americanOdds, impliedRank } map from Golden Boot rows,
 * scoped to a given nation when the row carries one (BDL dedupes by name only, so a
 * nation-less row is matched by name against the squad downstream).
 * @param {Array<{ name?: string, nationAbbr?: string, americanOdds?: string, impliedRank?: number }>} rows
 */
export function buildGoldenBootLookup(rows) {
  /** @type {Map<string, { americanOdds: string, impliedRank: number | null }>} */
  const byKey = new Map();
  /** @type {Map<string, { americanOdds: string, impliedRank: number | null }>} */
  const byName = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const name = normalizeWcPlayerName(String(row?.name || ""));
    if (!name) continue;
    const val = {
      americanOdds: String(row?.americanOdds || "").trim(),
      impliedRank: Number.isFinite(Number(row?.impliedRank)) ? Number(row.impliedRank) : null,
    };
    const nameKey = name.toLowerCase();
    if (!byName.has(nameKey)) byName.set(nameKey, val);
    const abbr = normalizeEspnAbbr(row?.nationAbbr);
    if (abbr) {
      const key = playerRegistryKey(name, abbr);
      if (!byKey.has(key)) byKey.set(key, val);
    }
  }
  return { byKey, byName };
}

/**
 * @param {{ rows?: Array<Record<string, unknown>> } | null | undefined} injuriesBoard
 */
export function buildInjuryLookup(injuriesBoard) {
  /** @type {Map<string, { status: string, impact: string }>} */
  const byKey = new Map();
  for (const row of Array.isArray(injuriesBoard?.rows) ? injuriesBoard.rows : []) {
    const name = normalizeWcPlayerName(String(row?.name || row?.playerName || ""));
    const abbr = normalizeEspnAbbr(row?.teamAbbr || row?.nationAbbr || row?.team);
    if (!name || !abbr) continue;
    byKey.set(playerRegistryKey(name, abbr), {
      status: String(row?.status || row?.detail || row?.note || "listed"),
      impact: String(row?.impact || ""),
    });
  }
  return byKey;
}

/**
 * Registry keys that have a posted player prop in the cited fixture (fixture relevance boost).
 * @param {{ markets?: Record<string, Array<Record<string, unknown>>> } | null | undefined} eventProps
 * @param {string} homeAbbr
 * @param {string} awayAbbr
 */
export function buildFixturePropKeySet(eventProps, homeAbbr, awayAbbr) {
  /** @type {Set<string>} */
  const keys = new Set();
  const markets = eventProps?.markets;
  if (!markets || typeof markets !== "object") return keys;
  const abbrs = [normalizeEspnAbbr(homeAbbr), normalizeEspnAbbr(awayAbbr)].filter(Boolean);
  for (const rows of Object.values(markets)) {
    for (const row of Array.isArray(rows) ? rows : []) {
      const name = normalizeWcPlayerName(String(row?.name || ""));
      if (!name) continue;
      const abbr = normalizeEspnAbbr(row?.nationAbbr);
      if (abbr) {
        keys.add(playerRegistryKey(name, abbr));
      } else {
        // Nation-less prop row — attribute to both sides; squad match disambiguates.
        for (const a of abbrs) keys.add(playerRegistryKey(name, a));
      }
    }
  }
  return keys;
}

/**
 * @typedef {{
 *   name: string,
 *   position: string,
 *   ageYears: number | null,
 *   club: string | null,
 *   goalsTournament: number,
 *   assistsTournament: number,
 *   isPenaltyTaker: boolean,
 *   isStar: boolean,
 *   isStarterLikely: boolean,
 *   goldenBootOdds: string | null,
 *   hasFixtureProp: boolean,
 *   injuryStatus: string | null,
 *   injuryFlag: "out" | "doubtful" | null,
 *   score: number,
 * }} WcKeyPlayerRow
 */

/**
 * Rank a single team's key players from the resolved registry + signals.
 * @param {Record<string, unknown> | null | undefined} registry
 * @param {string} nationAbbr
 * @param {{
 *   goldenBoot?: ReturnType<typeof buildGoldenBootLookup>,
 *   injuryByKey?: Map<string, { status: string, impact: string }>,
 *   propKeySet?: Set<string>,
 *   limit?: number,
 * }} [opts]
 * @returns {WcKeyPlayerRow[]}
 */
export function rankWcTeamKeyPlayers(registry, nationAbbr, opts = {}) {
  const abbr = normalizeEspnAbbr(nationAbbr);
  const team = registry?.teams?.[abbr];
  if (!team || !Array.isArray(team.players) || !team.players.length) return [];

  const goldenBoot = opts.goldenBoot || { byKey: new Map(), byName: new Map() };
  const injuryByKey = opts.injuryByKey || new Map();
  const propKeySet = opts.propKeySet || new Set();
  const limit = opts.limit ?? 6;

  /** @type {WcKeyPlayerRow[]} */
  const rows = [];
  for (const p of team.players) {
    const name = normalizeWcPlayerName(String(p?.name || ""));
    if (!name) continue;
    const key = playerRegistryKey(name, abbr);
    const position = String(p?.position || "").toUpperCase() || "";
    const goals = Number(p?.goalsTournament) || 0;
    const assists = Number(p?.assistsTournament) || 0;
    const isPk = Boolean(p?.isPenaltyTaker);
    const star = isStarName(name);
    const starterLikely = Boolean(p?.isStarterLikely);

    const gb =
      goldenBoot.byKey.get(key) || goldenBoot.byName.get(name.toLowerCase()) || null;
    const hasProp = propKeySet.has(key);

    const inj = injuryByKey.get(key) || null;
    const injuryStatus = inj?.status || (p?.injuryStatus ? String(p.injuryStatus) : null);
    let injuryFlag = null;
    if (injuryStatus && OUT_STATUS_RE.test(injuryStatus)) injuryFlag = "out";
    else if (injuryStatus && DOUBTFUL_STATUS_RE.test(injuryStatus)) injuryFlag = "doubtful";

    let score = POSITION_WEIGHT[position] ?? 8;
    if (star) score += 70;
    if (isPk) score += 18;
    if (gb) {
      const rank = gb.impliedRank == null ? 20 : gb.impliedRank;
      score += 15 + Math.max(0, 45 - rank);
    }
    if (hasProp) score += 25;
    score += goals * 10 + assists * 5;
    if (starterLikely) score += 6;
    // An OUT star should not dominate the list as if available.
    if (injuryFlag === "out") score -= 40;

    rows.push({
      name,
      position,
      ageYears: p?.ageYears != null ? Number(p.ageYears) : null,
      club: p?.club ? String(p.club) : null,
      goalsTournament: goals,
      assistsTournament: assists,
      isPenaltyTaker: isPk,
      isStar: star,
      isStarterLikely: starterLikely,
      goldenBootOdds: gb?.americanOdds || null,
      hasFixtureProp: hasProp,
      injuryStatus,
      injuryFlag,
      score,
    });
  }

  rows.sort(
    (a, b) =>
      b.score - a.score ||
      b.goalsTournament - a.goalsTournament ||
      a.name.localeCompare(b.name),
  );
  return rows.slice(0, limit);
}

/**
 * @param {WcKeyPlayerRow} r
 */
function formatKeyPlayerLine(r) {
  const bits = [];
  if (r.position) bits.push(r.position);
  if (r.ageYears != null) bits.push(`age ${r.ageYears}`);
  const meta = bits.length ? ` (${bits.join(", ")})` : "";

  const tags = [];
  if (r.isStar) tags.push("talisman");
  if (r.isPenaltyTaker) tags.push("PK taker");
  if (r.goldenBootOdds) tags.push(`Golden Boot ${r.goldenBootOdds}`);
  if (r.goalsTournament || r.assistsTournament) {
    tags.push(
      `${r.goalsTournament} WC goal${r.goalsTournament === 1 ? "" : "s"}` +
        (r.assistsTournament ? `, ${r.assistsTournament} assist${r.assistsTournament === 1 ? "" : "s"}` : ""),
    );
  }
  if (r.hasFixtureProp) tags.push("has posted prop this match");
  if (r.club) tags.push(`club: ${r.club}`);
  const tagText = tags.length ? ` — ${tags.join(" · ")}` : "";

  let injury = "";
  if (r.injuryFlag === "out") {
    injury = `  ⚠ OUT/UNAVAILABLE (${r.injuryStatus}) — do NOT cite as available`;
  } else if (r.injuryFlag === "doubtful") {
    injury = `  ⚠ DOUBTFUL (${r.injuryStatus}) — flag availability risk`;
  }
  return `    - ${r.name}${meta}${tagText}${injury}`;
}

/**
 * Build the KEY PLAYERS prompt block for the cited teams.
 * @param {string[]} teamAbbrs
 * @param {{
 *   playersKv?: Record<string, unknown> | null,
 *   registry?: Record<string, unknown> | null,
 *   goldenBootRows?: Array<Record<string, unknown>>,
 *   injuriesBoard?: { rows?: Array<Record<string, unknown>> } | null,
 *   eventProps?: { markets?: Record<string, Array<Record<string, unknown>>> } | null,
 *   homeAbbr?: string,
 *   awayAbbr?: string,
 *   limitPerTeam?: number,
 *   nowMs?: number,
 * }} [opts]
 * @returns {string | null}
 */
export function formatWcKeyPlayersPromptBlock(teamAbbrs, opts = {}) {
  const abbrs = [
    ...new Set((teamAbbrs || []).map((t) => normalizeEspnAbbr(t)).filter(Boolean)),
  ];
  if (!abbrs.length) return null;

  const registry =
    opts.registry || buildResolvedWcPlayerRegistry(opts.playersKv || null, opts.nowMs);
  const goldenBoot = buildGoldenBootLookup(opts.goldenBootRows || []);
  const injuryByKey = buildInjuryLookup(opts.injuriesBoard);
  const limit = opts.limitPerTeam ?? 6;

  const sections = [];
  for (const abbr of abbrs) {
    const propKeySet = buildFixturePropKeySet(opts.eventProps, opts.homeAbbr, opts.awayAbbr);
    const ranked = rankWcTeamKeyPlayers(registry, abbr, {
      goldenBoot,
      injuryByKey,
      propKeySet,
      limit,
    });
    if (!ranked.length) continue;
    sections.push(`  ${abbr} key players (ranked):`);
    for (const r of ranked) sections.push(formatKeyPlayerLine(r));
  }
  if (!sections.length) return null;

  return [
    "KEY PLAYERS (per cited team — squad-verified; lead your analysis with these, do not omit the talisman):",
    ...sections,
    "  RULE: These are the squad's most important players from verified data. When naming who can decide the match, START from this list — never omit a listed talisman (e.g. the top Golden Boot / star name) in favor of a secondary player.",
    "  RULE: Club names are FIFA roster reference only — cite national-team and World Cup form, never club/domestic-league form, in betting analysis.",
    "  RULE: Never present a player flagged OUT/UNAVAILABLE as an option; treat DOUBTFUL players as availability risks.",
  ].join("\n");
}
