/**
 * World Cup 2026 — server-side UR Take context (mirrors NBA board injection pattern).
 * Elo stays internal; model sees strength tags only.
 */

import { getDurableJson } from "./_durableStore.js";
import { readWcMatchDetailFromKv, readWcOutrightsFromKv } from "./_wcData.js";
import { getGroupsPayload, getMatchesPayload } from "./world-cup.js";
import { getEnv } from "./_env.js";
import { isKvFresh } from "../shared/selfHealingKv.js";
import {
  deriveWcDataConfidence,
  wcDataConfidenceChipLabel,
} from "../shared/wcDataConfidence.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import {
  shouldInjectStaticRules,
  WC_INTENT,
  WC_STATIC_RULES_BLOCK,
} from "../shared/wcUrTakeIntent.js";
import { buildWcOutrightsFreshnessPromptBlock, buildMatchOddsFreshnessPromptBlock } from "../shared/wcOddsFreshness.js";
import { isWcPlayerMarketIntent } from "../shared/wcUrTakePlayerMarket.js";
import {
  formatWcPlayerMarketsPromptBlock,
  loadWcPlayerMarketKvBlocks,
} from "./_wcPlayerUrTakeContext.js";
import { resolveWcPlayerMarketTier, tierMetaFor } from "../shared/wcPlayerMarketResolve.js";
import { getWcBreakingLineWithOverride } from "./_wcPlayerMarketsOverride.js";
import {
  filterOutrightsForQuestion,
  formatGroupClinchWarnings,
  formatKnockoutPhasePromptRules,
  formatKnockoutUrTakeAppendix,
  formatWorldCupPhaseRules,
  getWorldCupPhase,
  isKnockoutPhase,
  isKnockoutRound,
  selectGroupsForPrompt,
} from "../shared/wcPhaseUtils.js";
import { formatVenueWarningsForPrompt } from "../shared/wcVenueMetadata.js";
import { resolveWcTournamentSimForPrompt } from "./_wcTournamentSimData.js";
import {
  buildLiveMatchChanceQualityFromDetail,
  formatLiveMatchChanceQualityPromptBlock,
  formatMatchChanceQualityPromptBlock,
} from "../shared/wcMatchChanceQuality.js";
import { buildWcUsmntMediaContextBlock } from "../shared/wcUsmntMediaContext.js";
import { buildWcAdvancementMarketPromptBlock } from "../shared/wcAdvancementMarket.js";
import { buildWcBdlFuturesPromptBlock } from "../shared/wcBdlFutures.js";
import { readWcBdlGoatSeedFromKv } from "./_wcBdlSeed.js";
import { readWcMatchAdvancedStatsForEvent } from "./_wcMatchAdvancedStats.js";
import { readWcApiFootballLiveStatsForEvent } from "./_wcApiFootballData.js";
import { formatApiFootballLivePlayersPromptBlock } from "../shared/wcApiFootballParse.js";
import {
  buildAdjustedGoldenBootPromptBlock,
  shouldInjectAdjustedGoldenBoot,
} from "../shared/wcAdjustedGoldenBootInject.js";
import { buildWcPlayerBioPromptBlock } from "../shared/wcPlayerBio.js";
import { buildResolvedWcPlayerRegistry } from "../shared/wcPlayerRegistry.js";
import { maybeWarmWcUrTakeKv } from "./_wcUrTakeLazyWarm.js";
import { readWcGoldenBootFromKv } from "./_wcGoldenBootOdds.js";
import { readWcPlayersFromKv } from "./_wcPlayersData.js";
import {
  isWcLiveDominanceQuestion,
  selectLiveFixtureForQuestion,
  WC_LIVE_MATCH_PROMPT_RULES,
} from "../shared/wcLiveMatchQuestion.js";

const WC_GROUPS_TTL_MS = 300 * 1000;
const WC_MATCHES_TTL_MS = 60 * 1000;
import { WC_2026_TEAMS } from "../src/data/wc2026Teams.js";
import { wcTeamsWithStrengthTags } from "../shared/wc2026Strength.js";

const GROUP_LETTERS = "ABCDEFGHIJKL".split("");

const WC_INJURY_UNCERTAINTY_RULE =
  "If injury or lineup data is not present in VERIFIED CONTEXT, explicitly state uncertainty. Do not invent player availability or starting status.";

const WC_INJURY_NOT_XI_RULE =
  "Injury / availability rows are not a confirmed starting XI. Do not infer starters from injury lists alone.";

/** Override without deploy: set env `WC_BREAKING` (same format as TENNIS_BREAKING). */
const WC_BREAKING =
  "2026-05-29 | Goldman Sachs WC model: Spain 26% favorite (FRA 19%, ARG 14%, BRA 8%); top Elo + scoring talent; ESP–ARG final projected. Books broadly aligned; England ~+650 (~13% implied) vs Goldman ~5% — market heavier than quant path.";

const WC_LINEUP_UNCONFIRMED_RULE =
  "Starting XI is NOT confirmed in the verified feed. Do not name expected starters, do not recommend starter-specific or goal-scorer props. Say uncertain or Pass / no play until lineups are confirmed.";

/**
 * @param {{ outrights?: Record<string, string>, lastUpdated?: number, source?: string, stale?: boolean, freshness?: { isStale?: boolean } } | null | undefined} outrightsKv
 * @returns {string | null}
 */
export function formatOutrightsForPrompt(outrightsKv) {
  return buildWcOutrightsFreshnessPromptBlock(outrightsKv);
}

/**
 * @param {number | string | undefined} ts
 */
function formatVerifiedAsOf(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "unknown";
  try {
    return new Date(n).toISOString();
  } catch {
    return "unknown";
  }
}

/**
 * Same-day breaking news for WC (env `WC_BREAKING` overrides file default).
 */
export function getWcBreakingLine() {
  const fromEnv = getEnv("WC_BREAKING", { treatEmptyAsMissing: false });
  const line = fromEnv !== undefined ? fromEnv : WC_BREAKING;
  const trimmed = String(line || "").trim();
  return trimmed || null;
}

/**
 * KV override (wc2026_player_markets_override) then env WC_BREAKING.
 */
export async function resolveWcBreakingLine() {
  const fromKv = await getWcBreakingLineWithOverride();
  if (fromKv) return fromKv;
  return getWcBreakingLine();
}

/**
 * @param {import("../shared/wcDataConfidence.js").WcDataConfidence} tier
 * @param {Array<Record<string, unknown>>} matchDetails
 */
export function formatWcDataConfidencePromptBlock(tier, matchDetails = []) {
  const label = wcDataConfidenceChipLabel(tier);
  const lines = [
    "DATA CONFIDENCE (binding for this response):",
    `  Tier: ${tier} (${label})`,
  ];

  if (tier === "confirmed") {
    lines.push(
      "  Confirmed starting XIs are in VERIFIED CONTEXT for at least one cited fixture. Starter-specific angles are allowed only when MATCH INTEL shows lineupConfirmed: yes.",
    );
  } else if (tier === "limited_intel") {
    lines.push(
      `  ${WC_LINEUP_UNCONFIRMED_RULE}`,
      `  ${WC_INJURY_NOT_XI_RULE}`,
    );
  } else {
    lines.push(
      `  ${WC_LINEUP_UNCONFIRMED_RULE}`,
      "  Prefer team-level or tournament angles only. Use confidence Speculative or Pass on player-specific asks.",
    );
  }

  const anyDetail = matchDetails.length > 0;
  if (!anyDetail) {
    lines.push(
      "  No fixture-level MATCH INTEL loaded for this question — do not claim match-specific lineups or injuries.",
    );
  }

  return lines.join("\n");
}

function isLiveStatus(status) {
  return ["live", "in_progress", "1h", "2h", "ht"].includes(String(status || "").toLowerCase());
}

function isFinished(status) {
  return String(status || "").toLowerCase() === "ft";
}

function isScheduled(status) {
  const s = String(status || "").toLowerCase();
  return s === "ns" || s === "scheduled" || s === "not started" || s === "upcoming";
}

function buildStaticGroups() {
  /** @type {Record<string, ReturnType<typeof wcTeamsWithStrengthTags>>} */
  const groups = {};
  for (const letter of GROUP_LETTERS) {
    const teams = WC_2026_TEAMS.filter((t) => t.group === letter);
    if (teams.length) groups[letter] = wcTeamsWithStrengthTags(teams);
  }
  return groups;
}

function mergeStandingsIntoGroups(staticGroups, apiGroups) {
  const out = { ...staticGroups };
  for (const letter of GROUP_LETTERS) {
    const apiRows = Array.isArray(apiGroups?.[letter]) ? apiGroups[letter] : [];
    const hasPlayed = apiRows.some((r) => Number(r.played) > 0);
    if (!hasPlayed) continue;

    const byAbbr = new Map(
      (staticGroups[letter] || []).map((t) => [String(t.abbreviation).toUpperCase(), t]),
    );
    const merged = apiRows
      .slice()
      .sort((a, b) => Number(b.points) - Number(a.points) || Number(b.gd) - Number(a.gd))
      .map((row, i) => {
        const key = String(row.team || "")
          .trim()
          .toUpperCase();
        const base = byAbbr.get(key) || {
          name: row.team,
          abbreviation: key,
          strengthTag: "Longshot",
        };
        return {
          ...base,
          strengthTag: base.strengthTag || (i === 0 ? "Favorite" : i === 1 ? "Contender" : "Longshot"),
          played: Number(row.played) || 0,
          won: Number(row.won) || 0,
          drawn: Number(row.drawn) || 0,
          lost: Number(row.lost) || 0,
          gd: Number(row.gd) || 0,
          points: Number(row.points) || 0,
          hasResults: true,
        };
      });
    if (merged.length) out[letter] = merged;
  }
  return out;
}

/**
 * Pick fixture(s) relevant to mentioned teams (max one unless two-team matchup).
 * When `wcEventId` is set (match-card UR Take), that fixture wins if present in the slate.
 * @param {Array<Record<string, unknown>>} matches
 * @param {string[]} mentionedTeams
 * @param {string | null | undefined} [wcEventId]
 */
export function selectFixturesForQuestion(matches, mentionedTeams, wcEventId) {
  const eventId = String(wcEventId || "").trim();
  if (eventId) {
    const pinned = (matches || []).find((m) => String(m?.id ?? "") === eventId);
    if (pinned) return [pinned];
  }

  if (!mentionedTeams.length) return [];
  const set = new Set(mentionedTeams.map((t) => t.toUpperCase()));
  const relevant = (matches || []).filter(
    (m) => set.has(String(m.homeTeam || "").toUpperCase()) || set.has(String(m.awayTeam || "").toUpperCase()),
  );
  if (!relevant.length) return [];

  if (set.size >= 2) {
    const pair = relevant.find(
      (m) => set.has(String(m.homeTeam).toUpperCase()) && set.has(String(m.awayTeam).toUpperCase()),
    );
    if (pair) return [pair];
  }

  const live = relevant.filter((m) => isLiveStatus(m.status));
  if (live.length) {
    return live.sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0)).slice(0, 1);
  }

  const upcoming = relevant
    .filter((m) => isScheduled(m.status))
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));
  if (upcoming.length) return [upcoming[0]];

  const results = relevant
    .filter((m) => isFinished(m.status))
    .sort((a, b) => (Number(b.commenceTs) || 0) - (Number(a.commenceTs) || 0));
  return results.length ? [results[0]] : [];
}

/**
 * @param {string} label
 * @param {Record<string, unknown> | null | undefined} side
 * @param {{ lineupConfirmed: boolean, lastUpdated?: number | string }} opts
 */
export function formatLineupSide(label, side, opts) {
  const confirmed = opts?.lineupConfirmed === true;
  const asOf = formatVerifiedAsOf(opts?.lastUpdated);
  const lines = [];

  if (!confirmed) {
    lines.push(`  Lineups: NOT CONFIRMED in verified ESPN feed (as of ${asOf}).`);
    lines.push(`  ${WC_LINEUP_UNCONFIRMED_RULE}`);
    return `${label}:\n${lines.join("\n")}`;
  }

  if (side?.formation) lines.push(`  Formation: ${side.formation}`);
  if (Array.isArray(side?.starters) && side.starters.length) {
    lines.push(
      `  Starters: ${side.starters.map((p) => `${p.name}${p.jersey ? ` #${p.jersey}` : ""}`).join(", ")}`,
    );
  }
  if (Array.isArray(side?.bench) && side.bench.length) {
    lines.push(
      `  Bench: ${side.bench.map((p) => `${p.name}${p.jersey ? ` #${p.jersey}` : ""}`).join(", ")}`,
    );
  }
  if (!lines.length) lines.push("  Lineups: confirmed flag set but no player rows in feed.");
  return `${label}:\n${lines.join("\n")}`;
}

/**
 * @param {string} teamName
 * @param {Record<string, unknown> | null | undefined} stats
 */
function formatTeamStatsLine(teamName, stats) {
  if (!stats || typeof stats !== "object") return null;
  const parts = [];
  if (stats.shots != null) parts.push(`shots ${stats.shots}`);
  if (stats.shotsOnTarget != null) parts.push(`on target ${stats.shotsOnTarget}`);
  if (stats.possessionPct != null) parts.push(`possession ${stats.possessionPct}%`);
  if (stats.passes != null) {
    if (stats.passesCompleted != null && stats.passPct != null) {
      parts.push(`passes ${stats.passesCompleted}/${stats.passes} (${stats.passPct}%)`);
    } else {
      parts.push(`passes ${stats.passes}`);
    }
  } else if (stats.passPct != null) {
    parts.push(`pass accuracy ${stats.passPct}%`);
  }
  if (stats.saves != null) parts.push(`saves ${stats.saves}`);
  if (stats.corners != null) parts.push(`corners ${stats.corners}`);
  if (stats.fouls != null) parts.push(`fouls ${stats.fouls}`);
  if (!parts.length) return null;
  return `  Team stats — ${teamName}: ${parts.join(", ")}`;
}

/**
 * @param {Record<string, unknown> | null | undefined} stats
 */
function hasTeamStatsForPrompt(stats) {
  if (!stats || typeof stats !== "object") return false;
  return (
    stats.shots != null ||
    stats.shotsOnTarget != null ||
    stats.possessionPct != null ||
    stats.passes != null ||
    stats.passesCompleted != null ||
    stats.passPct != null ||
    stats.saves != null ||
    stats.corners != null ||
    stats.fouls != null
  );
}

/**
 * @param {Record<string, unknown>} detail
 */
function formatMatchIntelBlock(detail) {
  const id = detail.eventId || "unknown";
  const lineupConfirmed = detail.lineupConfirmed === true;
  const asOf = formatVerifiedAsOf(detail.lastUpdated);
  const lines = [
    `MATCH INTEL (event ${id}) — ${detail.homeTeam} vs ${detail.awayTeam}`,
    `Status: ${detail.status}${detail.homeScore != null ? ` · Score ${detail.homeScore}-${detail.awayScore}` : ""}${detail.venue ? ` · ${detail.venue}` : ""}`,
    `  Verified feed: ESPN summary · truth_layer: espn_summary · lineupConfirmed: ${lineupConfirmed ? "yes" : "no"} · as of ${asOf}`,
  ];

  const lineupOpts = { lineupConfirmed, lastUpdated: detail.lastUpdated };
  lines.push(formatLineupSide(detail.homeTeam, detail.lineups?.home, lineupOpts));
  lines.push(formatLineupSide(detail.awayTeam, detail.lineups?.away, lineupOpts));

  const th = detail.teamStats?.home;
  const ta = detail.teamStats?.away;
  if (hasTeamStatsForPrompt(th) || hasTeamStatsForPrompt(ta)) {
    lines.push(
      "  Live team stats (binding for possession, passing, shots, corners, fouls — cite only these numbers):",
    );
    const homeLine = formatTeamStatsLine(detail.homeTeam, th);
    const awayLine = formatTeamStatsLine(detail.awayTeam, ta);
    if (homeLine) lines.push(homeLine);
    if (awayLine) lines.push(awayLine);
  }

  const statLines = [];
  for (const side of ["home", "away"]) {
    const abbr = side === "home" ? detail.homeTeam : detail.awayTeam;
    for (const p of detail.players?.[side] || []) {
      const bits = [];
      if (p.goals) bits.push(`${p.goals}G`);
      if (p.assists) bits.push(`${p.assists}A`);
      if (p.shots) bits.push(`${p.shots} shots`);
      if (p.shotsOnTarget) bits.push(`${p.shotsOnTarget} SOT`);
      if (p.saves) bits.push(`${p.saves} saves`);
      if (p.keyPasses != null && p.keyPasses > 0) bits.push(`${p.keyPasses} key passes`);
      if (p.yellowCards) bits.push(`${p.yellowCards} yellow`);
      if (p.redCards) bits.push(`${p.redCards} red`);
      if (p.minutesPlayed != null) bits.push(`${p.minutesPlayed} min`);
      if (bits.length) statLines.push(`  ${abbr} ${p.name}: ${bits.join(", ")}`);
    }
  }
  if (statLines.length) {
    lines.push("  Player match stats:");
    lines.push(...statLines.slice(0, 24));
  }

  if (Array.isArray(detail.goals) && detail.goals.length) {
    lines.push(
      `  Goals: ${detail.goals.map((g) => `${g.scorer}${g.assist ? ` (ast ${g.assist})` : ""} ${g.minute || ""}`).join(" · ")}`,
    );
  }

  const apiLiveBlock = formatApiFootballLivePlayersPromptBlock(
    detail.apiFootballLive?.players,
    detail.homeTeam,
    detail.awayTeam,
  );
  if (apiLiveBlock) {
    lines.push("", apiLiveBlock);
  }

  const advBlock = formatMatchChanceQualityPromptBlock(detail.advancedStats);
  if (advBlock) {
    lines.push("", advBlock);
  } else if (String(detail.status || "").toUpperCase() === "FT") {
    lines.push(
      "",
      "POST-MATCH CHANCE QUALITY: No verified post-match chance index in KV for this fixture.",
      "  Do not invent Opta xG — cite ESPN shots/SOT/key passes from MATCH INTEL above, or Pass if thin.",
    );
  } else if (isLiveStatus(detail.status)) {
    const liveChance = buildLiveMatchChanceQualityFromDetail(detail);
    const liveBlock = formatLiveMatchChanceQualityPromptBlock(liveChance);
    if (liveBlock) {
      lines.push("", liveBlock);
    } else {
      lines.push(
        "",
        "LIVE CHANCE INDEX: Insufficient live stats for an ESPN-derived estimate.",
        "  Use shots, SOT, key passes, and possession from MATCH INTEL — do not claim live xG or Opta xG numbers.",
      );
    }
  }

  return lines.join("\n");
}

/**
 * @param {Array<Record<string, unknown>>} matchDetails
 */
function formatInjuryBlock(matchDetails) {
  const rows = [];
  for (const d of matchDetails) {
    for (const inj of d.injuries || []) {
      rows.push(
        `  ${inj.teamAbbr ? `${inj.teamAbbr} ` : ""}${inj.name}${inj.status ? ` — ${inj.status}` : ""}${inj.detail ? ` (${inj.detail})` : ""}`,
      );
    }
  }
  const lines = ["INJURY / AVAILABILITY — verified ESPN structured fields only:"];
  if (rows.length) lines.push(...rows);
  else lines.push("  No structured injury data in verified feed for this fixture.");
  lines.push(`  ${WC_INJURY_UNCERTAINTY_RULE}`);
  lines.push(`  ${WC_INJURY_NOT_XI_RULE}`);
  return lines.join("\n");
}

/**
 * @param {Array<Record<string, unknown>>} results
 * @param {import("../shared/wcPhaseUtils.js").WcTournamentPhase} phase
 */
function selectResultsForPrompt(results, phase) {
  const rows = Array.isArray(results) ? results : [];
  if (!isKnockoutPhase(phase)) return rows.slice(-12);
  const knockout = rows.filter((m) => isKnockoutRound(m.round));
  return (knockout.length ? knockout : rows).slice(-8);
}

/**
 * @param {Array<Record<string, unknown>>} upcoming
 * @param {Array<Record<string, unknown>>} matches
 * @param {import("../shared/wcPhaseUtils.js").WcTournamentPhase} phase
 */
function selectUpcomingForPrompt(upcoming, matches, phase) {
  if (!isKnockoutPhase(phase)) {
    return (Array.isArray(upcoming) ? upcoming : []).slice(0, 10);
  }
  const ko = (matches || [])
    .filter((m) => isKnockoutRound(m.round) && isScheduled(m.status))
    .sort((a, b) => (Number(a.commenceTs) || 0) - (Number(b.commenceTs) || 0));
  if (ko.length) return ko.slice(0, 10);
  return (Array.isArray(upcoming) ? upcoming : []).slice(0, 6);
}

/**
 * @param {object} ctx
 * @returns {string}
 */
export function formatWorldCupUrTakePromptBlock(ctx) {
  if (!ctx || typeof ctx !== "object") return "";

  const tier =
    ctx.dataConfidence || deriveWcDataConfidence(ctx.matchDetails);
  const breaking = ctx.wcBreakingLine ?? getWcBreakingLine();
  const phase = ctx.phase || "PRE_GROUP";
  const groupsForPrompt = ctx.groupsForPrompt ?? ctx.groups ?? {};

  const lines = [
    "WORLD CUP 2026 — VERIFIED CONTEXT (use for all answers; do not claim missing tournament data)",
    `Tournament: ${ctx.tournament}`,
    `Hosts: ${(ctx.hosts || []).join(", ")}`,
    `Dates: ${ctx.dateRange}`,
    `Phase: ${phase}`,
    "",
    formatWorldCupPhaseRules(phase),
    "",
  ];

  if (ctx.knockoutAppendix) {
    lines.push(ctx.knockoutAppendix, "");
  }

  if (ctx.knockoutPhaseRules) {
    lines.push(ctx.knockoutPhaseRules, "");
  }

  if (ctx.staticRulesBlock) {
    lines.push(ctx.staticRulesBlock, "");
  }

  lines.push(
    formatWcDataConfidencePromptBlock(tier, ctx.matchDetails || []),
    "",
  );

  if (breaking) {
    lines.push("WC BREAKING (manual override — treat as authoritative over stale feed):", `  ${breaking}`, "");
  }

  const usmntMedia = buildWcUsmntMediaContextBlock(
    ctx.questionText || "",
    ctx.requiredEntities || [],
  );
  if (usmntMedia) {
    lines.push(usmntMedia, "");
  }

  const groupLetters = Object.keys(groupsForPrompt).sort();
  if (groupLetters.length) {
    lines.push(
      "STRENGTH TAGS (pre-tournament / baseline — never cite numeric power ratings or rating points):",
      "Favorite = group favorite · Contender = realistic knockout team · Longshot = upset/long-shot profile",
      "",
      groupLetters.length >= 12 ? "GROUPS (12 × 4 teams):" : "GROUPS (question-scoped):",
    );

    for (const letter of groupLetters) {
      const teams = groupsForPrompt[letter];
      if (!Array.isArray(teams) || !teams.length) continue;
      const teamBits = teams.map((t) => {
        const rec = t.hasResults
          ? `${t.name} (${t.strengthTag}, ${t.points} pts, ${t.won}W-${t.drawn}D-${t.lost}L)`
          : `${t.name} (${t.strengthTag})`;
        return rec;
      });
      lines.push(`  Group ${letter}: ${teamBits.join(" · ")}`);
    }
  } else if (!isKnockoutPhase(phase)) {
    lines.push("GROUPS: No group rows loaded for this question.");
  }

  if (ctx.groupClinchBlock) {
    lines.push("", ctx.groupClinchBlock);
  }

  if (ctx.venueBlock) {
    lines.push("", ctx.venueBlock);
  }

  if (Array.isArray(ctx.live) && ctx.live.length) {
    lines.push("", "LIVE NOW:");
    for (const m of ctx.live) {
      lines.push(
        `  ${m.homeTeam} ${m.homeScore ?? 0}-${m.awayScore ?? 0} ${m.awayTeam}${m.group ? ` (Group ${m.group})` : ""}`,
      );
    }
  }

  if (Array.isArray(ctx.results) && ctx.results.length) {
    lines.push("", "RESULTS (completed):");
    for (const m of ctx.results) {
      lines.push(
        `  ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam}${m.group ? ` Group ${m.group}` : ""} — ${m.date}`,
      );
    }
  }

  if (Array.isArray(ctx.upcoming) && ctx.upcoming.length) {
    lines.push("", isKnockoutPhase(phase) ? "UPCOMING KNOCKOUT FIXTURES:" : "UPCOMING FIXTURES:");
    for (const m of ctx.upcoming) {
      lines.push(
        `  ${m.homeTeam} vs ${m.awayTeam}${m.group ? ` (Group ${m.group})` : ""} — ${m.date} ${m.time || ""} ${m.stadium || m.city || ""}`.trim(),
      );
    }
  }

  if (Array.isArray(ctx.matchDetails) && ctx.matchDetails.length) {
    lines.push("");
    for (const d of ctx.matchDetails) {
      lines.push(formatMatchIntelBlock(d));
    }
    if (ctx.liveMatchRulesBlock) {
      lines.push("", ctx.liveMatchRulesBlock);
    }
    lines.push("", formatInjuryBlock(ctx.matchDetails));
  } else {
    lines.push("", "INJURY / AVAILABILITY:", `  ${WC_INJURY_UNCERTAINTY_RULE}`);
  }

  if (Array.isArray(ctx.fixtureOddsBlocks) && ctx.fixtureOddsBlocks.length) {
    lines.push("", "FIXTURE MATCH ODDS (question-scoped):");
    for (const block of ctx.fixtureOddsBlocks) {
      lines.push(block);
    }
  } else if (Array.isArray(ctx.fixtures) && ctx.fixtures.length) {
    const koFixture = ctx.fixtures.some((fx) => isKnockoutRound(fx.round));
    lines.push(
      "",
      "FIXTURE MATCH ODDS: No live 1X2 lines in verified feed for cited fixture(s).",
      koFixture
        ? "  Knockout fixture — use Elo structure for regulation lean only; advancement may require ET/pens (see KNOCKOUT STAGE RULES)."
        : "  Use Elo win/draw/loss structure only — do not invent match prices.",
    );
  }

  lines.push("");
  if (ctx.advancementMarketBlock) {
    lines.push("", ctx.advancementMarketBlock);
  }

  if (ctx.bdlFuturesBlock) {
    lines.push("", ctx.bdlFuturesBlock);
  }

  if (ctx.outrightsBlock) {
    lines.push(ctx.outrightsBlock);
  } else {
    lines.push(
      "CURRENT OUTRIGHT ODDS: No live outright odds available at this time.",
      '  If CURRENT OUTRIGHT ODDS is missing, stale, or says no live odds are available, never use the word "mispriced". Use structural language instead (e.g. "Based on group strength and tournament structure, this team should be priced...").',
      "  Do not invent odds under any circumstances.",
    );
  }

  if (ctx.tournamentSimBlock) {
    lines.push("", ctx.tournamentSimBlock);
    if (ctx.advancementMarketBlock) {
      lines.push(
        "  TOURNAMENT SIMULATION is UR internal model output (Poisson + Elo) — not market consensus. Label as sims when citing %.",
        "  Follow SIM STAT BINDING and ADVANCEMENT MARKET BINDING — do not swap group-advance % for Round of 16 reach.",
        "  Do not cite CURRENT OUTRIGHT ODDS as knockout-reach prices.",
      );
    } else {
      lines.push(
        "  TOURNAMENT SIMULATION is UR internal model output (Poisson + Elo) — not market consensus. Label as sims when citing win %.",
        "  Cite book prices from CURRENT OUTRIGHT ODDS when available — do not invent either.",
      );
    }
  }

  if (ctx.adjustedGoldenBootBlock) {
    lines.push("", ctx.adjustedGoldenBootBlock);
  }

  if (ctx.playerBioPromptBlock) {
    lines.push("", ctx.playerBioPromptBlock);
  }

  if (ctx.playerMarketPromptBlock) {
    lines.push("", ctx.playerMarketPromptBlock);
  }

  lines.push(
    "",
    "VOICE: JSON summary — lead with the answer in sentence one (team + verdict, no setup), then 2-3 support sentences, 150 words max. JSON deep — full reasoning, no word limit. Plain sentences in summary, no bullet lists, no disclaimers. Name teams and groups from this block.",
  );

  const text = lines.join("\n");
  return text.length > 12000 ? `${text.slice(0, 11997)}...` : text;
}

/**
 * Rules-only prompt slice — no group tables or betting context bloat.
 * @param {object} ctx
 */
export function formatWcRulesOnlyPromptBlock(ctx) {
  if (!ctx || typeof ctx !== "object") return "";
  const lines = [
    "WORLD CUP 2026 — TOURNAMENT RULES (factual reference — rules questions only)",
    `Tournament: ${ctx.tournament}`,
    `Hosts: ${(ctx.hosts || []).join(", ")}`,
    `Dates: ${ctx.dateRange}`,
    `Phase: ${ctx.phase || "PRE_GROUP"}`,
    "",
    ctx.staticRulesBlock || WC_STATIC_RULES_BLOCK,
  ];
  if (ctx.knockoutAppendix) {
    lines.push("", ctx.knockoutAppendix);
  }
  lines.push(
    "",
    "VOICE: JSON summary — lead with the direct factual answer in sentence one. No betting recommendations. No group-stage predictions unless the user asked about a specific team matchup.",
  );
  return lines.join("\n");
}

/**
 * Full World Cup board for UR Take — same role as buildNbaUrTakeBoard output.
 * @param {string} [question]
 * @returns {Promise<object|null>}
 */
async function loadWorldCupGroupsPayload() {
  const cached = await getDurableJson("wc2026_groups");
  if (cached?.groups && Object.keys(cached.groups).length && isKvFresh(cached.lastUpdated, WC_GROUPS_TTL_MS)) {
    return cached;
  }
  return getGroupsPayload();
}

async function loadWorldCupMatchesPayload() {
  const cached = await getDurableJson("wc2026_matches");
  if (cached?.matches?.length && isKvFresh(cached.lastUpdated, WC_MATCHES_TTL_MS)) {
    return cached;
  }
  return getMatchesPayload();
}

/**
 * @param {string} [question]
 * @param {{ wcIntent?: string, requiredEntities?: string[], injectStaticRules?: boolean, wcEventId?: string | null }} [opts]
 */
const WC_CONTEXT_TIMEOUT_MS = 25000;

export async function buildWorldCupUrTakeContext(question = "", opts = {}) {
  const contextPromise = _buildWorldCupUrTakeContextInner(question, opts);
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("WC context build timed out")), WC_CONTEXT_TIMEOUT_MS),
  );
  return Promise.race([contextPromise, timeout]);
}

async function _buildWorldCupUrTakeContextInner(question = "", opts = {}) {
  const wcIntent = opts.wcIntent || null;
  const injectStaticRules =
    opts.injectStaticRules ?? shouldInjectStaticRules(question, wcIntent || "");
  const nowMs = Date.now();

  try {
    await maybeWarmWcUrTakeKv(nowMs);
  } catch (warmErr) {
    console.warn("[wc-context] lazy warm failed:", warmErr?.message);
  }

  const [groupsPayload, matchesPayload, outrightsKv] = await Promise.all([
    loadWorldCupGroupsPayload().catch((err) => {
      console.warn("[wc-context] loadWorldCupGroupsPayload failed:", err?.message);
      return null;
    }),
    loadWorldCupMatchesPayload().catch((err) => {
      console.warn("[wc-context] loadWorldCupMatchesPayload failed:", err?.message);
      return null;
    }),
    readWcOutrightsFromKv(nowMs).catch((err) => {
      console.warn("[wc-context] readWcOutrightsFromKv failed:", err?.message);
      return null;
    }),
  ]);

  const staticGroups = buildStaticGroups();
  const groups = mergeStandingsIntoGroups(staticGroups, groupsPayload?.groups || {});
  const matches = Array.isArray(matchesPayload?.matches) ? matchesPayload.matches : [];

  const live = matches.filter((m) => isLiveStatus(m?.status));
  const results = matches.filter((m) => isFinished(m?.status));
  const upcoming = matches.filter((m) => isScheduled(m?.status));

  const mentionedTeams =
    Array.isArray(opts.requiredEntities) && opts.requiredEntities.length
      ? opts.requiredEntities.map((t) => String(t).toUpperCase())
      : extractMentionedWcTeams(question);
  const phase = getWorldCupPhase(matches);

  let effectiveEventId = String(opts.wcEventId || "").trim() || null;
  if (!effectiveEventId && isWcLiveDominanceQuestion(question)) {
    const livePinned = selectLiveFixtureForQuestion(matches, question, null);
    if (livePinned?.id) effectiveEventId = String(livePinned.id);
  }

  let fixtures = selectFixturesForQuestion(matches, mentionedTeams, effectiveEventId);
  if (!fixtures.length && isWcLiveDominanceQuestion(question)) {
    const liveFx = selectLiveFixtureForQuestion(matches, question, effectiveEventId);
    if (liveFx) fixtures = [liveFx];
  }
  /** @type {Array<Record<string, unknown>>} */
  const matchDetails = [];
  for (const fx of fixtures) {
    try {
      const detail = await readWcMatchDetailFromKv(fx.id);
      if (!detail) continue;
      let enriched = detail;
      try {
        const advancedStats = await readWcMatchAdvancedStatsForEvent(fx.id, nowMs);
        if (advancedStats) enriched = { ...enriched, advancedStats };
      } catch (advErr) {
        console.warn("[wc-context] readWcMatchAdvancedStatsForEvent failed for", fx.id, advErr?.message);
      }
      try {
        const apiLive = await readWcApiFootballLiveStatsForEvent(fx.id, nowMs);
        if (apiLive) enriched = { ...enriched, apiFootballLive: apiLive };
      } catch (apiErr) {
        console.warn("[wc-context] readWcApiFootballLiveStatsForEvent failed for", fx.id, apiErr?.message);
      }
      matchDetails.push(enriched);
    } catch (err) {
      console.warn("[wc-context] readWcMatchDetailFromKv failed for", fx.id, err?.message);
    }
  }

  const groupsForPrompt = selectGroupsForPrompt(groups, {
    phase,
    mentionedTeams,
    fixtures,
  });
  const knockoutAppendix = isKnockoutPhase(phase)
    ? formatKnockoutUrTakeAppendix(phase, matches, mentionedTeams, question)
    : null;
  const knockoutPhaseRules = formatKnockoutPhasePromptRules(phase);

  const resultsForPrompt = selectResultsForPrompt(results, phase);
  const upcomingForPrompt = selectUpcomingForPrompt(upcoming, matches, phase);

  const fixtureOddsBlocks = fixtures
    .map((fx) => buildMatchOddsFreshnessPromptBlock(fx, nowMs))
    .filter(Boolean);

  const scopedOutrightsKv = filterOutrightsForQuestion(outrightsKv, mentionedTeams);
  const dataConfidence = deriveWcDataConfidence(matchDetails);
  const outrightsBlock = formatOutrightsForPrompt(scopedOutrightsKv);
  const groupClinchBlock = !isKnockoutPhase(phase)
    ? formatGroupClinchWarnings(groups, matches, mentionedTeams)
    : null;
  const venueBlock = formatVenueWarningsForPrompt(fixtures);

  let tournamentSimBlock = null;
  let tournamentSimResults = null;
  try {
    const simResolved = await resolveWcTournamentSimForPrompt({
      groups: groupsPayload?.groups || groups,
      matches,
      mentionedTeams,
      question,
      nowMs,
    });
    if (simResolved?.promptBlock) {
      tournamentSimBlock = simResolved.promptBlock;
      tournamentSimResults = simResolved.simResults;
    }
  } catch (simErr) {
    console.warn("[wc-context] tournament sim resolve failed:", simErr?.message);
  }

  let adjustedGoldenBootBlock = null;
  let roundupPlayerKv = null;
  let playerBioPromptBlock = null;
  const needsPlayerBio =
    shouldInjectAdjustedGoldenBoot(wcIntent, question) || isWcPlayerMarketIntent(wcIntent);
  if (shouldInjectAdjustedGoldenBoot(wcIntent, question)) {
    try {
      const [goldenBootKv, playersKv] = await Promise.all([
        readWcGoldenBootFromKv(nowMs),
        readWcPlayersFromKv(),
      ]);
      roundupPlayerKv = { goldenBoot: goldenBootKv, players: playersKv };
      adjustedGoldenBootBlock = buildAdjustedGoldenBootPromptBlock({
        goldenBootKv,
        playersKv,
        tournamentSimResults,
        maxRows: 10,
      });
      if (needsPlayerBio) {
        const registry = buildResolvedWcPlayerRegistry(playersKv, nowMs);
        playerBioPromptBlock = buildWcPlayerBioPromptBlock(registry);
      }
    } catch (adjErr) {
      console.warn("[wc-context] adjusted Golden Boot block failed:", adjErr?.message);
    }
  } else if (needsPlayerBio) {
    try {
      const playersKv = await readWcPlayersFromKv();
      const registry = buildResolvedWcPlayerRegistry(playersKv, nowMs);
      playerBioPromptBlock = buildWcPlayerBioPromptBlock(registry);
    } catch (bioErr) {
      console.warn("[wc-context] player bio block failed:", bioErr?.message);
    }
  }

  const advancementMarketBlock = buildWcAdvancementMarketPromptBlock(question, mentionedTeams);

  let bdlFuturesBlock = null;
  try {
    const bdlSeed = await readWcBdlGoatSeedFromKv(nowMs);
    if (bdlSeed?.byMarketType && Object.keys(bdlSeed.byMarketType).length) {
      bdlFuturesBlock = buildWcBdlFuturesPromptBlock(bdlSeed, question, mentionedTeams, nowMs);
    }
  } catch (bdlErr) {
    console.warn("[wc-context] BDL seed read failed:", bdlErr?.message);
  }

  const ctx = {
    source: "world_cup_2026",
    questionText: question,
    advancementMarketBlock,
    bdlFuturesBlock,
    tournament: "2026 FIFA World Cup",
    hosts: ["USA", "Mexico", "Canada"],
    dateRange: "June 11 — July 19, 2026",
    phase,
    wcIntent,
    requiredEntities: mentionedTeams,
    staticRulesBlock: injectStaticRules ? WC_STATIC_RULES_BLOCK : null,
    groups,
    groupsForPrompt,
    knockoutAppendix,
    knockoutPhaseRules,
    groupClinchBlock,
    venueBlock,
    live,
    results: resultsForPrompt,
    upcoming: upcomingForPrompt,
    fixtures,
    matchDetails,
    fixtureOddsBlocks,
    dataConfidence,
    outrightsKv: outrightsKv?.outrights || null,
    outrightsBlock,
    tournamentSimBlock,
    tournamentSimResults,
    adjustedGoldenBootBlock,
    playerBioPromptBlock,
    roundupPlayerKv,
    wcEventId: effectiveEventId,
    liveMatchRulesBlock:
      matchDetails.some((d) => isLiveStatus(d.status)) && isWcLiveDominanceQuestion(question)
        ? WC_LIVE_MATCH_PROMPT_RULES
        : null,
    lastUpdated: Math.max(
      Number(groupsPayload?.lastUpdated) || 0,
      Number(matchesPayload?.lastUpdated) || 0,
      Number(outrightsKv?.lastUpdated) || 0,
      ...matchDetails.map((d) => Number(d.lastUpdated) || 0),
    ),
  };

  try {
    ctx.wcBreakingLine = await resolveWcBreakingLine();
  } catch (err) {
    console.warn("[wc-context] resolveWcBreakingLine failed:", err?.message);
    ctx.wcBreakingLine = null;
  }

  if (wcIntent === WC_INTENT.RULES) {
    ctx.promptBlock = formatWcRulesOnlyPromptBlock(ctx);
    return ctx.promptBlock ? ctx : null;
  }

  const wcEventIdTrimmed = effectiveEventId || String(opts.wcEventId || "").trim() || null;
  ctx.wcEventId = wcEventIdTrimmed;

  if (isWcPlayerMarketIntent(wcIntent)) {
    try {
      const playerMarketKv = await loadWcPlayerMarketKvBlocks(nowMs, {
        wcEventId: wcEventIdTrimmed,
        wcIntent,
        question,
      });
      const playerMarketTier = resolveWcPlayerMarketTier({
        goldenBoot: playerMarketKv.goldenBoot,
        players: playerMarketKv.players,
        injuries: playerMarketKv.injuries,
        matchPlayerProps: playerMarketKv.matchPlayerProps,
        wcEventId: wcEventIdTrimmed,
        wcContext: ctx,
        wcIntent,
      });
      const tierMeta = tierMetaFor(playerMarketTier);
      ctx.playerMarketKv = playerMarketKv;
      ctx.playerMarketTier = playerMarketTier;
      ctx.playerMarketPromptBlock = formatWcPlayerMarketsPromptBlock({
        tier: playerMarketTier,
        apiFootball: playerMarketKv.apiFootball,
        tierLabel: tierMeta.label,
        tierDisclaimer: tierMeta.disclaimer,
        wcIntent,
        goldenBoot: playerMarketKv.goldenBoot,
        players: playerMarketKv.players,
        injuries: playerMarketKv.injuries,
        matchDetails,
        matchPlayerProps: playerMarketKv.matchPlayerProps,
        wcEventId: wcEventIdTrimmed,
        tournamentSimResults,
      });
    } catch (err) {
      console.warn("[wc-context] player market KV load failed:", err?.message);
    }
  } else if (isWcLiveDominanceQuestion(question) && wcEventIdTrimmed) {
    try {
      ctx.playerMarketKv = await loadWcPlayerMarketKvBlocks(nowMs, {
        wcEventId: wcEventIdTrimmed,
        wcIntent: wcIntent || WC_INTENT.GENERAL,
        question,
      });
    } catch (err) {
      console.warn("[wc-context] live match KV load failed:", err?.message);
    }
  }

  ctx.promptBlock = formatWorldCupUrTakePromptBlock(ctx);
  if (!ctx.promptBlock) return null;

  const groupCount = Object.keys(groups).length;
  if (groupCount < 12) {
    ctx.lowGroupCoverage = true;
    ctx.promptBlock = [
      `WC DATA NOTE: Only ${groupCount}/12 groups loaded in verified feed — do not invent group math; cite teams you see only.`,
      ctx.promptBlock,
    ].join("\n");
  }

  return ctx;
}

/** @deprecated — use buildWorldCupUrTakeContext */
export async function buildWorldCupContext() {
  const ctx = await buildWorldCupUrTakeContext();
  return ctx?.promptBlock || "";
}
