/**
 * World Cup UR Take — player market KV blocks for Golden Boot / props / injuries.
 */

import { readWcGoldenBootFromKv } from "./_wcGoldenBootOdds.js";
import { readWcInjuriesFromKv } from "./_wcInjuriesData.js";
import { readWcPlayersFromKv } from "./_wcPlayersData.js";
import { readWcMatchPlayerPropsForEvent } from "./_wcMatchPlayerProps.js";
import { goldenBootRowsFromKv } from "../shared/wcPlayerOddsFreshness.js";
import {
  topRegistryAssists,
  topRegistryScorers,
  countRegistryPlayers,
} from "../shared/wcPlayerRegistry.js";
import {
  WC_GOLDEN_BOOT_MAX_AGE_MS,
  WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
} from "../shared/wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "../shared/wcOddsFreshness.js";
import { formatWcPlayerMarketPromptRules } from "../shared/wcUrTakePlayerMarket.js";
import {
  matchPlayerPropRowsFromEvent,
} from "../shared/wcMatchPlayerProps.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import { WC_SET_PIECE_TAKERS } from "../src/data/wc2026SetPieceTakers.js";
import {
  adjustGoldenBootOdds,
  formatAdjustedGoldenBootForPrompt,
} from "../shared/wcGoldenBootAdjusted.js";

/**
 * @param {number} [nowMs]
 * @param {{ wcEventId?: string | null, wcIntent?: string }} [opts]
 * @returns {Promise<{ players: object | null, goldenBoot: object | null, injuries: object | null, matchPlayerProps: object | null, wcEventId: string | null }>}
 */
export async function loadWcPlayerMarketKvBlocks(nowMs = Date.now(), opts = {}) {
  const wcEventId = String(opts.wcEventId || "").trim() || null;
  const loadMatchProps = wcEventId && opts.wcIntent === WC_INTENT.PLAYER_PROP;

  const [players, goldenBoot, injuries, matchPlayerProps] = await Promise.all([
    readWcPlayersFromKv(),
    readWcGoldenBootFromKv(nowMs),
    readWcInjuriesFromKv(),
    loadMatchProps ? readWcMatchPlayerPropsForEvent(wcEventId, nowMs) : Promise.resolve(null),
  ]);
  return { players, goldenBoot, injuries, matchPlayerProps, wcEventId };
}

/**
 * @param {object | null | undefined} injuries
 */
function formatInjuriesBoardForPrompt(injuries) {
  if (!injuries?.rows?.length) {
    return ["INJURIES (tournament):", "  No aggregated injury rows in KV — do not invent availability."];
  }
  const lines = ["INJURIES (tournament — binding):", `  Source: ${String(injuries.source || "espn")}`];
  const high = (injuries.rows || []).filter((r) => r.impact === "high").slice(0, 8);
  const rest = (injuries.rows || []).filter((r) => r.impact !== "high").slice(0, 6);
  for (const r of [...high, ...rest]) {
    const status = r.status ? ` — ${r.status}` : "";
    lines.push(`  ${r.name}${r.teamAbbr ? ` (${r.teamAbbr})` : ""}${status}`);
  }
  if (injuries.starsOut?.length) {
    lines.push(`  Stars flagged OUT/doubtful: ${injuries.starsOut.join(", ")}`);
  }
  return lines;
}

/**
 * @param {object | null | undefined} players
 */
function formatSquadLeadersForPrompt(players) {
  const topGoals = topRegistryScorers(players, 10).filter((p) => (Number(p.goalsTournament) || 0) > 0);
  const topAssists = topRegistryAssists(players, 8).filter((p) => (Number(p.assistsTournament) || 0) > 0);
  if (!topGoals.length && !topAssists.length) return [];

  /** @type {string[]} */
  const lines = [];

  if (topGoals.length) {
    lines.push("SQUAD / FORM — tournament goal leaders (verified match intel):");
    for (const p of topGoals) {
      const goals = Number(p.goalsTournament) || 0;
      const assists = Number(p.assistsTournament) || 0;
      const assistBit = assists > 0 ? `, ${assists} assist(s)` : "";
      const tag = p.isStarterLikely ? " · likely starter" : "";
      lines.push(
        `  ${p.name} (${p.nationAbbr}) — ${goals} goal(s)${assistBit}${tag}${p.injuryStatus ? ` · ${p.injuryStatus}` : ""}`,
      );
    }
  }

  if (topAssists.length) {
    lines.push("SQUAD / FORM — tournament assist leaders (verified match intel):");
    for (const p of topAssists) {
      const assists = Number(p.assistsTournament) || 0;
      const goals = Number(p.goalsTournament) || 0;
      const goalBit = goals > 0 ? `, ${goals} goal(s)` : "";
      const tag = p.isStarterLikely ? " · likely starter" : "";
      lines.push(
        `  ${p.name} (${p.nationAbbr}) — ${assists} assist(s)${goalBit}${tag}${p.injuryStatus ? ` · ${p.injuryStatus}` : ""}`,
      );
    }
  }

  return lines;
}

/**
 * Set piece taker context for match-scoped or tournament player market prompts.
 * @param {Array<Record<string, unknown>>} matchDetails
 * @param {object | null | undefined} matchPlayerProps
 */
function formatSetPieceTakersForPrompt(matchDetails, matchPlayerProps) {
  const teams = new Set();
  for (const d of matchDetails || []) {
    if (d?.homeTeam) teams.add(String(d.homeTeam).toUpperCase());
    if (d?.awayTeam) teams.add(String(d.awayTeam).toUpperCase());
  }
  if (matchPlayerProps?.homeTeam) teams.add(String(matchPlayerProps.homeTeam).toUpperCase());
  if (matchPlayerProps?.awayTeam) teams.add(String(matchPlayerProps.awayTeam).toUpperCase());

  if (!teams.size) return [];
  const rows = WC_SET_PIECE_TAKERS.filter((r) => teams.has(r.nationAbbr));
  if (!rows.length) return [];

  const lines = ["SET PIECE SPECIALISTS (seed — factor into scorer probability):"];
  for (const r of rows) {
    const parts = [`PK: ${r.penaltyTaker}`];
    if (r.freeKick) parts.push(`FK: ${r.freeKick}`);
    if (r.corners) parts.push(`CK: ${r.corners}`);
    lines.push(`  ${r.nationAbbr}: ${parts.join(" · ")}`);
  }
  return lines;
}

/**
 * @param {object} opts
 * @param {string} opts.tier
 * @param {string} opts.tierLabel
 * @param {string} opts.tierDisclaimer
 * @param {string} opts.wcIntent
 * @param {object | null | undefined} opts.goldenBoot
 * @param {object | null | undefined} opts.players
 * @param {object | null | undefined} opts.injuries
 * @param {Array<Record<string, unknown>>} [opts.matchDetails]
 * @param {object | null | undefined} [opts.matchPlayerProps]
 * @param {string | null | undefined} [opts.wcEventId]
 */
export function formatWcPlayerMarketsPromptBlock(opts = {}) {
  const {
    tier,
    tierLabel,
    tierDisclaimer,
    wcIntent,
    goldenBoot,
    players,
    injuries,
    matchDetails = [],
    matchPlayerProps = null,
    wcEventId = null,
    tournamentSimResults = null,
  } = opts;

  const gbRows = goldenBootRowsFromKv(goldenBoot, 15);
  const freshness =
    goldenBoot?.freshness ||
    calculateOddsFreshness(goldenBoot?.lastUpdated, WC_GOLDEN_BOOT_MAX_AGE_MS);
  const counts = countRegistryPlayers(players || {});

  const lines = [
    "PLAYER MARKETS — VERIFIED CONTEXT (binding)",
    `  Tier: ${tier} (${tierLabel})`,
    `  ${tierDisclaimer}`,
    "",
    formatWcPlayerMarketPromptRules(wcIntent),
    "",
  ];

  const eventId = String(wcEventId || matchPlayerProps?.eventId || "").trim();
  const anytimeRows = matchPlayerPropRowsFromEvent(matchPlayerProps, "anytime_scorer", 18);
  const firstRows = matchPlayerPropRowsFromEvent(matchPlayerProps, "first_goalscorer", 10);

  if (eventId && anytimeRows.length) {
    const mpFresh =
      matchPlayerProps?.freshness ||
      calculateOddsFreshness(
        matchPlayerProps?.lastUpdated,
        WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
      );
    lines.push(
      `MATCH PLAYER PROPS — event ${eventId} (binding for this fixture; prefer over tournament Golden Boot when answering match-scoped asks):`,
      `  Source: ${String(matchPlayerProps?.source || "consensus")}`,
      `  Books: ${(matchPlayerProps?.booksUsed || []).join(", ") || "unknown"}`,
      `  Fixture: ${matchPlayerProps?.awayTeam || "?"} @ ${matchPlayerProps?.homeTeam || "?"}`,
      `  Freshness: ${mpFresh.ageText}${mpFresh.isStale ? " — STALE" : ""}`,
      "",
      "  ANYTIME GOALSCORER (cite only prices below):",
    );
    for (const r of anytimeRows) {
      const team = r.nationAbbr ? ` (${r.nationAbbr})` : "";
      lines.push(`    ${r.name}${team}: ${r.americanOdds}`);
    }
    if (firstRows.length) {
      lines.push("", "  FIRST GOALSCORER:");
      for (const r of firstRows.slice(0, 8)) {
        const team = r.nationAbbr ? ` (${r.nationAbbr})` : "";
        lines.push(`    ${r.name}${team}: ${r.americanOdds}`);
      }
    }
    lines.push("");
  }

  if (gbRows.length) {
    lines.push(
      "GOLDEN BOOT / TOP SCORER ODDS (consensus across books + ESPN; cite only prices below):",
      `  Source: ${String(goldenBoot?.source || "consensus")}`,
      `  Books: ${(goldenBoot?.booksUsed || []).join(", ") || "unknown"}`,
      `  Freshness: ${freshness.ageText}${freshness.isStale ? " — STALE" : ""}`,
    );
    for (const r of gbRows) {
      const team = r.nationAbbr ? ` (${r.nationAbbr})` : "";
      lines.push(`  ${r.name}${team}: ${r.americanOdds}`);
    }
    if (freshness.isStale) {
      lines.push(
        "  ODDS FRESHNESS: Golden Boot lines are stale — cite prices as reference only, not live edges.",
      );
    }
    lines.push("");
  } else {
    lines.push(
      "GOLDEN BOOT / TOP SCORER ODDS: No rows in KV — use SQUAD / FORM names only; do not invent prices.",
      "",
    );
  }

  if (gbRows.length && tournamentSimResults?.teamStats) {
    const adjusted = adjustGoldenBootOdds(gbRows, {
      teamStats: tournamentSimResults.teamStats,
      playerRegistry: players?.teams || {},
    });
    const adjustedBlock = formatAdjustedGoldenBootForPrompt(adjusted, 12);
    if (adjustedBlock) {
      lines.push(adjustedBlock, "");
    }
  }

  const squadLines = formatSquadLeadersForPrompt(players);
  if (squadLines.length) {
    lines.push(...squadLines, "");
  } else if (counts.playerCount > 0) {
    const rosterNote = counts.playerCount >= 1248 ? "complete official FIFA 26-man rosters (static source)" : "players in KV";
    lines.push(`SQUAD INDEX: ${counts.playerCount} players across ${counts.teamCount} nations — ${rosterNote}.`, "");
  }

  lines.push(...formatInjuriesBoardForPrompt(injuries), "");

  lines.push(...formatSetPieceTakersForPrompt(matchDetails, matchPlayerProps), "");

  const confirmed = (matchDetails || []).filter((d) => d?.lineupConfirmed === true);
  if (confirmed.length) {
    lines.push("CONFIRMED XI (question-scoped fixtures):");
    for (const d of confirmed.slice(0, 2)) {
      lines.push(`  ${d.homeTeam} vs ${d.awayTeam} — lineupConfirmed: yes`);
      for (const side of ["home", "away"]) {
        const starters = d?.lineups?.[side]?.starters || [];
        const names = starters
          .map((p) => p?.name)
          .filter(Boolean)
          .slice(0, 11)
          .join(", ");
        if (names) lines.push(`    ${side}: ${names}`);
      }
    }
    lines.push("");
  } else {
    lines.push(
      "LINEUPS: No confirmed starting XI in KV for cited fixtures — do not name expected starters as fact.",
      "",
    );
  }

  return lines.join("\n");
}
