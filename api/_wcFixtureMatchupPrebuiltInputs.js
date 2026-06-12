/**
 * Resolve match + sim inputs for WC fixture matchup prebuilt cards.
 */

import { readWcMatchesFromKv } from "./_wcData.js";
import { readWcTournamentSimFromKv, resolveWcTournamentSimForPrompt } from "./_wcTournamentSimData.js";
import { selectFixturesForQuestion } from "./_wcUrTakeContext.js";
import { buildStaticPromoMatchesFallback } from "../shared/wc2026PromoFixtures.js";
import {
  buildWcFixtureMatchupPrebuiltStructured,
  getWcFixtureMlSeed,
  resolveWcFixturePairFromHistory,
  resolveWcFixturePairFromQuestion,
} from "../shared/wcFixtureMatchupPrebuilt.js";

function isLiveOrScheduled(status) {
  const s = String(status || "").toLowerCase();
  return ["ns", "scheduled", "pre", "live", "ht", "1h", "2h", "in_progress"].includes(s);
}

/**
 * @param {Record<string, unknown> | null | undefined} match
 * @param {string} home
 * @param {string} away
 */
function attachSeedOddsIfMissing(match, home, away) {
  const row = match && typeof match === "object" ? { ...match } : {};
  if (row.odds && typeof row.odds === "object") return row;
  const seed = getWcFixtureMlSeed(home, away);
  if (!seed) return row.odds ? row : null;
  return { ...row, odds: seed, oddsUpdatedAt: Date.now() };
}

/**
 * @param {Array<Record<string, unknown>>} matches
 * @param {string} home
 * @param {string} away
 */
function findKvFixture(matches, home, away) {
  const h = String(home || "").toUpperCase();
  const a = String(away || "").toUpperCase();
  return (matches || []).find(
    (m) =>
      String(m.homeTeam || "").toUpperCase() === h &&
      String(m.awayTeam || "").toUpperCase() === a &&
      (isLiveOrScheduled(m.status)),
  );
}

/**
 * @param {{
 *   question: string,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   history?: Array<unknown>,
 *   nowMs?: number,
 * }} opts
 */
export async function resolveWcFixtureMatchupPrebuiltInputs(opts = {}) {
  const question = String(opts.question || "");
  const nowMs = Number(opts.nowMs) || Date.now();
  let pair = resolveWcFixturePairFromQuestion(question, {
    mentionedTeams: opts.mentionedTeams,
    wcEventId: opts.wcEventId,
  });
  if (!pair?.home || !pair?.away) {
    pair = resolveWcFixturePairFromHistory(opts.history);
  }
  if (!pair?.home || !pair?.away) return null;

  const [matchesKv, simRow] = await Promise.all([
    readWcMatchesFromKv().catch(() => null),
    readWcTournamentSimFromKv(undefined, nowMs).catch(() => null),
  ]);

  let matches = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  if (!matches.length) {
    matches = buildStaticPromoMatchesFallback(nowMs);
  }

  const mentioned = [pair.home, pair.away];
  const pinned = selectFixturesForQuestion(matches, mentioned, pair.eventId || opts.wcEventId);
  const kvHit = pinned[0] || findKvFixture(matches, pair.home, pair.away);
  const match = attachSeedOddsIfMissing(kvHit, pair.home, pair.away);
  if (!match?.odds) return null;

  let teamStats = simRow?.teamStats || null;
  if (!teamStats) {
    const simResolved = await resolveWcTournamentSimForPrompt({ nowMs }).catch(() => null);
    teamStats = simResolved?.simResults?.teamStats || null;
  }

  return {
    ...pair,
    match,
    teamStats,
    simLastUpdated: simRow?.lastUpdated,
    hasKvFixture: Boolean(kvHit),
    nowMs,
  };
}

/**
 * @param {{
 *   question: string,
 *   mentionedTeams?: string[],
 *   wcEventId?: string | null,
 *   history?: Array<unknown>,
 *   nowMs?: number,
 * }} opts
 */
export async function buildWcFixtureMatchupPrebuiltFromInputs(opts = {}) {
  const inputs = await resolveWcFixtureMatchupPrebuiltInputs(opts);
  if (!inputs) return null;
  return buildWcFixtureMatchupPrebuiltStructured({
    home: inputs.home,
    away: inputs.away,
    group: inputs.group,
    question: opts.question,
    match: inputs.match,
    teamStats: inputs.teamStats,
    simLastUpdated: inputs.simLastUpdated,
    nowMs: inputs.nowMs,
  });
}
