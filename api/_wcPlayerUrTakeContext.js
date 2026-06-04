/**
 * World Cup UR Take — player market KV blocks for Golden Boot / props / injuries.
 */

import { readWcGoldenBootFromKv } from "./_wcGoldenBootOdds.js";
import { readWcInjuriesFromKv } from "./_wcInjuriesData.js";
import { readWcPlayersFromKv } from "./_wcPlayersData.js";
import { goldenBootRowsFromKv } from "../shared/wcPlayerOddsFreshness.js";
import { topRegistryScorers, countRegistryPlayers } from "../shared/wcPlayerRegistry.js";
import { WC_GOLDEN_BOOT_MAX_AGE_MS } from "../shared/wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "../shared/wcOddsFreshness.js";
import { formatWcPlayerMarketPromptRules } from "../shared/wcUrTakePlayerMarket.js";

/**
 * @returns {Promise<{ players: object | null, goldenBoot: object | null, injuries: object | null }>}
 */
export async function loadWcPlayerMarketKvBlocks(nowMs = Date.now()) {
  const [players, goldenBoot, injuries] = await Promise.all([
    readWcPlayersFromKv(),
    readWcGoldenBootFromKv(nowMs),
    readWcInjuriesFromKv(),
  ]);
  return { players, goldenBoot, injuries };
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
  const top = topRegistryScorers(players, 10);
  if (!top.length) return [];
  const lines = ["SQUAD / FORM (tournament goals from verified match intel):"];
  for (const p of top) {
    const goals = Number(p.goalsTournament) || 0;
    const tag = p.isStarterLikely ? " · likely starter" : "";
    lines.push(
      `  ${p.name} (${p.nationAbbr}) — ${goals} goal(s)${tag}${p.injuryStatus ? ` · ${p.injuryStatus}` : ""}`,
    );
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

  const squadLines = formatSquadLeadersForPrompt(players);
  if (squadLines.length) {
    lines.push(...squadLines, "");
  } else if (counts.playerCount > 0) {
    lines.push(`SQUAD INDEX: ${counts.playerCount} players across ${counts.teamCount} nations in KV.`, "");
  }

  lines.push(...formatInjuriesBoardForPrompt(injuries), "");

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
