/**
 * Sport-agnostic structural angle validation — ingestion tags + output QA.
 */

import { isLowImpactBlocklisted } from "./lowImpactPlayerBlocklist.js";
import { bdlStatRowHasPlayingTime } from "./nbaUrTakeSlim.js";

export const VACANCY_NARRATIVE_RE =
  /\b(?:vacancy|vacated|usage\s+shift|rotation\s+impact|inherits?\s+the|opens?\s+up\s+the|collapse(?:s|d)?\s+the\s+interior|interior\s+opens?|without\s+\w+|absence\s+of|ruled\s+out|is\s+out)\b/i;

export const INTERIOR_VACANCY_RE =
  /\b(?:interior|frontcourt|paint|rebound(?:ing)?\s+share|rim\s+protection|lane\s+vacancy|big[\s-]?man\s+vacancy|interior\s+collapse|frontcourt\s+collapse|paint\s+vacancy|center\s+vacancy|rim\s+vacancy)\b/i;

export const LINEUP_VACANCY_RE =
  /\b(?:lineup\s+vacancy|batting\s+order|lineup\s+hole|everyday\s+lineup|starting\s+lineup\s+spot)\b/i;

export const DRAW_VACANCY_RE =
  /\b(?:draw\s+vacancy|withdrawal|withdrew|pulled\s+out|field\s+opens?)\b/i;

export const FIELD_STRENGTH_RE =
  /\b(?:field\s+strength|weaker\s+field|field\s+opens?|cut[\s-]?line)\b/i;

const BDL_ABBR_TO_ESPN_SLUG = {
  ATL: "atl",
  BOS: "bos",
  BKN: "bkn",
  CHA: "cha",
  CHI: "chi",
  CLE: "cle",
  DAL: "dal",
  DEN: "den",
  DET: "det",
  GSW: "gs",
  HOU: "hou",
  IND: "ind",
  LAC: "lac",
  LAL: "lal",
  MEM: "mem",
  MIA: "mia",
  MIL: "mil",
  MIN: "min",
  NOP: "no",
  NYK: "ny",
  OKC: "okc",
  ORL: "orl",
  PHI: "phi",
  PHX: "phx",
  POR: "por",
  SAC: "sac",
  SAS: "sa",
  TOR: "tor",
  UTA: "utah",
  WAS: "wsh",
};

const depthCache = new Map();

function escapeRegExp(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizePlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function parseMinutesValue(min) {
  if (min == null) return null;
  const s = String(min).trim();
  if (!s) return null;
  const colon = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (colon) {
    const mm = Number(colon[1]);
    const ss = Number(colon[2]);
    if (!Number.isFinite(mm)) return null;
    return mm + (Number.isFinite(ss) ? ss / 60 : 0);
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {string} position
 * @returns {"guard"|"big"|"wing"|"unknown"}
 */
export function classifyNbaRosterPosition(position) {
  const p = String(position || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .trim();
  if (!p) return "unknown";
  if (/^(PG|SG|G|G-F|G\/F|GUARD)$/.test(p) || p.startsWith("PG") || p.startsWith("SG")) {
    return "guard";
  }
  if (/^(C|PF|F-C|F\/C|FC|CENTER|POWERFORWARD)$/.test(p) || p.includes("CENTER")) {
    return "big";
  }
  if (/^(SF|F|F-G|F\/G|FORWARD|SMALLFORWARD)$/.test(p) || p.startsWith("SF")) {
    return "wing";
  }
  if (p.includes("GUARD")) return "guard";
  if (p.includes("CENTER") || p.includes("POWER")) return "big";
  return "unknown";
}

function classifyNflPosition(position) {
  const p = String(position || "").toUpperCase();
  if (/^(QB|RB|FB|WR|TE)$/.test(p)) return "skill";
  if (/^(OL|OT|OG|C|T|G)$/.test(p) || p.includes("LINE")) return "line";
  if (/^(DL|DE|DT|NT|LB|CB|S|DB|FS|SS)$/.test(p)) return "defense";
  return "unknown";
}

function isPitcherPosition(position) {
  const p = String(position || "").toUpperCase();
  return p === "P" || p === "SP" || p === "RP" || p.includes("PITCH");
}

function isGuardishPosition(position, sport) {
  const sp = String(sport || "").toLowerCase();
  if (sp === "nba") return classifyNbaRosterPosition(position) === "guard";
  if (sp === "nfl") return false;
  return false;
}

function recentTenGameSample(recentGames) {
  const rg = Array.isArray(recentGames) ? recentGames : [];
  const played = [];
  for (const g of rg) {
    if (!bdlStatRowHasPlayingTime(g)) continue;
    played.push(g);
    if (played.length >= 10) break;
  }
  return played;
}

function validateNbaNflTeamSport(player, sport, angle) {
  const sp = String(sport || "").toLowerCase();
  const ang = String(angle || "vacancy").toLowerCase();
  const contractBlob = `${player?.contract || ""} ${player?.statsNote || ""} ${player?.espnStatus || ""} ${player?.rosterStatus || ""}`.toLowerCase();
  const twoWay =
    player?.twoWay === true ||
    /\btwo[- ]?way\b/.test(contractBlob) ||
    /\bpractice\s+squad\b/.test(contractBlob);
  if (twoWay) return { valid: false, reason: "two_way_or_practice_squad" };

  const recent = recentTenGameSample(player?.recentGames);
  const mins = recent.map((g) => parseMinutesValue(g?.min)).filter((m) => m != null);
  const avgMpgLast10 = mins.length
    ? mins.reduce((a, b) => a + b, 0) / mins.length
    : parseMinutesValue(player?.min ?? player?.avgMpg) ?? 0;
  const startsLast10 = recent.filter((g) => (parseMinutesValue(g?.min) ?? 0) >= 28).length;
  const snapShare = Number(player?.snapShare ?? player?.snapPct ?? NaN);
  const propLineCount = Number(player?.propLineCount ?? 0);
  const depthChartKey = Boolean(player?.depthChartKey);
  const seasonMin = parseMinutesValue(player?.seasonMin ?? player?.min);

  if (sp === "nfl") {
    const snapOk = Number.isFinite(snapShare) && snapShare >= 0.35;
    const snapsOk = avgMpgLast10 >= 15;
    if (!snapOk && !snapsOk && !depthChartKey && propLineCount < 2) {
      return { valid: false, reason: "below_nfl_snap_threshold" };
    }
  } else {
    const impactOk =
      avgMpgLast10 >= 15 ||
      startsLast10 >= 3 ||
      depthChartKey ||
      propLineCount >= 2 ||
      (seasonMin != null && seasonMin >= 20);
    if (!impactOk) return { valid: false, reason: "below_nba_impact_threshold" };
  }

  if (
    (ang === "interior_vacancy" || INTERIOR_VACANCY_RE.test(ang)) &&
    isGuardishPosition(player?.position, sp)
  ) {
    return { valid: false, reason: "guard_interior_mismatch" };
  }

  return { valid: true, reason: "team_sport_impact_ok" };
}

function validateMlbStructural(player, angle) {
  const ang = String(angle || "vacancy").toLowerCase();
  const pos = String(player?.position || "").toUpperCase();
  const statusBlob = `${player?.status || ""} ${player?.detail || ""}`.toLowerCase();

  if (isPitcherPosition(pos) && (ang === "lineup_vacancy" || LINEUP_VACANCY_RE.test(ang))) {
    return { valid: false, reason: "pitcher_lineup_vacancy_mismatch" };
  }

  if (/\b(dfa|designated\s+for\s+assignment|optioned|minors|aaa|aax)\b/.test(statusBlob)) {
    return { valid: false, reason: "mlb_non_active_roster" };
  }

  const gs = Number(player?.gamesStarted ?? player?.starts ?? NaN);
  const pa = Number(player?.plateAppearances ?? player?.pa ?? NaN);
  const ilWeight =
    /\bil-60|60-day\b/.test(statusBlob) ? 2 : /\bil-10|10-day\b/.test(statusBlob) ? 1 : 0;

  if (isPitcherPosition(pos)) {
    if (ilWeight >= 1 || gs >= 5) return { valid: true, reason: "mlb_pitcher_rotation_impact" };
    return { valid: false, reason: "mlb_bullpen_low_impact" };
  }

  if (gs >= 10 || pa >= 100 || ilWeight >= 2) {
    return { valid: true, reason: "mlb_lineup_regular" };
  }
  if (ilWeight >= 1 && (gs >= 3 || pa >= 40)) {
    return { valid: true, reason: "mlb_short_il_regular" };
  }

  return { valid: false, reason: "mlb_low_service_impact" };
}

function validateTennisStructural(player, angle) {
  const ang = String(angle || "vacancy").toLowerCase();
  const rank = Number(player?.ranking ?? player?.rank ?? NaN);
  const recentWinRate = Number(player?.recentWinRate ?? NaN);
  const recentMatches = Number(player?.recentMatches ?? 0);

  if (!Number.isFinite(rank) || rank <= 100) {
    return { valid: true, reason: "tennis_rank_top_100" };
  }

  if (ang === "draw_vacancy" || DRAW_VACANCY_RE.test(ang)) {
    if (Number.isFinite(recentWinRate) && recentMatches >= 3 && recentWinRate >= 0.5) {
      return { valid: true, reason: "tennis_recent_form_ok" };
    }
    return { valid: false, reason: "tennis_low_rank_draw_vacancy" };
  }

  return { valid: rank <= 100, reason: rank <= 100 ? "tennis_rank_ok" : "tennis_rank_outside_window" };
}

function validateGolfStructural(player, angle) {
  const ang = String(angle || "vacancy").toLowerCase();
  const rank = Number(player?.worldRank ?? player?.rank ?? NaN);
  const cutMadeRate = Number(player?.cutMadeRate ?? NaN);

  if (!Number.isFinite(rank) || rank <= 150) {
    return { valid: true, reason: "golf_rank_top_150" };
  }

  if (ang === "field_strength" || FIELD_STRENGTH_RE.test(ang)) {
    if (Number.isFinite(cutMadeRate) && cutMadeRate >= 0.5) {
      return { valid: true, reason: "golf_cut_rate_ok" };
    }
    return { valid: false, reason: "golf_low_rank_field_factor" };
  }

  return { valid: rank <= 150, reason: "golf_rank_ok" };
}

function validateF1Structural(player) {
  if (player?.reserve === true || player?.testDriver === true) {
    return { valid: false, reason: "f1_reserve_or_test_driver" };
  }
  if (player?.raceEntered === false) {
    return { valid: false, reason: "f1_not_race_entered" };
  }
  return { valid: true, reason: "f1_race_driver" };
}

/**
 * @param {object} player
 * @param {string} sport nba|nfl|mlb|tennis|golf|f1
 * @param {string} [angle] vacancy|interior_vacancy|lineup_vacancy|draw_vacancy|field_strength
 * @returns {{ valid: boolean, reason: string }}
 */
export function validatePlayerForStructuralAngle(player, sport, angle = "vacancy") {
  const name = String(player?.name || player?.player || "").trim();
  if (!name) return { valid: false, reason: "missing_name" };
  if (isLowImpactBlocklisted(name)) return { valid: false, reason: "blocklisted" };

  const sp = String(sport || "").toLowerCase();
  if (sp === "nba" || sp === "nfl") return validateNbaNflTeamSport(player, sp, angle);
  if (sp === "mlb") return validateMlbStructural(player, angle);
  if (sp === "tennis") return validateTennisStructural(player, angle);
  if (sp === "golf") return validateGolfStructural(player, angle);
  if (sp === "f1") return validateF1Structural(player, angle);
  return { valid: true, reason: "unknown_sport_pass_through" };
}

/**
 * Tag a single row at ingestion time.
 * @param {object} row
 * @param {string} sport
 * @param {string} [angle]
 * @param {object} [ctx]
 */
export function tagStructuralImpactAtIngestion(row, sport, angle = "vacancy", ctx = {}) {
  const merged = { ...ctx, ...row };
  const result = validatePlayerForStructuralAngle(merged, sport, angle);
  return {
    ...row,
    structuralImpact: result.valid,
    structuralImpactReason: result.reason,
  };
}

/**
 * @param {object[]} rows
 * @param {string} sport
 * @param {string} [angle]
 * @param {object} [ctx]
 */
export function tagInjuryRowsAtIngestion(rows, sport, angle = "vacancy", ctx = {}) {
  return (Array.isArray(rows) ? rows : []).map((row) =>
    tagStructuralImpactAtIngestion(row, sport, angle, { ...ctx, ...row }),
  );
}

/**
 * NBA injuries + playerStats context (BallDontLie + ESPN depth).
 * @param {object[]} injuries
 * @param {{ playerStats?: object[], propLines?: object[], depthRotationByTeam?: Record<string, string[]> }} ctx
 */
export function enrichNbaInjuriesWithStructuralImpact(injuries, ctx = {}) {
  const playerStats = Array.isArray(ctx.playerStats) ? ctx.playerStats : [];
  const propLines = Array.isArray(ctx.propLines) ? ctx.propLines : [];
  const statsByName = new Map(
    playerStats
      .filter((p) => p?.name)
      .map((p) => [normalizePlayerKey(p.name), p]),
  );
  const propCount = (name) =>
    propLines.filter((pl) => normalizePlayerKey(pl?.player) === normalizePlayerKey(name)).length;

  const depthRotationByTeam = ctx.depthRotationByTeam || {};
  const depthKeySetByTeam = new Map();
  for (const [team, names] of Object.entries(depthRotationByTeam)) {
    depthKeySetByTeam.set(
      String(team || "").toUpperCase(),
      new Set((Array.isArray(names) ? names : []).map((n) => normalizePlayerKey(n))),
    );
  }

  return tagInjuryRowsAtIngestion(injuries, "nba", "vacancy", {}).map((row) => {
    const key = normalizePlayerKey(row.player);
    const stats = statsByName.get(key);
    const team = String(row.team || stats?.team || "").toUpperCase();
    const depthKeys = depthKeySetByTeam.get(team);
    const recent = recentTenGameSample(stats?.recentGames);
    const mins = recent.map((g) => parseMinutesValue(g?.min)).filter((m) => m != null);
    return tagStructuralImpactAtIngestion(
      {
        ...row,
        position: stats?.position || row.position || "",
        recentGames: stats?.recentGames,
        min: stats?.min,
        propLineCount: propCount(row.player),
        depthChartKey: depthKeys ? depthKeys.has(key) : false,
        contract: stats?.contract,
        statsNote: stats?.statsNote,
        espnStatus: stats?.espnStatus,
        twoWay: stats?.twoWay,
      },
      "nba",
      "vacancy",
    );
  });
}

function playerNamePattern(name) {
  const full = String(name || "").trim();
  const parts = full.split(/\s+/).filter(Boolean);
  const last = parts[parts.length - 1] || full;
  return new RegExp(
    `\\b(?:${escapeRegExp(full)}|${escapeRegExp(last)})\\b`,
    "i",
  );
}

function splitSentences(text) {
  return String(text || "")
    .trim()
    .split(/\s*(?:(?<=[.!?])\s+|—|;|\n{2,})\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * @param {string} text
 * @param {string} playerName
 * @param {string} [sport]
 */
export function narrativeClaimsInteriorVacancyForPlayer(text, playerName, sport = "nba") {
  const re = playerNamePattern(playerName);
  for (const sent of splitSentences(text)) {
    if (!re.test(sent)) continue;
    if (INTERIOR_VACANCY_RE.test(sent) && VACANCY_NARRATIVE_RE.test(sent)) return true;
    if (INTERIOR_VACANCY_RE.test(sent) && /\b(?:out|ruled out|absence|injury|without)\b/i.test(sent)) {
      return true;
    }
    if (sport === "mlb" && LINEUP_VACANCY_RE.test(sent) && isPitcherPosition("")) {
      return true;
    }
  }
  return INTERIOR_VACANCY_RE.test(text) && re.test(text);
}

function collectKnownPlayersFromContext(options = {}) {
  /** @type {Map<string, { sport: string, profile: object }>} */
  const map = new Map();
  const add = (name, sport, profile) => {
    const k = normalizePlayerKey(name);
    if (!k) return;
    map.set(k, { sport, profile: { name, ...profile } });
  };

  const nbaCtx = options.nbaContext;
  if (nbaCtx?.playerStats) {
    for (const row of nbaCtx.playerStats) {
      add(row.name, "nba", row);
    }
  }
  if (nbaCtx?.injuries) {
    for (const row of nbaCtx.injuries) {
      add(row.player, "nba", row);
    }
  }

  const mlbCtx = options.mlbContext;
  if (mlbCtx?.injuries) {
    for (const row of mlbCtx.injuries) {
      add(row.player, "mlb", row);
    }
  }

  const tennisCtx = options.tennisContext;
  const tennisRows = [
    ...(Array.isArray(tennisCtx?.fixtures) ? tennisCtx.fixtures : []),
    ...(Array.isArray(tennisCtx?.liveMatches) ? tennisCtx.liveMatches : []),
  ];
  for (const m of tennisRows) {
    const home = String(m.event_first_player || m.home_team || "").trim();
    const away = String(m.event_second_player || m.away_team || "").trim();
    if (home) {
      add(home, "tennis", {
        name: home,
        player: home,
        ranking: m.ranking ?? m.first_player_ranking,
        recentWinRate: m.recentWinRate ?? m.first_player_recent_win_rate,
        structuralImpact:
          m.first_player_structural_impact !== undefined
            ? m.first_player_structural_impact
            : m.structuralImpact,
        structuralImpactReason: m.first_player_structural_impact_reason,
      });
    }
    if (away) {
      add(away, "tennis", {
        name: away,
        player: away,
        ranking: m.away_ranking ?? m.second_player_ranking,
        recentWinRate: m.away_recent_win_rate ?? m.second_player_recent_win_rate,
        structuralImpact:
          m.second_player_structural_impact !== undefined
            ? m.second_player_structural_impact
            : m.structuralImpact,
        structuralImpactReason: m.second_player_structural_impact_reason,
      });
    }
  }

  const golfCtx = options.golfContext;
  if (golfCtx?.fieldRoster) {
    for (const row of golfCtx.fieldRoster) {
      add(row.name, "golf", row);
    }
  }

  const f1Ctx = options.f1Context;
  if (f1Ctx?.standings) {
    for (const row of f1Ctx.standings) {
      add(row.full_name, "f1", row);
    }
  }

  return map;
}

/**
 * Cross-sport structural integrity lint for UR Take output.
 * @param {string} text
 * @param {object} options
 */
export function lintCrossSportStructuralIntegrity(text, options = {}) {
  const raw = String(text || "").trim();
  /** @type {string[]} */
  const criticalCodes = [];
  /** @type {Array<{ ruleCode: string, player?: string, reason?: string }>} */
  const events = [];

  if (!raw) return { criticalCodes, events };

  const vacancyLike =
    VACANCY_NARRATIVE_RE.test(raw) ||
    INTERIOR_VACANCY_RE.test(raw) ||
    LINEUP_VACANCY_RE.test(raw) ||
    DRAW_VACANCY_RE.test(raw) ||
    FIELD_STRENGTH_RE.test(raw);

  if (!vacancyLike) return { criticalCodes, events };

  const sportHint = String(options.sport || "").toLowerCase();
  const known = collectKnownPlayersFromContext(options);

  for (const [key, meta] of known) {
    const name = meta.profile?.name || meta.profile?.player || key;
    const re = playerNamePattern(name);
    if (!re.test(raw)) continue;

    const sport = sportHint || meta.sport;
    let angle = "vacancy";
    if (INTERIOR_VACANCY_RE.test(raw)) angle = "interior_vacancy";
    else if (LINEUP_VACANCY_RE.test(raw)) angle = "lineup_vacancy";
    else if (DRAW_VACANCY_RE.test(raw)) angle = "draw_vacancy";
    else if (FIELD_STRENGTH_RE.test(raw)) angle = "field_strength";

    if (meta.profile?.structuralImpact === false) {
      criticalCodes.push("structural_low_impact_vacancy");
      events.push({
        ruleCode: "structural_low_impact_vacancy",
        player: name,
        reason: meta.profile?.structuralImpactReason || "ingestion_tag_false",
      });
      continue;
    }

    const validation = validatePlayerForStructuralAngle(meta.profile, sport, angle);
    if (!validation.valid) {
      const code =
        validation.reason === "blocklisted"
          ? "structural_irrelevant_player"
          : validation.reason === "guard_interior_mismatch"
            ? "structural_guard_interior_mismatch"
            : "structural_low_impact_vacancy";
      criticalCodes.push(code);
      events.push({
        ruleCode: code,
        player: name,
        reason: validation.reason,
      });
    }
  }

  return {
    criticalCodes: [...new Set(criticalCodes)],
    events,
  };
}

/**
 * Build tennis context for cross-sport structural QA from UR Take request payload.
 * @param {{ liveMatches?: object[], players?: object }} input
 */
export function buildTennisStructuralQaContext(input = {}) {
  const liveMatches = Array.isArray(input.liveMatches) ? input.liveMatches : [];
  /** @type {object[]} */
  const fixtures = [];
  for (const m of liveMatches) {
    const home = String(m?.home_team || m?.event_first_player || "").trim();
    const away = String(m?.away_team || m?.event_second_player || "").trim();
    if (!home && !away) continue;
    fixtures.push({
      event_first_player: home,
      event_second_player: away,
      home_team: home,
      away_team: away,
      first_player_structural_impact: m.first_player_structural_impact,
      first_player_structural_impact_reason: m.first_player_structural_impact_reason,
      second_player_structural_impact: m.second_player_structural_impact,
      second_player_structural_impact_reason: m.second_player_structural_impact_reason,
    });
  }
  return { fixtures, liveMatches: liveMatches.slice(0, 48) };
}

export const UNIVERSAL_STRUCTURAL_REGENERATION_SUFFIX = `

[STRUCTURAL ANGLE — rewrite required]
A cited player failed structural impact validation (low minutes, wrong position for the narrative, blocklisted, or non-race/non-lineup role).
Rewrite without using that player as a vacancy or structural driver. Name only verified rotation-level players from context.
`;

/** ESPN depth chart — top rotation names per team (cached 30m). */
export function buildNbaStructuralPlayerIndex(ctx = {}) {
  const playerStats = Array.isArray(ctx.playerStats) ? ctx.playerStats : [];
  const propLines = Array.isArray(ctx.propLines) ? ctx.propLines : [];
  const depthRotationByTeam = ctx.depthRotationByTeam || {};
  /** @type {Map<string, object>} */
  const index = new Map();
  const depthKeySetByTeam = new Map();
  for (const [team, names] of Object.entries(depthRotationByTeam)) {
    depthKeySetByTeam.set(
      String(team || "").toUpperCase(),
      new Set((Array.isArray(names) ? names : []).map((n) => normalizePlayerKey(n))),
    );
  }
  for (const row of playerStats) {
    const name = String(row?.name || "").trim();
    if (!name) continue;
    const key = normalizePlayerKey(name);
    const team = String(row?.team || "").toUpperCase();
    const recent = recentTenGameSample(row.recentGames);
    const mins = recent.map((g) => parseMinutesValue(g?.min)).filter((m) => m != null);
    const avgMpgLast10 = mins.length
      ? mins.reduce((a, b) => a + b, 0) / mins.length
      : parseMinutesValue(row?.min) ?? 0;
    const startsLast10 = recent.filter((g) => (parseMinutesValue(g?.min) ?? 0) >= 28).length;
    const depthKeys = depthKeySetByTeam.get(team);
    const validation = validatePlayerForStructuralAngle(
      {
        name,
        position: row?.position,
        recentGames: row.recentGames,
        min: row?.min,
        propLineCount: propLines.filter(
          (pl) => normalizePlayerKey(pl?.player) === key,
        ).length,
        depthChartKey: depthKeys ? depthKeys.has(key) : false,
        contract: row?.contract,
        statsNote: row?.statsNote,
        espnStatus: row?.espnStatus,
      },
      "nba",
      "vacancy",
    );
    index.set(key, {
      name,
      team,
      position: row?.position || "",
      positionClass: classifyNbaRosterPosition(row?.position),
      avgMpgLast10,
      startsLast10,
      blocklisted: validation.reason === "blocklisted",
      lowImpact: !validation.valid,
      structuralImpact: validation.valid,
    });
  }
  return index;
}

export function meetsNbaStructuralImpactThreshold(profile) {
  return Boolean(profile?.structuralImpact);
}

/**
 * @param {string} text
 * @param {Map<string, object>} index
 */
export function lintNbaStructuralAngleViolations(text, index) {
  const raw = String(text || "").trim();
  const criticalCodes = [];
  const events = [];
  if (!raw || !(index instanceof Map)) return { criticalCodes, events };
  for (const [, profile] of index) {
    const re = playerNamePattern(profile.name);
    if (!re.test(raw)) continue;
    if (profile.blocklisted) {
      criticalCodes.push("nba_structural_irrelevant_player");
      events.push({ ruleCode: "nba_structural_irrelevant_player", player: profile.name });
      continue;
    }
    if (
      profile.positionClass === "guard" &&
      narrativeClaimsInteriorVacancyForPlayer(raw, profile.name, "nba")
    ) {
      criticalCodes.push("nba_structural_guard_interior_mismatch");
      events.push({
        ruleCode: "nba_structural_guard_interior_mismatch",
        player: profile.name,
      });
      continue;
    }
    if (
      (VACANCY_NARRATIVE_RE.test(raw) || INTERIOR_VACANCY_RE.test(raw)) &&
      (profile.lowImpact || !profile.structuralImpact)
    ) {
      criticalCodes.push("nba_structural_low_impact_vacancy");
      events.push({
        ruleCode: "nba_structural_low_impact_vacancy",
        player: profile.name,
      });
    }
  }
  return { criticalCodes: [...new Set(criticalCodes)], events };
}

export function validateStructuralAngleCopy(copy, indexOrCtx) {
  const lean = String(copy?.lean || "").trim();
  const reason = String(copy?.reason || "").trim();
  const text = `${lean} ${reason}`.trim();
  if (!text) return { ok: false, violations: [{ reason: "empty_copy" }] };
  if (indexOrCtx instanceof Map) {
    const lint = lintNbaStructuralAngleViolations(text, indexOrCtx);
    if (!lint.criticalCodes.length) return { ok: true, violations: [] };
    return { ok: false, violations: lint.events, criticalCodes: lint.criticalCodes };
  }
  const lint = lintCrossSportStructuralIntegrity(text, {
    sport: "nba",
    nbaContext: {
      playerStats: indexOrCtx?.playerStats || [],
      injuries: indexOrCtx?.injuries || [],
    },
  });
  if (!lint.criticalCodes.length) return { ok: true, violations: [] };
  return { ok: false, violations: lint.events, criticalCodes: lint.criticalCodes };
}

export function filterInjurySummaryForStructuralAngles(injurySummary, indexOrStats) {
  const rows = Array.isArray(injurySummary) ? injurySummary : [];
  if (indexOrStats instanceof Map) {
    return rows.filter((row) => {
      const name = String(row?.player || "").trim();
      if (!name || isLowImpactBlocklisted(name)) return false;
      const profile = indexOrStats.get(normalizePlayerKey(name));
      if (!profile) return true;
      return meetsNbaStructuralImpactThreshold(profile);
    });
  }
  return rows
    .map((row) =>
      tagStructuralImpactAtIngestion(row, "nba", "vacancy", {
        ...(indexOrStats?.statsByPlayer?.[normalizePlayerKey(row.player)] || {}),
        ...row,
      }),
    )
    .filter((row) => row.structuralImpact !== false);
}

export function sanitizeNbaNewsImpactForStructuralAngles(newsImpact, index) {
  if (!newsImpact || typeof newsImpact !== "object") return newsImpact;
  const teams = Array.isArray(newsImpact.affectedTeams) ? newsImpact.affectedTeams : [];
  const affectedTeams = teams
    .map((bucket) => {
      const keepName = (n) => {
        if (isLowImpactBlocklisted(n)) return false;
        if (!(index instanceof Map)) return true;
        const profile = index.get(normalizePlayerKey(n));
        return !profile || profile.structuralImpact !== false;
      };
      const outs = (bucket.outs || []).filter(keepName);
      const doubtful = (bucket.doubtful || []).filter(keepName);
      const questionable = (bucket.questionable || []).filter(keepName);
      const beneficiaries = (bucket.beneficiaries || []).filter((b) =>
        keepName(b?.player),
      );
      const notes = (bucket.notes || []).filter((note) => {
        if (!INTERIOR_VACANCY_RE.test(String(note || ""))) return true;
        const injuredGuard = [...outs, ...doubtful, ...questionable].some((name) => {
          const profile = index?.get?.(normalizePlayerKey(name));
          return profile?.positionClass === "guard";
        });
        return !injuredGuard;
      });
      return {
        ...bucket,
        outs,
        doubtful,
        questionable,
        beneficiaries: beneficiaries.slice(0, 4),
        notes: [...new Set(notes)].slice(0, 4),
      };
    })
    .filter(
      (b) => b.outs.length || b.doubtful.length || b.questionable.length,
    );
  return { ...newsImpact, affectedTeams };
}

export async function fetchEspnDepthRotationKeysByTeam(teamAbbrevs) {
  const teams = [...new Set((teamAbbrevs || []).map((t) => String(t || "").toUpperCase()).filter(Boolean))];
  /** @type {Record<string, string[]>} */
  const out = {};
  await Promise.all(
    teams.map(async (abbr) => {
      const cacheKey = `espn_depth_${abbr}`;
      const cached = depthCache.get(cacheKey);
      if (cached && Date.now() - cached.at < 30 * 60 * 1000) {
        out[abbr] = cached.names;
        return;
      }
      const slug = BDL_ABBR_TO_ESPN_SLUG[abbr];
      if (!slug) {
        out[abbr] = [];
        return;
      }
      const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${slug}/depthchart`;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          out[abbr] = [];
          return;
        }
        const json = await res.json();
        const names = new Set();
        const positions = json?.depthchart?.positions || json?.positions || [];
        for (const pos of positions) {
          const items = pos?.items || pos?.athletes || [];
          for (const item of items.slice(0, 3)) {
            const athlete = item?.athlete || item;
            const nm = String(athlete?.displayName || athlete?.fullName || "").trim();
            if (nm) names.add(nm);
          }
        }
        const list = [...names];
        depthCache.set(cacheKey, { at: Date.now(), names: list });
        out[abbr] = list;
      } catch {
        out[abbr] = [];
      }
    }),
  );
  return out;
}
