/**
 * NBA Finals 2026 — series state, mode detection, UR Take context blocks.
 */

import { canonicalizeTeamAbbr } from "./gameLineSpread.js";
import { NBA_INTENT } from "./nbaUrTakeIntent.js";

export const NBA_2026_FINALS_TEAMS = new Set(["NYK", "SAS"]);

/** Verified ESPN tipoffs — used for next-game labels between off-nights. */
export const NBA_2026_FINALS_SCHEDULE = [
  { gameNumber: 1, away: "NYK", home: "SAS", tipoffUtc: "2026-06-05T00:30:00.000Z" },
  { gameNumber: 2, away: "NYK", home: "SAS", tipoffUtc: "2026-06-06T00:30:00.000Z" },
  { gameNumber: 3, away: "SAS", home: "NYK", tipoffUtc: "2026-06-09T00:30:00.000Z" },
  { gameNumber: 4, away: "SAS", home: "NYK", tipoffUtc: "2026-06-11T00:30:00.000Z" },
  { gameNumber: 5, away: "NYK", home: "SAS", tipoffUtc: "2026-06-14T00:30:00.000Z" },
  { gameNumber: 6, away: "SAS", home: "NYK", tipoffUtc: "2026-06-17T00:30:00.000Z" },
  { gameNumber: 7, away: "NYK", home: "SAS", tipoffUtc: "2026-06-20T00:30:00.000Z" },
];

const FINALS_QUESTION_RE =
  /\b(nba finals|finals game|finals mvp|who wins the series|win the (nba )?finals|wins the (nba )?finals|finals series|game \d\b.*(preview|edge|finals))\b/i;

const NARRATIVE_HALLUCINATION_RULE =
  'Do not use "clutch", "legacy", "dynasty", or "all-time" framing unless a specific stat or fact in the JSON payload supports it — otherwise describe matchup and series facts only.';

const TEAM_NICK = { NYK: "Knicks", SAS: "Spurs" };

/**
 * @param {string} awayAbbr
 * @param {string} homeAbbr
 * @param {number} winsAway
 * @param {number} winsHome
 */
export function formatFinalsSeriesScoreLabel(awayAbbr, homeAbbr, winsAway, winsHome) {
  const af = String(awayAbbr || "").toUpperCase();
  const hf = String(homeAbbr || "").toUpperCase();
  const leaderAbbr =
    winsAway > winsHome ? af : winsHome > winsAway ? hf : null;
  const leaderWins = Math.max(winsAway, winsHome);
  const trailerWins = Math.min(winsAway, winsHome);
  if (leaderAbbr == null) {
    return `${TEAM_NICK[af] || af} and ${TEAM_NICK[hf] || hf} tied ${winsAway}-${winsHome}`;
  }
  const leaderName = TEAM_NICK[leaderAbbr] || leaderAbbr;
  return `${leaderName} lead${leaderWins === 1 ? "s" : ""} series ${leaderWins}-${trailerWins}`;
}

/**
 * Parse series score from the user question when board rows are stale (e.g. 0-0 before Game 3).
 * @param {string} question
 * @returns {{ NYK: number, SAS: number } | null}
 */
export function parseFinalsSeriesWinsFromQuestion(question) {
  const q = String(question || "");
  if (!q.trim()) return null;

  const toAbbr = (name) => {
    const n = String(name || "").toLowerCase();
    if (n === "knicks" || n === "nyk" || n === "ny") return "NYK";
    if (n === "spurs" || n === "sas" || n === "sa") return "SAS";
    return String(name || "").toUpperCase();
  };

  const namedLead = q.match(
    /\b(knicks|spurs|nyk|sas|ny|sa)\s+lead(?:s|ing)?\b(?:\s+the)?\s+series\s+(\d+)\s*[-–]\s*(\d+)/i,
  );
  if (namedLead) {
    const leader = toAbbr(namedLead[1]);
    const wLeader = Number(namedLead[2]);
    const wTrailer = Number(namedLead[3]);
    if (!Number.isFinite(wLeader) || !Number.isFinite(wTrailer)) return null;
    const other = leader === "NYK" ? "SAS" : "NYK";
    return { [leader]: wLeader, [other]: wTrailer };
  }

  const seriesNamed = q.match(
    /\bseries\s+(?:is\s+)?(\d+)\s*[-–]\s*(\d+)[^.]{0,40}?\b(knicks|spurs|nyk|sas)\b/i,
  );
  if (seriesNamed) {
    const w1 = Number(seriesNamed[1]);
    const w2 = Number(seriesNamed[2]);
    const leader = toAbbr(seriesNamed[3]);
    if (!Number.isFinite(w1) || !Number.isFinite(w2)) return null;
    const leaderWins = Math.max(w1, w2);
    const trailerWins = Math.min(w1, w2);
    const other = leader === "NYK" ? "SAS" : "NYK";
    return { [leader]: leaderWins, [other]: trailerWins };
  }

  return null;
}

/**
 * Count Finals wins from completed game rows (todaysGames, lastNight, etc.).
 * @param {Array<Record<string, unknown>>} games
 * @returns {{ NYK: number, SAS: number } | null}
 */
export function inferFinalsSeriesWinsFromCompletedGames(games) {
  let nyk = 0;
  let sas = 0;
  for (const g of Array.isArray(games) ? games : []) {
    if (!isNbaFinalsGame(g)) continue;
    if (String(g?.state || "").toLowerCase() !== "post") continue;
    const away = canonicalizeTeamAbbr(g?.awayTeam?.abbr);
    const home = canonicalizeTeamAbbr(g?.homeTeam?.abbr);
    const awayScore = parseInt(String(g?.awayTeam?.score ?? ""), 10);
    const homeScore = parseInt(String(g?.homeTeam?.score ?? ""), 10);
    if (!Number.isFinite(awayScore) || !Number.isFinite(homeScore) || awayScore === homeScore) continue;
    const winner = awayScore > homeScore ? away : home;
    if (winner === "NYK") nyk += 1;
    else if (winner === "SAS") sas += 1;
  }
  return nyk + sas > 0 ? { NYK: nyk, SAS: sas } : null;
}

/**
 * @param {Array<Record<string, unknown>>} h2hSplits
 * @param {string} awayAbbr
 * @param {string} homeAbbr
 * @returns {{ NYK: number, SAS: number } | null}
 */
export function inferFinalsSeriesWinsFromH2h(h2hSplits, awayAbbr, homeAbbr) {
  const a = String(awayAbbr || "").toUpperCase();
  const h = String(homeAbbr || "").toUpperCase();
  const row = (Array.isArray(h2hSplits) ? h2hSplits : []).find((s) => {
    const sa = String(s?.awayAbbr || "").toUpperCase();
    const sh = String(s?.homeAbbr || "").toUpperCase();
    return (sa === a && sh === h) || (sa === h && sh === a);
  });
  if (!row) return null;

  let nyk = 0;
  let sas = 0;
  const meetings = Array.isArray(row.meetings) ? row.meetings : [];
  for (const m of meetings) {
    if (String(m?.scope || "").toLowerCase() !== "playoffs") continue;
    const ha = String(m?.homeAbbr || "").toUpperCase();
    const aa = String(m?.awayAbbr || "").toUpperCase();
    const hs = parseInt(String(m?.homeScore ?? ""), 10);
    const as = parseInt(String(m?.awayScore ?? ""), 10);
    if (!Number.isFinite(hs) || !Number.isFinite(as) || hs === as) continue;
    const winner = hs > as ? ha : aa;
    if (winner === "NYK") nyk += 1;
    else if (winner === "SAS") sas += 1;
  }
  return nyk + sas > 0 ? { NYK: nyk, SAS: sas } : null;
}

/**
 * @param {Array<Record<string, unknown>>} playoffSeries
 * @param {string} awayAbbr
 * @param {string} homeAbbr
 * @returns {{ NYK: number, SAS: number } | null}
 */
export function inferFinalsSeriesWinsFromPlayoffSeriesStatus(playoffSeries, awayAbbr, homeAbbr) {
  const a = String(awayAbbr || "").toUpperCase();
  const h = String(homeAbbr || "").toUpperCase();
  const row = (Array.isArray(playoffSeries) ? playoffSeries : []).find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === a && sh === h) || (sa === h && sh === a);
  });
  if (!row) return null;
  const status = String(row.status || row.summary || "").trim();
  if (!status) return null;
  return parseFinalsSeriesWinsFromQuestion(status);
}

/**
 * @param {ReturnType<typeof getNbaFinalsSeriesState> | null} state
 * @param {string} [question]
 * @param {{ games?: Array<Record<string, unknown>>, h2hSplits?: Array<Record<string, unknown>>, playoffSeries?: Array<Record<string, unknown>> }} [opts]
 */
export function reconcileFinalsSeriesState(state, question = "", opts = {}) {
  if (!state?.isFinals) return state;

  const boardTotal = (Number(state.awayWins) || 0) + (Number(state.homeWins) || 0);
  const boardStale =
    boardTotal === 0 && Number(state.gameNumber) >= 2 && /tied\s+0\s*[-–]\s*0/i.test(state.seriesScoreLabel || "");
  const needsInference = boardStale || (boardTotal === 0 && Number(state.gameNumber) >= 3);
  const parsed = parseFinalsSeriesWinsFromQuestion(question);

  if (!parsed && !needsInference) return state;

  let winsAway = Number(state.awayWins) || 0;
  let winsHome = Number(state.homeWins) || 0;

  if (parsed) {
    winsAway = Number(parsed[state.awayAbbr]) || 0;
    winsHome = Number(parsed[state.homeAbbr]) || 0;
  } else if (needsInference) {
    const gamePool = Array.isArray(opts.games) ? opts.games : [];
    const fromStatus = inferFinalsSeriesWinsFromPlayoffSeriesStatus(
      opts.playoffSeries,
      state.awayAbbr,
      state.homeAbbr,
    );
    const fromGames = inferFinalsSeriesWinsFromCompletedGames(gamePool);
    const fromH2h = inferFinalsSeriesWinsFromH2h(
      opts.h2hSplits,
      state.awayAbbr,
      state.homeAbbr,
    );
    const inferred = fromStatus || fromGames || fromH2h;
    if (!inferred) return state;
    winsAway = Number(inferred[state.awayAbbr]) || 0;
    winsHome = Number(inferred[state.homeAbbr]) || 0;
  }

  const af = String(state.awayAbbr || "").toUpperCase();
  const hf = String(state.homeAbbr || "").toUpperCase();
  const seriesScoreLabel = formatFinalsSeriesScoreLabel(af, hf, winsAway, winsHome);
  const leaderAbbr = winsAway > winsHome ? af : winsHome > winsAway ? hf : null;
  const trailingAbbr = leaderAbbr === af ? hf : leaderAbbr === hf ? af : null;
  const leaderWins = Math.max(winsAway, winsHome);
  const trailerWins = Math.min(winsAway, winsHome);
  const gn = state.gameNumber;
  const gameNumberLabel = state.gameNumberLabel || (gn ? `Game ${gn}` : "Next Finals game");

  return {
    ...state,
    awayWins: winsAway,
    homeWins: winsHome,
    leaderAbbr,
    trailingAbbr,
    seriesScoreLabel,
    eliminationNote:
      leaderAbbr && trailingAbbr
        ? eliminationNote(leaderWins, trailerWins, leaderAbbr, trailingAbbr)
        : state.eliminationNote,
    summaryOneLiner: leaderAbbr
      ? `${seriesScoreLabel}${gn ? ` — ${gameNumberLabel}` : ""}.`
      : `${seriesScoreLabel}.`,
  };
}

/**
 * @param {Record<string, unknown> | null | undefined} game
 */
export function isNbaFinalsGame(game) {
  const away = canonicalizeTeamAbbr(game?.awayTeam?.abbr);
  const home = canonicalizeTeamAbbr(game?.homeTeam?.abbr);
  if (!away || !home) return false;
  return NBA_2026_FINALS_TEAMS.has(away) && NBA_2026_FINALS_TEAMS.has(home);
}

/** @deprecated — use isNbaFinalsGame */
export const isNba2026FinalsMatchupGame = isNbaFinalsGame;

/**
 * @param {string} question
 */
export function isNbaFinalsQuestion(question) {
  const q = String(question || "");
  if (!q.trim()) return false;
  if (FINALS_QUESTION_RE.test(q)) return true;
  const teams = [...NBA_2026_FINALS_TEAMS].filter((abbr) =>
    new RegExp(`\\b${abbr}\\b`, "i").test(q),
  );
  return teams.length >= 2 || /\b(knicks|spurs)\b/i.test(q);
}

/**
 * @param {Record<string, unknown> | null | undefined} game
 * @param {Array<{ away?: string, home?: string, awayWins?: number, homeWins?: number }>} playoffSeries
 */
export function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played =
    (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played > 0 ? played + 1 : 0;
}

/**
 * @param {number} winsLeader
 * @param {number} winsTrailer
 * @param {string} leaderAbbr
 * @param {string} trailerAbbr
 */
function eliminationNote(winsLeader, winsTrailer, leaderAbbr, trailerAbbr) {
  if (winsLeader <= 2 && winsTrailer <= 2) return "Neither team faces elimination yet.";
  if (winsLeader === 3 && winsTrailer === 3) return "Next game eliminates the loser.";
  if (winsLeader >= 3 && winsTrailer <= 2 && winsLeader > winsTrailer) {
    return `${trailerAbbr} faces elimination with a loss tonight.`;
  }
  return null;
}

/**
 * @param {object} opts
 * @param {string} [opts.awayAbbr]
 * @param {string} [opts.homeAbbr]
 * @param {Record<string, unknown> | null} [opts.game]
 * @param {Array<Record<string, unknown>>} [opts.playoffSeries]
 * @param {Record<string, unknown> | null} [opts.focusedSeriesSnapshot]
 */
export function getNbaFinalsSeriesState({
  awayAbbr = "",
  homeAbbr = "",
  game = null,
  playoffSeries = [],
  focusedSeriesSnapshot = null,
} = {}) {
  const af = String(awayAbbr || game?.awayTeam?.abbr || "").toUpperCase();
  const hf = String(homeAbbr || game?.homeTeam?.abbr || "").toUpperCase();
  if (!af || !hf || !isNbaFinalsGame({ awayTeam: { abbr: af }, homeTeam: { abbr: hf } })) {
    return null;
  }

  let winsAway = 0;
  let winsHome = 0;
  let gameNumber = 0;
  let roundLabel = "NBA Finals";

  if (focusedSeriesSnapshot && typeof focusedSeriesSnapshot === "object") {
    winsAway = Number(focusedSeriesSnapshot.awayWinsInQuestionOrder) || 0;
    winsHome = Number(focusedSeriesSnapshot.homeWinsInQuestionOrder) || 0;
    gameNumber = Number(focusedSeriesSnapshot.nextGameNumber) || 0;
    if (focusedSeriesSnapshot.round) roundLabel = String(focusedSeriesSnapshot.round);
  } else {
    const row = (playoffSeries || []).find((s) => {
      const sa = String(s?.away || "").toUpperCase();
      const sh = String(s?.home || "").toUpperCase();
      return (sa === af && sh === hf) || (sa === hf && sh === af);
    });
    if (row) {
      const sa = String(row?.away || "").toUpperCase();
      const sh = String(row?.home || "").toUpperCase();
      if (sa === af && sh === hf) {
        winsAway = Number(row?.awayWins) || 0;
        winsHome = Number(row?.homeWins) || 0;
      } else {
        winsAway = Number(row?.homeWins) || 0;
        winsHome = Number(row?.awayWins) || 0;
      }
      if (row?.round) roundLabel = String(row.round);
      const hint = Number(row?.gameNumberHint);
      if (Number.isFinite(hint) && hint > 0) gameNumber = hint;
    }
    if (!gameNumber) {
      gameNumber = getNbaSeriesGameNumberForGame(
        game || { awayTeam: { abbr: af }, homeTeam: { abbr: hf } },
        playoffSeries,
      );
    }
  }

  const leaderAbbr =
    winsAway > winsHome ? af : winsHome > winsAway ? hf : null;
  const trailingAbbr =
    leaderAbbr === af ? hf : leaderAbbr === hf ? af : null;
  const leaderWins = Math.max(winsAway, winsHome);
  const trailerWins = Math.min(winsAway, winsHome);

  const seriesScoreLabel = formatFinalsSeriesScoreLabel(af, hf, winsAway, winsHome);

  const tonightAway = String(game?.awayTeam?.abbr || af).toUpperCase();
  const tonightHome = String(game?.homeTeam?.abbr || hf).toUpperCase();
  const homeCourtAbbr = tonightHome;

  let gameNumberLabel = gameNumber > 0 ? `Game ${gameNumber}` : "Next Finals game";
  const gameState = String(game?.state || "").toLowerCase();
  if (gameState === "in") gameNumberLabel = gameNumber > 0 ? `Game ${gameNumber} (live)` : "Live Finals game";

  const elimination =
    leaderAbbr && trailingAbbr
      ? eliminationNote(leaderWins, trailerWins, leaderAbbr, trailingAbbr)
      : null;

  const base = {
    isFinals: true,
    awayAbbr: af,
    homeAbbr: hf,
    awayWins: winsAway,
    homeWins: winsHome,
    leaderAbbr,
    trailingAbbr,
    seriesScoreLabel,
    gameNumber: gameNumber > 0 ? gameNumber : null,
    gameNumberLabel,
    homeCourtAbbr,
    gameState,
    tonightMatchupLabel: `${tonightAway} @ ${tonightHome}`,
    eliminationNote: elimination,
    roundLabel,
    venueLabel: null,
    summaryOneLiner:
      focusedSeriesSnapshot?.serverSummaryOneLiner ||
      (leaderAbbr
        ? `${seriesScoreLabel}${gameNumber > 0 ? ` — ${gameNumberLabel}` : ""}.`
        : `${seriesScoreLabel}.`),
  };

  return overlayFinalsScheduledGame(base);
}

/**
 * Align matchup + venue with verified schedule (fixes Game 3-in-NY vs series-row SA home).
 * @param {ReturnType<typeof getNbaFinalsSeriesState>} state
 * @param {number} [nowMs]
 */
export function overlayFinalsScheduledGame(state, nowMs = Date.now()) {
  if (!state?.isFinals) return state;

  const next = resolveNextNbaFinalsScheduledGame(nowMs);
  const gn = state.gameNumber || next?.gameNumber;
  const sched =
    NBA_2026_FINALS_SCHEDULE.find((g) => g.gameNumber === gn) ||
    (next && gn === next.gameNumber ? next : null);
  if (!sched) return state;

  const venue =
    sched.home === "NYK" ? "New York (MSG)" : sched.home === "SAS" ? "San Antonio" : sched.home;
  const gameNumberLabel =
    state.gameState === "in" ? `Game ${sched.gameNumber} (live)` : `Game ${sched.gameNumber}`;

  return {
    ...state,
    gameNumber: sched.gameNumber,
    gameNumberLabel,
    awayAbbr: sched.away,
    homeAbbr: sched.home,
    homeCourtAbbr: sched.home,
    tonightMatchupLabel: `${sched.away} @ ${sched.home}`,
    venueLabel: venue,
    summaryOneLiner: `${state.seriesScoreLabel} — ${gameNumberLabel} in ${venue} (${sched.away} @ ${sched.home}).`,
  };
}

/**
 * Mandatory scannable Finals answer shape (shareable / Reddit-friendly).
 */
export function buildNbaFinalsScannableOutputBlock() {
  return `NBA FINALS OUTPUT FORMAT (mandatory — no memo essays):
Use exactly these labeled lines in order (one idea per line; no paragraph walls):

SHARP ANGLE: [single play in ≤12 words, e.g. "Wembanyama under 10.5 rebounds"]
Context: [1–2 short sentences — why the angle works]
The Play: [posted line + direction, or "Pass" if no line — never mention context, payload, or board availability]
Confidence: High | Medium | Speculative
Watch For: [one live tell — what you are tracking in-game]
One Thing: [single sentence — what flips the read]

Rules:
- Do NOT use memo headers (THE FRAGILE ASSUMPTION, MARKET READ, THE STRUCTURAL EDGE).
- Mirror venue from NBA FINALS CONTEXT — never say Knicks are "on the road in San Antonio" for Game 3 or 4 (those are in New York).
- Open with SHARP ANGLE, not a series recap headline.`;
}

/**
 * Intent-specific Finals tone (WC-style appendix).
 * @param {string} nbaIntent
 */
export function buildNbaFinalsToneRules(nbaIntent) {
  const lines = [
    "FINALS TONE & GROUNDING:",
    NARRATIVE_HALLUCINATION_RULE,
  ];

  if (nbaIntent === NBA_INTENT.SERIES_WINNER) {
    lines.push(
      "- SERIES_WINNER: This is a best-of-7 championship price — cite NBA FINALS SERIES ODDS when fresh; never invent series prices.",
      '- When odds are fresh, you may use "mispriced" only with team + exact American price from the block above.',
      "- Weight home court remaining, rest, and verified injury rows — not narrative momentum alone.",
    );
  } else if (nbaIntent === NBA_INTENT.FINALS_MVP) {
    lines.push(
      "- FINALS_MVP: Cite NBA FINALS MVP ODDS when fresh; name + exact price required for any mispricing claim.",
      "- Tie MVP value to usage, two-way impact, and series script from payload — not reputation.",
    );
  } else if (nbaIntent === NBA_INTENT.LIVE_IN_GAME) {
    lines.push(
      "- LIVE_IN_GAME: Balanced, high-stakes tone — acknowledge series score before prop/spread leans.",
      "- Respect series momentum (2-0 vs 2-2 changes role-player and total reads) using board-verified wins only.",
      "- Props/totals: obey ODDS FRESHNESS and GAME TOTAL blocks; no fabricated live lines.",
    );
  } else {
    lines.push(
      "- MATCHUP: Balanced preview — open with series state, then spread/total/prop edge.",
      "- Respect series momentum; use game number from context (NOT Game 1 — reference only the game number that appears in contextBlock above).",
      "- Travel/rest: cross-country Finals legs matter for role-player minutes and pace — ground in injuries + recentGames only.",
    );
  }

  return lines.join("\n");
}

/**
 * Get today's date in ET for context injection.
 */
function getTodayStrEt() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

/**
 * @param {number} [nowMs]
 */
export function resolveNextNbaFinalsScheduledGame(nowMs = Date.now()) {
  const bufferMs = 4 * 60 * 60 * 1000;
  for (const row of NBA_2026_FINALS_SCHEDULE) {
    const tipMs = Date.parse(row.tipoffUtc);
    if (!Number.isFinite(tipMs)) continue;
    if (tipMs >= nowMs - bufferMs) return row;
  }
  return null;
}

/**
 * Remaining Finals games at the same home venue (e.g. Games 3–4 in NY, 5–6 if extended).
 * @param {number} fromGameNumber
 * @param {string} homeAbbr
 */
export function finalsHomeStretchGameNumbers(fromGameNumber, homeAbbr) {
  const home = String(homeAbbr || "").toUpperCase();
  const from = Number(fromGameNumber) || 0;
  if (!home || from < 1) return [];

  const startIdx = NBA_2026_FINALS_SCHEDULE.findIndex(
    (g) => g.gameNumber === from && g.home === home,
  );
  if (startIdx < 0) return [];

  const nums = [];
  for (let i = startIdx; i < NBA_2026_FINALS_SCHEDULE.length; i++) {
    const g = NBA_2026_FINALS_SCHEDULE[i];
    if (g.home !== home) break;
    nums.push(g.gameNumber);
  }
  return nums;
}

function formatFinalsHomeStretchPhrase(fromGameNumber, homeAbbr) {
  const city = homeAbbr === "NYK" ? "New York" : "San Antonio";
  const nums = finalsHomeStretchGameNumbers(fromGameNumber, homeAbbr);
  if (!nums.length) return `in ${city}`;
  if (nums.length === 1) return `in ${city} (Game ${nums[0]})`;
  if (nums.length === 2) return `in ${city} for Games ${nums[0]} and ${nums[1]}`;
  const last = nums[nums.length - 1];
  const rest = nums.slice(0, -1).join(", ");
  return `in ${city} for Games ${rest}, and ${last}`;
}

/**
 * @param {ReturnType<typeof getNbaFinalsSeriesState> | null} seriesState
 * @param {number} [nowMs]
 */
function buildFinalsDateAnchorLine(seriesState, nowMs = Date.now()) {
  const todayStr = getTodayStrEt();
  const gn = seriesState?.gameNumber || "TBD";
  const next = resolveNextNbaFinalsScheduledGame(nowMs);
  const gameState = String(seriesState?.gameState || "").toLowerCase();
  const isLiveTonight = gameState === "in";

  if (next && Number(gn) === next.gameNumber) {
    const tipLabel = new Date(next.tipoffUtc).toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "America/New_York",
      timeZoneName: "short",
    });
    const venue = next.home === "NYK" ? "New York (MSG)" : "San Antonio";
    if (isLiveTonight) {
      return `TODAY'S DATE: ${todayStr}. NBA Finals Game ${gn} is live (${next.away} @ ${next.home}, ${venue}).`;
    }
    const todayEt = new Date(nowMs).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const gameEt = new Date(next.tipoffUtc).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    if (gameEt === todayEt) {
      return `TODAY'S DATE: ${todayStr}. NBA Finals Game ${gn} is tonight (${next.away} @ ${next.home}, ${venue} — ${tipLabel}).`;
    }
    const homeStretch = formatFinalsHomeStretchPhrase(next.gameNumber, next.home);
    return `TODAY'S DATE: ${todayStr}. Next Finals game: Game ${gn} — ${next.away} @ ${next.home} ${homeStretch} (${tipLabel}).`;
  }

  return `TODAY'S DATE: ${todayStr}. Use Game ${gn} from the verified context above — do not reference earlier games as "tonight".`;
}

/**
 * @param {ReturnType<typeof getNbaFinalsSeriesState> | null} seriesState
 * @param {string} [nbaIntent]
 */
export function buildNbaFinalsContextBlock(seriesState, nbaIntent = NBA_INTENT.PREGAME_MATCHUP) {
  if (!seriesState?.isFinals) return null;

  const lines = [
    "NBA FINALS CONTEXT (board-verified — do not invent series score, game number, or home court):",
    `- Series: ${seriesState.seriesScoreLabel} (best-of-7 ${seriesState.roundLabel})`,
  ];

  if (seriesState.gameNumber != null) {
    lines.push(`- Game number: ${seriesState.gameNumberLabel}`);
  }
  if (seriesState.tonightMatchupLabel) {
    lines.push(`- Tonight's matchup: ${seriesState.tonightMatchupLabel} (home court: ${seriesState.homeCourtAbbr})`);
  }
  if (seriesState.venueLabel) {
    lines.push(`- Venue: ${seriesState.venueLabel} — do not invert home/road vs this line.`);
  }
  if (seriesState.eliminationNote) {
    lines.push(`- Elimination: ${seriesState.eliminationNote}`);
  }
  if (seriesState.summaryOneLiner) {
    lines.push(`- Board summary: ${seriesState.summaryOneLiner}`);
  }

  lines.push(
    "",
    "FINALS-SPECIFIC RULES:",
    "- Mirror series wins and game number exactly from this block and playoffSeries / focusedSeriesSnapshot in JSON.",
    "- De'Aaron Fox is NOT on the 2026 Spurs Finals roster — never cite Fox for SAS angles.",
    "- Rest & travel: back-to-back or cross-time-zone legs can compress rotation — cite only when injuries or recentGames support it.",
    "- Back-to-back impact: role-player overs/unders and totals shift with pace — use gameTotals and posted props when present.",
    buildNbaFinalsToneRules(nbaIntent),
  );

  lines.push(
    "",
    buildFinalsDateAnchorLine(seriesState),
    "Do not reference finished games as tonight — use only the game number from the context block above.",
    "",
    buildNbaFinalsScannableOutputBlock(),
  );

  return `${lines.join("\n")}\n`;
}

/**
 * @param {object} opts
 * @param {Record<string, unknown> | null} [opts.nbaContext]
 * @param {{ awayAbbr?: string, homeAbbr?: string } | null} [opts.nbaMatchup]
 * @param {string} [opts.question]
 * @param {string} [opts.nbaIntent]
 */
export function resolveNbaFinalsUrTakeContext({
  nbaContext = null,
  nbaMatchup = null,
  question = "",
  nbaIntent = NBA_INTENT.UNCLASSIFIED,
} = {}) {
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const awayM = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const homeM = String(nbaMatchup?.homeAbbr || "").toUpperCase();

  let focusedGame = null;
  if (awayM && homeM) {
    focusedGame =
      games.find((g) => {
        const a = String(g?.awayTeam?.abbr || "").toUpperCase();
        const h = String(g?.homeTeam?.abbr || "").toUpperCase();
        return (a === awayM && h === homeM) || (a === homeM && h === awayM);
      }) || null;
  }
  if (!focusedGame) {
    focusedGame =
      games.find((g) => isNbaFinalsGame(g) && String(g?.state || "").toLowerCase() === "in") ||
      games.find((g) => isNbaFinalsGame(g)) ||
      null;
  }

  const hasFinalsSeriesRow = playoffSeries.some((row) => {
    const sa = String(row?.away || "").toUpperCase();
    const sh = String(row?.home || "").toUpperCase();
    return NBA_2026_FINALS_TEAMS.has(sa) && NBA_2026_FINALS_TEAMS.has(sh);
  });

  const finalsMode =
    isNbaFinalsGame(focusedGame) ||
    isNbaFinalsQuestion(question) ||
    hasFinalsSeriesRow ||
    (awayM && homeM && NBA_2026_FINALS_TEAMS.has(awayM) && NBA_2026_FINALS_TEAMS.has(homeM));

  if (!finalsMode) {
    return {
      finalsMode: false,
      seriesState: null,
      contextBlock: null,
    };
  }

  const gamePool = [
    ...games,
    ...(Array.isArray(nbaContext?.lastNight) ? nbaContext.lastNight : []),
  ];
  const seriesState = reconcileFinalsSeriesState(
    getNbaFinalsSeriesState({
      awayAbbr: awayM || focusedGame?.awayTeam?.abbr,
      homeAbbr: homeM || focusedGame?.homeTeam?.abbr,
      game: focusedGame,
      playoffSeries,
      focusedSeriesSnapshot: nbaContext?.focusedSeriesSnapshot ?? null,
    }),
    question,
    {
      games: gamePool,
      h2hSplits: Array.isArray(nbaContext?.h2hSplits) ? nbaContext.h2hSplits : [],
      playoffSeries,
    },
  );

  const contextBlock = buildNbaFinalsContextBlock(seriesState, nbaIntent);

  return {
    finalsMode: true,
    seriesState,
    contextBlock,
  };
}
