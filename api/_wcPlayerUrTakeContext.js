/**
 * World Cup UR Take — player market KV blocks for Golden Boot / props / injuries.
 */

import { readWcGoldenBootFromKv } from "./_wcGoldenBootOdds.js";
import { readWcInjuriesFromKv } from "./_wcInjuriesData.js";
import { readWcPlayersFromKv } from "./_wcPlayersData.js";
import { readWcMatchPlayerPropsForEvent, ensureWcBdlMatchPlayerPropsForEvent } from "./_wcMatchPlayerProps.js";
import { isWcGoatPrimaryEnabled } from "../shared/wcBdlPolicy.js";
import { goldenBootRowsFromKv } from "../shared/wcPlayerOddsFreshness.js";
import {
  topRegistryAssists,
  topRegistryRedCards,
  topRegistryScorers,
  topRegistryYellowCards,
  countRegistryPlayers,
} from "../shared/wcPlayerRegistry.js";
import {
  WC_GOLDEN_BOOT_MAX_AGE_MS,
  WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
} from "../shared/wc2026PlayerConstants.js";
import { calculateOddsFreshness } from "../shared/wcOddsFreshness.js";
import { formatWcPlayerMarketPromptRules, isWcFixturePlayerPropsQuestion, isGenericWcPlayerPropQuestion } from "../shared/wcUrTakePlayerMarket.js";
import { extractMentionedWcTeams } from "../shared/wcUrTakeKeywords.js";
import { resolveWcEventIdForFixtureTeams, resolveWcPlayerPropSlateFixtureTeams, resolveWcPlayerPropFixtureTeams } from "../shared/wcPlayerPropFixture.js";
import { resolveWcFixturePairFromHistory } from "../shared/wcFixtureMatchupPrebuilt.js";
import { detectParlayIntent } from "../shared/detectParlayIntent.js";
import {
  formatMatchPlayerPropRowForPrompt,
  hasMatchPlayerPropRows,
  kvHasFreshMatchPlayerProps,
  matchPlayerPropRowsFromEvent,
  WC_MATCH_PLAYER_PROP_MARKET_KEYS,
  WC_MATCH_PLAYER_PROP_PROMPT_LABELS,
} from "../shared/wcMatchPlayerProps.js";
import { WC_INTENT } from "../shared/wcUrTakeIntent.js";
import { isWcLiveDominanceQuestion } from "../shared/wcLiveMatchQuestion.js";
import { WC_SET_PIECE_TAKERS } from "../src/data/wc2026SetPieceTakers.js";
import {
  adjustGoldenBootOdds,
  formatAdjustedGoldenBootForPrompt,
} from "../shared/wcGoldenBootAdjusted.js";

/**
 * @param {number} [nowMs]
 * @param {{ wcEventId?: string | null, wcIntent?: string, question?: string, matches?: Array<Record<string, unknown>>, conversationHistory?: object[] }} [opts]
 * @returns {Promise<{ players: object | null, goldenBoot: object | null, injuries: object | null, matchPlayerProps: object | null, wcEventId: string | null }>}
 */
export async function loadWcPlayerMarketKvBlocks(nowMs = Date.now(), opts = {}) {
  const question = String(opts.question || "");
  let wcEventId = String(opts.wcEventId || "").trim() || null;
  const history = Array.isArray(opts.conversationHistory) ? opts.conversationHistory : [];
  const teamContext = {
    requiredEntities: Array.isArray(opts.requiredEntities)
      ? opts.requiredEntities
      : extractMentionedWcTeams(question),
    conversationHistory: history,
  };

  if (!wcEventId) {
    const historyPair = resolveWcFixturePairFromHistory(history);
    if (historyPair?.eventId) {
      wcEventId = String(historyPair.eventId).trim() || null;
    }
  }

  const shouldPinFixtureFromQuestion =
    isWcFixturePlayerPropsQuestion(question) ||
    detectParlayIntent(question) ||
    (opts.wcIntent === WC_INTENT.PLAYER_PROP && isGenericWcPlayerPropQuestion(question));

  if (!wcEventId && shouldPinFixtureFromQuestion && Array.isArray(opts.matches)) {
    const teams = resolveWcPlayerPropFixtureTeams(question, history, teamContext);
    if (teams.length >= 2) {
      wcEventId = resolveWcEventIdForFixtureTeams(opts.matches, teams[0], teams[1]);
    }
  }

  const loadMatchProps =
    Boolean(wcEventId) &&
    (opts.wcIntent === WC_INTENT.PLAYER_PROP ||
      isWcLiveDominanceQuestion(question) ||
      isWcFixturePlayerPropsQuestion(question) ||
      detectParlayIntent(question) ||
      isGenericWcPlayerPropQuestion(question));

  const [players, goldenBoot, injuries, matchPlayerProps] = await Promise.all([
    readWcPlayersFromKv(),
    readWcGoldenBootFromKv(nowMs),
    readWcInjuriesFromKv(),
    loadMatchProps
      ? (async () => {
          if (isWcGoatPrimaryEnabled()) {
            const live = await ensureWcBdlMatchPlayerPropsForEvent(wcEventId);
            if (live) return live;
          }
          return readWcMatchPlayerPropsForEvent(wcEventId, nowMs);
        })()
      : Promise.resolve(null),
  ]);
  return { players, goldenBoot, injuries, matchPlayerProps, wcEventId };
}

const MATCH_PROPS_MEMORY_CACHE = new Map();
const MATCH_PROPS_MEMORY_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * @param {object | null | undefined} kvBlocks
 * @param {object} [opts]
 */
function wcPlayerMarketKvBlocksAreUsable(kvBlocks, opts = {}) {
  if (!kvBlocks?.matchPlayerProps) return false;
  const history = Array.isArray(opts.conversationHistory) ? opts.conversationHistory : [];
  const teams = resolveWcPlayerPropFixtureTeams(String(opts.question || ""), history, {
    requiredEntities: opts.requiredEntities,
    conversationHistory: history,
  });
  const eventId = String(kvBlocks?.wcEventId || opts.wcEventId || "").trim();
  if (
    !kvHasFreshMatchPlayerProps(kvBlocks.matchPlayerProps, {
      eventId,
      question: String(opts.question || ""),
      teams,
      nowMs: opts.nowMs,
    })
  ) {
    return false;
  }
  return matchPlayerPropRowsFromEvent(kvBlocks.matchPlayerProps, "anytime_scorer", 6).length >= 2;
}

function readMatchPropsMemoryCache(eventId) {
  const key = String(eventId || "").trim();
  if (!key) return null;
  const hit = MATCH_PROPS_MEMORY_CACHE.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > MATCH_PROPS_MEMORY_CACHE_TTL_MS) {
    MATCH_PROPS_MEMORY_CACHE.delete(key);
    return null;
  }
  return hit.payload;
}

function writeMatchPropsMemoryCache(eventId, payload) {
  const key = String(eventId || "").trim();
  if (!key || !payload) return;
  MATCH_PROPS_MEMORY_CACHE.set(key, { at: Date.now(), payload });
}

/**
 * Eager KV load with retry/backoff for cold Vercel starts (BDL hydrate can lag first read).
 * @param {number} [nowMs]
 * @param {Parameters<typeof loadWcPlayerMarketKvBlocks>[1]} [opts]
 * @param {{ maxRetries?: number, backoffMs?: number, timeoutMs?: number }} [retryOpts]
 */
export async function loadWcPlayerMarketKvBlocksWithRetry(
  nowMs = Date.now(),
  opts = {},
  retryOpts = {},
) {
  const maxRetries = retryOpts.maxRetries ?? 3;
  const backoffMs = retryOpts.backoffMs ?? 600;
  const timeoutMs = retryOpts.timeoutMs ?? 6500;
  const start = Date.now();
  const eventIdHint = String(opts.wcEventId || "").trim();

  if (eventIdHint) {
    const cached = readMatchPropsMemoryCache(eventIdHint);
    if (cached && wcPlayerMarketKvBlocksAreUsable(cached, { ...opts, wcEventId: eventIdHint, nowMs })) {
      return {
        ...cached,
        loadMeta: { attempts: 0, coldStart: false, fromCache: true, loadMs: 0, failed: false },
      };
    }
  }

  /** @type {Awaited<ReturnType<typeof loadWcPlayerMarketKvBlocks>> | null} */
  let last = null;
  /** @type {Error | null} */
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const elapsed = Date.now() - start;
    if (elapsed >= timeoutMs) break;
    try {
      const remaining = Math.max(400, timeoutMs - elapsed);
      last = await Promise.race([
        loadWcPlayerMarketKvBlocks(nowMs, opts),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("wc_player_props_kv_timeout")), remaining);
        }),
      ]);
      const eventId = String(last?.wcEventId || eventIdHint || "").trim();
      if (eventId && wcPlayerMarketKvBlocksAreUsable(last, { ...opts, wcEventId: eventId, nowMs })) {
        writeMatchPropsMemoryCache(eventId, last);
        const loadMs = Date.now() - start;
        console.log(
          JSON.stringify({
            event: "wc_player_props_kv_loaded",
            wcEventId: eventId,
            attempt,
            loadMs,
            coldStart: attempt > 0,
          }),
        );
        return {
          ...last,
          loadMeta: {
            attempts: attempt + 1,
            coldStart: attempt > 0,
            fromCache: false,
            loadMs,
            failed: false,
          },
        };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < maxRetries && Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, backoffMs * (attempt + 1)));
    }
  }

  const loadMs = Date.now() - start;
  console.error(
    JSON.stringify({
      event: "wc_player_props_kv_failed",
      wcEventId: eventIdHint || last?.wcEventId || null,
      attempts: maxRetries + 1,
      loadMs,
      error: lastError?.message || "no_usable_rows",
    }),
  );
  return {
    ...(last || {
      players: null,
      goldenBoot: null,
      injuries: null,
      matchPlayerProps: null,
      wcEventId: eventIdHint || null,
    }),
    loadMeta: {
      attempts: maxRetries + 1,
      coldStart: true,
      fromCache: false,
      loadMs,
      failed: true,
    },
  };
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
  const topYellow = topRegistryYellowCards(players, 8).filter(
    (p) => (Number(p.yellowCardsTournament) || 0) > 0,
  );
  const topRed = topRegistryRedCards(players, 6).filter((p) => (Number(p.redCardsTournament) || 0) > 0);
  if (!topGoals.length && !topAssists.length && !topYellow.length && !topRed.length) return [];

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

  if (topYellow.length) {
    lines.push("SQUAD / FORM — tournament yellow card leaders (verified match intel):");
    for (const p of topYellow) {
      const yellow = Number(p.yellowCardsTournament) || 0;
      lines.push(`  ${p.name} (${p.nationAbbr}) — ${yellow} yellow`);
    }
  }

  if (topRed.length) {
    lines.push("SQUAD / FORM — tournament red card leaders (verified match intel):");
    for (const p of topRed) {
      const red = Number(p.redCardsTournament) || 0;
      lines.push(`  ${p.name} (${p.nationAbbr}) — ${red} red`);
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
 * @param {string} [opts.question]
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
    question = "",
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
    formatWcPlayerMarketPromptRules(wcIntent, question),
    "",
  ];

  const eventId = String(wcEventId || matchPlayerProps?.eventId || "").trim();

  if (eventId && hasMatchPlayerPropRows(matchPlayerProps)) {
    const mpFresh =
      matchPlayerProps?.freshness ||
      calculateOddsFreshness(
        matchPlayerProps?.lastUpdated,
        WC_MATCH_PLAYER_PROPS_MAX_AGE_MS,
      );
    lines.push(
      `MATCH PLAYER PROPS — event ${eventId} (binding for this fixture; prefer over tournament Golden Boot when answering match-scoped player asks):`,
      `  Source: ${String(matchPlayerProps?.source || "consensus")}`,
      `  Books: ${(matchPlayerProps?.booksUsed || []).join(", ") || "unknown"}`,
      `  Fixture: ${matchPlayerProps?.awayTeam || "?"} @ ${matchPlayerProps?.homeTeam || "?"}`,
      `  Freshness: ${mpFresh.ageText}${mpFresh.isStale ? " — STALE" : ""}`,
      "  Cite only player names and American prices listed below — do not invent assist/card/SOT lines.",
      "",
    );

    for (const marketKey of WC_MATCH_PLAYER_PROP_MARKET_KEYS) {
      const limit =
        marketKey === "anytime_scorer"
          ? 18
          : marketKey === "first_goalscorer"
            ? 8
            : 12;
      const rows = matchPlayerPropRowsFromEvent(matchPlayerProps, marketKey, limit);
      if (!rows.length) continue;
      lines.push(`  ${WC_MATCH_PLAYER_PROP_PROMPT_LABELS[marketKey]}:`);
      for (const r of rows) {
        lines.push(`    ${formatMatchPlayerPropRowForPrompt(marketKey, r)}`);
      }
      lines.push("");
    }
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
