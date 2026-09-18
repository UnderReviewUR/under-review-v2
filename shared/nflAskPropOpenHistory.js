/**
 * Historical open-line priors for NFL skill props.
 *
 * Source: BDL GOAT /odds/player_props/opening settled vs /stats for the
 * ADP top-75 skill-player union across 2025 regular season + 2026 weeks 1–2
 * (scripts/grade-nfl-prop-history.mjs → scripts/out/nfl-prop-history-grade.json).
 *
 * Used only when live pace/projection/line-shop evidence is tied — never
 * overrides a real edge vote.
 */

/** @typedef {"Over"|"Under"} PropSide */
/** @typedef {"home"|"away"} PropVenue */

/**
 * Market-base → open Under hit rate (decidable settlements only).
 * n = sample size at open for ADP top-75 skill players.
 */
export const NFL_OPEN_PROP_UNDER_RATE = Object.freeze({
  anytime_td: { underRate: 0.592, n: 978 },
  interceptions: { underRate: 0.561, n: 132 },
  pass_attempts: { underRate: 0.553, n: 132 },
  passing_attempts: { underRate: 0.553, n: 132 },
  pass_completions: { underRate: 0.568, n: 132 },
  passing_completions: { underRate: 0.568, n: 132 },
  receptions: { underRate: 0.522, n: 831 },
  pass_yds: { underRate: 0.515, n: 132 },
  rushing_attempts: { underRate: 0.509, n: 446 },
  rush_att: { underRate: 0.509, n: 446 },
  rush_yds: { underRate: 0.506, n: 481 },
  rec_yds: { underRate: 0.485, n: 834 },
  rush_rec_yds: { underRate: 0.478, n: 476 },
  pass_tds: { underRate: 0.447, n: 132 },
});

/** Overall venue lean at open (top-75 skill). Away Unders clear; home is near-fair. */
export const NFL_OPEN_VENUE_UNDER_RATE = Object.freeze({
  away: { underRate: 0.552, n: 2348 },
  home: { underRate: 0.495, n: 2358 },
});

/**
 * Player-team spread bucket at open (home spread if home, else −home).
 * big_dog (≥+7) is the only strong Under lean; small_fav is mild.
 */
export const NFL_OPEN_SPREAD_UNDER_RATE = Object.freeze({
  big_dog: { underRate: 0.562, n: 468 },
  small_fav: { underRate: 0.531, n: 1718 },
  big_fav: { underRate: 0.525, n: 728 },
  small_dog: { underRate: 0.506, n: 1778 },
});

/**
 * Markets where open price was materially wrong vs settlement (edge |≥4pp|).
 * preferSide is the +EV / underpriced side at open in the ADP top-75 sample.
 */
export const NFL_OPEN_MARKET_EV = Object.freeze({
  pass_completions: { preferSide: "Under", edgeVsFairOverPp: -6.7, flatBetEvUnder: 0.071, n: 132 },
  passing_completions: { preferSide: "Under", edgeVsFairOverPp: -6.7, flatBetEvUnder: 0.071, n: 132 },
  pass_attempts: { preferSide: "Under", edgeVsFairOverPp: -5.2, flatBetEvUnder: 0.04, n: 132 },
  passing_attempts: { preferSide: "Under", edgeVsFairOverPp: -5.2, flatBetEvUnder: 0.04, n: 132 },
  pass_tds: { preferSide: "Over", edgeVsFairOverPp: 5.3, flatBetEvOver: 0.024, n: 132 },
  passing_tds: { preferSide: "Over", edgeVsFairOverPp: 5.3, flatBetEvOver: 0.024, n: 132 },
});

/** Players whose opens systematically faded (Under ≥56%, n≥25). */
export const NFL_OPEN_UNDER_LEAN_PLAYERS = Object.freeze([
  "Justin Jefferson",
  "Jayden Daniels",
  "Brock Bowers",
  "Lamar Jackson",
  "Terry McLaurin",
  "Tyler Warren",
  "DeVonta Smith",
  "DK Metcalf",
  "Quinshon Judkins",
  "Saquon Barkley",
  "Breece Hall",
  "Bhayshul Tuten",
  "Jalen Hurts",
  "Rome Odunze",
  "Ladd McConkey",
  "Joe Burrow",
  "Tetairoa McMillan",
  "Davante Adams",
  "Tee Higgins",
  "Kyle Pitts Sr.",
  "A.J. Brown",
  "Harold Fannin Jr.",
]);

/** Players whose opens systematically cleared (Over ≥56%, n≥25). */
export const NFL_OPEN_OVER_LEAN_PLAYERS = Object.freeze([
  "Jaxon Smith-Njigba",
  "Christian Watson",
  "George Pickens",
  "Amon-Ra St. Brown",
  "Cam Skattebo",
  "Christian McCaffrey",
  "Jonathan Taylor",
  "D'Andre Swift",
  "Bucky Irving",
  "Garrett Wilson",
  "Bijan Robinson",
  "Trey McBride",
  "Javonte Williams",
  "James Cook III",
]);

export function normalizeNflOpenHistoryPlayerKey(name) {
  return String(name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const UNDER_SET = new Set(NFL_OPEN_UNDER_LEAN_PLAYERS.map(normalizeNflOpenHistoryPlayerKey));
const OVER_SET = new Set(NFL_OPEN_OVER_LEAN_PLAYERS.map(normalizeNflOpenHistoryPlayerKey));

/**
 * @param {string} marketBase
 * @returns {{ underRate: number, n: number }|null}
 */
export function nflOpenPropPrior(marketBase) {
  const m = String(marketBase || "").toLowerCase().replace(/_period$/, "");
  if (NFL_OPEN_PROP_UNDER_RATE[m]) return NFL_OPEN_PROP_UNDER_RATE[m];
  if (/anytime|td_scorer|touchdown_scorer/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.anytime_td;
  if (/pass.*attempt/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.passing_attempts;
  if (/pass.*completion/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.passing_completions;
  if (/interception/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.interceptions;
  if (/reception/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.receptions;
  if (/pass.*td/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.pass_tds;
  if (/pass.*yd/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.pass_yds;
  if (/rush.*att/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.rushing_attempts;
  if (/rush.*rec.*yd/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.rush_rec_yds;
  if (/rush.*yd/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.rush_yds;
  if (/rec.*yd/.test(m)) return NFL_OPEN_PROP_UNDER_RATE.rec_yds;
  return null;
}

/**
 * Resolve home/away for a prop row when possible.
 * Game stamps look like "DAL @ PHI" (away @ home).
 * @param {Record<string, unknown>|null|undefined} row
 * @param {{ playerTeam?: string|null, venue?: PropVenue|null }} [opts]
 * @returns {PropVenue|null}
 */
export function resolveNflPropVenue(row, opts = {}) {
  if (opts.venue === "home" || opts.venue === "away") return opts.venue;
  const team = String(opts.playerTeam || row?.team || row?.teamAbbr || "")
    .toUpperCase()
    .trim();
  const game = String(row?.game || row?.gameLabel || "");
  const m = game.match(/^\s*([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\s*$/i);
  if (!team || !m) return null;
  const away = m[1].toUpperCase();
  const home = m[2].toUpperCase();
  if (team === home) return "home";
  if (team === away) return "away";
  return null;
}

/**
 * @param {number|null|undefined} playerSpread
 * @returns {"big_fav"|"small_fav"|"small_dog"|"big_dog"|null}
 */
export function nflOpenSpreadBucket(playerSpread) {
  if (playerSpread == null || playerSpread === "") return null;
  const s = Number(playerSpread);
  if (!Number.isFinite(s)) return null;
  if (s <= -7) return "big_fav";
  if (s < 0) return "small_fav";
  if (s < 7) return "small_dog";
  return "big_dog";
}

/**
 * @param {string} marketBase
 * @returns {{ preferSide: PropSide, edgeVsFairOverPp: number, n: number }|null}
 */
export function nflOpenMarketEvPrior(marketBase) {
  const m = String(marketBase || "").toLowerCase().replace(/_period$/, "");
  if (NFL_OPEN_MARKET_EV[m]) return NFL_OPEN_MARKET_EV[m];
  if (/pass.*completion/.test(m)) return NFL_OPEN_MARKET_EV.passing_completions;
  if (/pass.*attempt/.test(m)) return NFL_OPEN_MARKET_EV.passing_attempts;
  if (/pass.*td/.test(m)) return NFL_OPEN_MARKET_EV.pass_tds;
  return null;
}

/**
 * Player-team spread from briefcase opening/live odds + game stamp.
 * @param {Record<string, unknown>|null|undefined} row
 * @param {Record<string, unknown>|null|undefined} briefcase
 * @param {{ playerTeam?: string|null, venue?: PropVenue|null, playerSpread?: number|null }} [opts]
 * @returns {number|null}
 */
export function resolveNflPropPlayerSpread(row, briefcase = null, opts = {}) {
  if (opts.playerSpread != null && Number.isFinite(Number(opts.playerSpread))) {
    return Number(opts.playerSpread);
  }
  if (row?.playerSpread != null && Number.isFinite(Number(row.playerSpread))) {
    return Number(row.playerSpread);
  }

  const venue = resolveNflPropVenue(row, opts);
  if (!venue) return null;

  const game = String(row?.game || row?.gameLabel || "");
  const m = game.match(/^\s*([A-Z]{2,4})\s*@\s*([A-Z]{2,4})\s*$/i);
  if (!m) return null;
  const awayAbbr = m[1].toUpperCase();
  const homeAbbr = m[2].toUpperCase();

  const games = Array.isArray(briefcase?.slate?.games) ? briefcase.slate.games : [];
  const g = games.find(
    (x) =>
      String(x?.homeAbbr || "").toUpperCase() === homeAbbr &&
      String(x?.awayAbbr || "").toUpperCase() === awayAbbr,
  );

  const oddsPools = [
    ...(Array.isArray(briefcase?.slate?.openingOdds) ? briefcase.slate.openingOdds : []),
    ...(Array.isArray(briefcase?.slate?.odds) ? briefcase.slate.odds : []),
  ];

  /** @type {Record<string, unknown>|null} */
  let oddsRow = null;
  if (g?.providerGameId != null) {
    oddsRow =
      oddsPools.find((o) => String(o?.game_id) === String(g.providerGameId)) || null;
  }
  if (!oddsRow && Number.isFinite(Number(row?.gameId ?? row?.game_id))) {
    const gid = row.gameId ?? row.game_id;
    oddsRow = oddsPools.find((o) => String(o?.game_id) === String(gid)) || null;
  }
  if (!oddsRow) return null;

  const spreadHome = Number(oddsRow?.spread?.home ?? oddsRow?.spreadHome);
  if (!Number.isFinite(spreadHome)) return null;
  if (venue === "home") return spreadHome;
  const spreadAway = Number(oddsRow?.spread?.away ?? oddsRow?.spreadAway);
  return Number.isFinite(spreadAway) ? spreadAway : -spreadHome;
}

/**
 * @param {{ preferSide: PropSide, edgeVsFairOverPp: number, n: number }|null} ev
 * @returns {string}
 */
function marketEvSuffix(ev) {
  if (!ev || !Number.isFinite(ev.edgeVsFairOverPp)) return "";
  const abs = Math.abs(ev.edgeVsFairOverPp);
  if (abs < 1.5) return "";
  const signed = ev.edgeVsFairOverPp > 0 ? `+${abs}` : `−${abs}`;
  return ` Open price edge vs fair ~${signed}pp (prefers ${ev.preferSide}).`;
}

/**
 * Toss-up lean from open history when live evidence is tied.
 * Priority: strong market hit-rate / EV → away venue → big-dog spread → player → mild.
 * @param {{
 *   player?: string,
 *   marketBase?: string,
 *   venue?: PropVenue|null,
 *   playerSpread?: number|null,
 *   spreadBucket?: string|null,
 * }} opts
 * @returns {{ side: PropSide, why: string, confidence: "market"|"price"|"player"|"venue"|"spread"|"neutral" }}
 */
export function nflOpenHistoryTossUpLean(opts = {}) {
  const marketBase = String(opts.marketBase || "");
  const playerKey = normalizeNflOpenHistoryPlayerKey(opts.player);
  const prior = nflOpenPropPrior(marketBase);
  const ev = nflOpenMarketEvPrior(marketBase);
  const venue = opts.venue === "home" || opts.venue === "away" ? opts.venue : null;
  const venuePrior = venue ? NFL_OPEN_VENUE_UNDER_RATE[venue] : null;
  const spreadBucket =
    opts.spreadBucket || nflOpenSpreadBucket(opts.playerSpread) || null;
  const spreadPrior = spreadBucket ? NFL_OPEN_SPREAD_UNDER_RATE[spreadBucket] : null;

  const playerUnder = playerKey && UNDER_SET.has(playerKey);
  const playerOver = playerKey && OVER_SET.has(playerKey);

  // Strong market EV (|edge|≥4pp) — same markets as hit-rate extremes, priced explicitly.
  if (ev && Math.abs(ev.edgeVsFairOverPp) >= 4 && ev.n >= 60) {
    if (ev.preferSide === "Under" && playerOver && Math.abs(ev.edgeVsFairOverPp) < 5.5) {
      return {
        side: "Over",
        why: `Open history leans Over for ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    if (ev.preferSide === "Over" && playerUnder) {
      return {
        side: "Under",
        why: `Open history fades ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    return {
      side: ev.preferSide,
      why: `Open history price edge: ${ev.preferSide} was underpriced by ~${Math.abs(ev.edgeVsFairOverPp)}pp at open on this market (n=${ev.n}).`,
      confidence: "price",
    };
  }

  // Strong market Underness (anytime TD, INT, pass volume) wins next.
  if (prior && prior.underRate >= 0.54 && prior.n >= 60) {
    if (playerOver && prior.underRate < 0.56) {
      return {
        side: "Over",
        why: `Open history leans Over for ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    const pct = Math.round(prior.underRate * 100);
    return {
      side: "Under",
      why: `Open history: Unders hit ~${pct}% on this market for most-bet players (n=${prior.n}).${marketEvSuffix(ev)}`,
      confidence: "market",
    };
  }

  // Strong market Over lean (pass TDs) when EV table missed alias
  if (prior && prior.underRate <= 0.46 && prior.n >= 60) {
    if (playerUnder) {
      return {
        side: "Under",
        why: `Open history fades ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    return {
      side: "Over",
      why: `Open history: Overs hit ~${Math.round((1 - prior.underRate) * 100)}% on this market (n=${prior.n}).${marketEvSuffix(ev)}`,
      confidence: "market",
    };
  }

  // Venue: away Unders ~55% — strong enough to sit above spread.
  if (venuePrior && venue === "away" && venuePrior.underRate >= 0.54) {
    if (playerOver && !(prior && prior.underRate >= 0.52)) {
      return {
        side: "Over",
        why: `Open history clears ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    return {
      side: "Under",
      why: `Open history: away props Unders hit ~${Math.round(venuePrior.underRate * 100)}% for most-bet players (n=${venuePrior.n}).`,
      confidence: "venue",
    };
  }

  // Spread script: big dogs fade volume props at open (before mild home tip).
  if (spreadPrior && spreadBucket === "big_dog" && spreadPrior.underRate >= 0.54) {
    if (playerOver) {
      return {
        side: "Over",
        why: `Open history clears ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    return {
      side: "Under",
      why: `Open history: big dogs (≥+7) Unders hit ~${Math.round(spreadPrior.underRate * 100)}% for most-bet players (n=${spreadPrior.n}).`,
      confidence: "spread",
    };
  }
  if (
    spreadPrior &&
    spreadBucket === "small_fav" &&
    spreadPrior.underRate >= 0.53 &&
    spreadPrior.n >= 200 &&
    !playerOver &&
    !(prior && prior.underRate <= 0.49)
  ) {
    return {
      side: "Under",
      why: `Open history: small favorites Unders hit ~${Math.round(spreadPrior.underRate * 100)}% for most-bet players (n=${spreadPrior.n}).`,
      confidence: "spread",
    };
  }

  // Home ~49.5% Under — mild Over tip when market is not Under-leaning.
  if (venuePrior && venue === "home" && venuePrior.underRate <= 0.5) {
    if (playerUnder) {
      return {
        side: "Under",
        why: `Open history fades ${opts.player} on thin numbers (ADP top-75 open sample).`,
        confidence: "player",
      };
    }
    if (!prior || prior.underRate <= 0.515) {
      return {
        side: "Over",
        why: `Open history: home props are near-fair / slight Over (~${Math.round((1 - venuePrior.underRate) * 100)}% Over, n=${venuePrior.n}).`,
        confidence: "venue",
      };
    }
  }

  if (playerUnder) {
    return {
      side: "Under",
      why: `Open history fades ${opts.player} on thin numbers (ADP top-75 open sample).`,
      confidence: "player",
    };
  }
  if (playerOver) {
    return {
      side: "Over",
      why: `Open history clears ${opts.player} on thin numbers (ADP top-75 open sample).`,
      confidence: "player",
    };
  }

  if (prior && prior.underRate >= 0.515 && prior.n >= 100) {
    return {
      side: "Under",
      why: `Open history slight Under lean on this market (~${Math.round(prior.underRate * 100)}%, n=${prior.n}).${marketEvSuffix(ev)}`,
      confidence: "market",
    };
  }
  if (prior && prior.underRate <= 0.49 && prior.n >= 100) {
    return {
      side: "Over",
      why: `Open history slight Over lean on this market (~${Math.round((1 - prior.underRate) * 100)}%, n=${prior.n}).${marketEvSuffix(ev)}`,
      confidence: "market",
    };
  }

  return {
    side: "Under",
    why: "Close number — no clear smash either way.",
    confidence: "neutral",
  };
}
