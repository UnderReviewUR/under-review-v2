/**
 * Resolve WC sim fixture-local pre-match form from match detail KV (no live BDL calls).
 */

import { readWcMatchDetailFromKv, readWcMatchesFromKv } from "./_wcData.js";
import { summarizeBdlTeamForm } from "../shared/wcBdlMatchIntel.js";
import {
  buildFixtureFormKey,
  buildSimFormFingerprintSuffix,
} from "../shared/wcFormBump.js";
import { isWcFinishedMatchStatus } from "../shared/wcTournamentSim.js";

/**
 * @param {Record<string, unknown>} match
 */
export function isUnplayedWcFixture(match) {
  if (isWcFinishedMatchStatus(match?.status)) return false;
  const hs = Number(match?.homeScore);
  const as = Number(match?.awayScore);
  if (Number.isFinite(hs) && Number.isFinite(as)) return false;
  return Boolean(String(match?.homeTeam || "").trim() && String(match?.awayTeam || "").trim());
}

/**
 * @param {Array<Record<string, unknown>>} matches
 */
export function filterUnplayedWcFixtures(matches) {
  return (matches || []).filter(isUnplayedWcFixture);
}

/**
 * @param {Record<string, unknown>} match
 * @param {Record<string, unknown> | null | undefined} detail
 */
export function buildFormEntryFromMatchDetail(match, detail) {
  const home = String(match?.homeTeam || detail?.homeTeam || "")
    .trim()
    .toUpperCase();
  const away = String(match?.awayTeam || detail?.awayTeam || "")
    .trim()
    .toUpperCase();
  if (!home || !away) return null;

  const eventId = String(match?.id || "");
  const rawForm = detail?.bdlGoat?.teamForm;
  if (!rawForm) return null;

  /** @type {{ avgRating?: number | null } | null | undefined} */
  let homeRow;
  /** @type {{ avgRating?: number | null } | null | undefined} */
  let awayRow;

  if (rawForm.home || rawForm.away) {
    homeRow = rawForm.home;
    awayRow = rawForm.away;
  } else if (Array.isArray(rawForm)) {
    const summarized = summarizeBdlTeamForm(rawForm, home, away);
    homeRow = summarized?.home;
    awayRow = summarized?.away;
  } else {
    return null;
  }

  /** @type {Record<string, { avgRating: number, sourceEventId: string }>} */
  const teams = {};
  if (Number.isFinite(Number(homeRow?.avgRating))) {
    teams[home] = { avgRating: Number(homeRow.avgRating), sourceEventId: eventId };
  }
  if (Number.isFinite(Number(awayRow?.avgRating))) {
    teams[away] = { avgRating: Number(awayRow.avgRating), sourceEventId: eventId };
  }
  if (!Object.keys(teams).length) return null;

  return {
    key: buildFixtureFormKey(home, away),
    teams,
  };
}

/**
 * @param {Array<Record<string, unknown>>} unplayedMatches
 * @param {Record<string, Record<string, { avgRating: number, sourceEventId: string }>>} formByFixture
 */
export function summarizeFormInputs(formByFixture, unplayedMatches = []) {
  const entries = Object.values(formByFixture || {});
  const ratings = [];
  const teamSet = new Set();

  for (const row of entries) {
    for (const [abbr, meta] of Object.entries(row || {})) {
      if (Number.isFinite(Number(meta?.avgRating))) {
        ratings.push(Number(meta.avgRating));
        teamSet.add(String(abbr).toUpperCase());
      }
    }
  }

  return {
    formByFixture: formByFixture || {},
    formFixturesResolved: entries.length,
    formTeamsAffected: teamSet.size,
    formRatingMin: ratings.length ? Math.min(...ratings) : null,
    formRatingMax: ratings.length ? Math.max(...ratings) : null,
    formFingerprint: buildSimFormFingerprintSuffix({
      formFixturesResolved: entries.length,
      formTeamsAffected: teamSet.size,
      formRatingMin: ratings.length ? Math.min(...ratings) : null,
      formRatingMax: ratings.length ? Math.max(...ratings) : null,
    }),
    unplayedFixtureCount: unplayedMatches.length,
  };
}

/**
 * @param {Array<Record<string, unknown>>} [matches]
 * @param {{ concurrency?: number }} [opts]
 */
export async function resolveWcSimFormFromKv(matches = null, opts = {}) {
  let fixtureList = matches;
  if (!Array.isArray(fixtureList)) {
    const matchesKv = await readWcMatchesFromKv(Number.MAX_SAFE_INTEGER).catch(() => null);
    fixtureList = Array.isArray(matchesKv?.matches) ? matchesKv.matches : [];
  }

  const unplayed = filterUnplayedWcFixtures(fixtureList).filter(
    (m) => !String(m?.id || "").startsWith("wc-promo-"),
  );
  if (!unplayed.length) {
    return summarizeFormInputs({}, []);
  }

  /** @type {Record<string, Record<string, { avgRating: number, sourceEventId: string }>>} */
  const formByFixture = {};
  const concurrency = Math.max(1, Math.min(Number(opts.concurrency) || 8, 16));

  for (let i = 0; i < unplayed.length; i += concurrency) {
    const batch = unplayed.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (match) => {
        const eventId = String(match?.id || "");
        if (!eventId) return;
        const detail = await readWcMatchDetailFromKv(eventId).catch(() => null);
        const built = buildFormEntryFromMatchDetail(match, detail);
        if (built) formByFixture[built.key] = built.teams;
      }),
    );
  }

  return summarizeFormInputs(formByFixture, unplayed);
}
