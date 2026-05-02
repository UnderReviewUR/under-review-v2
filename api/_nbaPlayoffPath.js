/**
 * NBA playoff bracket path — deterministic standard NBA pairing (no reseeding).
 * Seeds from ESPN standings `playoffSeed` (BPI projection / live ordering).
 * Enriched with live playoffSeries rows from the board when present.
 */
const STANDINGS_URL = "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings";
const CACHE_MS = 12 * 60 * 1000;
let cachePayload = null;
let cacheExpires = 0;

/** Half of the West/East bracket: {1,8,4,5} vs {3,6,2,7} → winners meet one round before the other half. */
const HALF_A_SEEDS = new Set([1, 8, 4, 5]);
const HALF_B_SEEDS = new Set([3, 6, 2, 7]);

const ABBR_NORMALIZATION_MAP = {
  SA: "SAS",
  NY: "NYK",
  GS: "GSW",
  NO: "NOP",
  UT: "UTA",
  WSH: "WAS",
  PHO: "PHX",
  SAN: "SAS",
};

function normalizeAbbr(a) {
  const cleaned = String(a || "").trim().replace(/\./g, "").toUpperCase();
  return ABBR_NORMALIZATION_MAP[cleaned] || cleaned;
}

/** @returns {{ west: { abbr: string, seed: number }[], east: { abbr: string, seed: number }[] } | null} */
async function fetchConferenceSeedsSnapshot() {
  if (cachePayload && Date.now() < cacheExpires) return cachePayload;
  try {
    const res = await fetch(STANDINGS_URL, { cache: "no-store" });
    if (!res.ok) return null;
    const d = await res.json();
    const children = Array.isArray(d?.children) ? d.children : [];
    const out = { west: [], east: [] };
    for (const g of children) {
      const name = String(g?.name || "");
      const isWest = name.includes("Western");
      const isEast = name.includes("Eastern");
      const entries = g?.standings?.entries;
      if (!Array.isArray(entries) || (!isWest && !isEast)) continue;
      const bucket = isWest ? out.west : out.east;
      for (const e of entries) {
        const abbr = normalizeAbbr(e?.team?.abbreviation);
        const seedStat = (e?.stats || []).find((s) => s?.name === "playoffSeed");
        const seed = Number(seedStat?.value);
        if (!abbr || !Number.isFinite(seed)) continue;
        bucket.push({ abbr, seed });
      }
    }
    cachePayload = out;
    cacheExpires = Date.now() + CACHE_MS;
    return out;
  } catch {
    return null;
  }
}

function top8ByConference(rows) {
  return [...rows]
    .filter((r) => r.seed >= 1 && r.seed <= 8)
    .sort((a, b) => a.seed - b.seed);
}

function bracketHalfFromSeed(seed) {
  if (HALF_A_SEEDS.has(seed)) return "A";
  if (HALF_B_SEEDS.has(seed)) return "B";
  return null;
}

function meetingProjection(seedA, seedB) {
  if (!Number.isFinite(seedA) || !Number.isFinite(seedB)) return null;
  if (seedA === seedB) return { round: "same_seed_projection_error", detail: "duplicate seeds" };
  /** Same first-round series only for adjacent 4/5, 3/6, etc. — handled by pair check */
  const r1Pairs = [
    [1, 8],
    [4, 5],
    [3, 6],
    [2, 7],
  ];
  for (const [x, y] of r1Pairs) {
    const set = new Set([x, y]);
    if (set.has(seedA) && set.has(seedB)) {
      return {
        earliestRound: 1,
        label: "First round (same best-of series)",
        sameSeriesR1: true,
      };
    }
  }
  const ha = bracketHalfFromSeed(seedA);
  const hb = bracketHalfFromSeed(seedB);
  if (!ha || !hb) {
    return { earliestRound: null, label: "seed outside standard bracket halves" };
  }
  if (ha !== hb) {
    return {
      earliestRound: 3,
      label: "Conference finals (each team must win its half of the bracket first)",
      sameSeriesR1: false,
    };
  }
  return {
    earliestRound: 2,
    label: "Conference semifinals (same side of the bracket)",
    sameSeriesR1: false,
  };
}

function findSeriesRow(playoffSeries, a, b) {
  if (!Array.isArray(playoffSeries)) return null;
  const aa = normalizeAbbr(a);
  const bb = normalizeAbbr(b);
  return (
    playoffSeries.find((row) => {
      const h = normalizeAbbr(row?.home);
      const aw = normalizeAbbr(row?.away);
      return (h === aa && aw === bb) || (h === bb && aw === aa);
    }) || null
  );
}

function formatSeriesLine(row) {
  if (!row) return "";
  const aw = normalizeAbbr(row.away);
  const hm = normalizeAbbr(row.home);
  const awW = Number(row.awayWins || 0);
  const hmW = Number(row.homeWins || 0);
  return `${aw} ${awW}–${hmW} ${hm}${row.round ? ` (${row.round})` : ""}`;
}

/**
 * @param {object[]} playoffSeries
 * @param {string[]} questionAbbrevs — from extractNbaTeamAbbrevsFromQuestion
 */
export async function buildNbaPlayoffPathGrounding(playoffSeries, questionAbbrevs) {
  const seedsSnap = await fetchConferenceSeedsSnapshot();
  const lines = [];
  const abbrevs = (questionAbbrevs || []).map(normalizeAbbr).filter(Boolean);

  const result = {
    source: "espn_standings_playoffSeed + standard_nba_bracket_halves",
    fetchedAt: new Date().toISOString(),
    summaryLines: lines,
    seedsUnavailable: !seedsSnap,
    matchupProjection: null,
    westTop8: null,
    eastTop8: null,
  };

  if (!seedsSnap) {
    lines.push(
      "PLAYOFF PATH: could not load ESPN conference seeds — rely on playoffSeries rows and slate only; still give a conditional directional read.",
    );
    return result;
  }

  const westTop8 = top8ByConference(seedsSnap.west);
  const eastTop8 = top8ByConference(seedsSnap.east);
  result.westTop8 = westTop8.map((r) => `${r.abbr}#${r.seed}`).join(", ");
  result.eastTop8 = eastTop8.map((r) => `${r.abbr}#${r.seed}`).join(", ");

  const westByAbbr = new Map(westTop8.map((r) => [r.abbr, r.seed]));
  const eastByAbbr = new Map(eastTop8.map((r) => [r.abbr, r.seed]));

  lines.push(
    `TOP 8 SEEDS (West): ${result.westTop8}`,
    `TOP 8 SEEDS (East): ${result.eastTop8}`,
    "BRACKET HALF RULE (no reseeding): Half A = seeds 1v8 + 4v5 feed each other; Half B = 3v6 + 2v7 feed each other. Same half → earliest meeting is conference semis (R2). Opposite halves → earliest meeting is conference finals (R3). Different conferences → NBA Finals if both advance.",
  );

  if (abbrevs.length >= 2) {
    const [t1, t2] = [abbrevs[0], abbrevs[1]];
    let s1 = westByAbbr.get(t1) ?? eastByAbbr.get(t1);
    let s2 = westByAbbr.get(t2) ?? eastByAbbr.get(t2);
    const conf1 = westByAbbr.has(t1) ? "West" : eastByAbbr.has(t1) ? "East" : null;
    const conf2 = westByAbbr.has(t2) ? "West" : eastByAbbr.has(t2) ? "East" : null;

    if (conf1 && conf2 && conf1 === conf2 && Number.isFinite(s1) && Number.isFinite(s2)) {
      const proj = meetingProjection(s1, s2);
      result.matchupProjection = {
        teamA: t1,
        teamB: t2,
        seedA: s1,
        seedB: s2,
        conference: conf1,
        ...proj,
      };
      if (proj?.sameSeriesR1) {
        lines.push(
          `FOCUS PAIR ${t1} vs ${t2}: Same projected first-round series (${conf1}). Ground takes in current playoffSeries + injuries.`,
        );
      } else if (proj?.earliestRound === 2) {
        lines.push(
          `FOCUS PAIR ${t1} (${t1}#${s1}) vs ${t2} (${t2}#${s2}): Same bracket half — earliest meeting is ${proj.label}.`,
        );
      } else if (proj?.earliestRound === 3) {
        lines.push(
          `FOCUS PAIR ${t1} (${t1}#${s1}) vs ${t2} (${t2}#${s2}): Opposite bracket halves in ${conf1} — earliest meeting is ${proj.label}.`,
        );
      }

      const sr = findSeriesRow(playoffSeries, t1, t2);
      if (sr) {
        lines.push(`LIVE SERIES ROW (board): ${formatSeriesLine(sr)}`);
      } else {
        lines.push(
          "No single playoffSeries row yet for this pair — they may not be scheduled head-to-head until a later round; directional lean should use seeds + path above, not tonight-only slate.",
        );
      }
    } else if (conf1 && conf2 && conf1 !== conf2) {
      lines.push(
        `FOCUS PAIR ${t1} vs ${t2}: Cross-conference — NBA Finals path if both advance. Use injuries and series rows per conference.`,
      );
      result.matchupProjection = {
        teamA: t1,
        teamB: t2,
        crossConference: true,
        label: "NBA Finals if both advance",
      };
    } else {
      lines.push(
        `FOCUS TEAMS ${t1}, ${t2}: Could not map both to same conference top-8 seed snapshot — still give a conditional lean from question + any playoffSeries rows.`,
      );
    }
  }

  if (Array.isArray(playoffSeries) && playoffSeries.length > 0) {
    lines.push(
      `ACTIVE PLAYOFF SERIES SNAPSHOT (count=${playoffSeries.length}): ${playoffSeries
        .slice(0, 12)
        .map(formatSeriesLine)
        .filter(Boolean)
        .join(" | ")}`,
    );
  }

  result.summaryLines = lines;
  return result;
}

/** Pure bracket math for tests / callers (standard NBA halves; seeds 1–8). */
export function projectPlayoffMeetingFromSeeds(seedA, seedB) {
  return meetingProjection(seedA, seedB);
}
