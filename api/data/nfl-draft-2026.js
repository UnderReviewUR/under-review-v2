import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TEAM_NEEDS_2026 } from "./nfl-team-needs-2026.js";
import { applyConsensusMetadata, CONSENSUS_BOARD_NOTE } from "./nfl-draft-consensus-overrides.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE_UPDATED_AT = "2026-04-20";

/**
 * Source notes:
 * - NFL.com tracker: primary verified names, positions, schools, grades (pool depth).
 * - CBS Round 1 "What I would do" (Ryan Wilson): pick numbers + CBS PROSPECT RNK — consensus ordering + ranges.
 * - CBS seven-round team mocks + ESPN Schefter intel: situational notes / conflicts (no full ordinals).
 * - PFF draft hub: subscriber wall blocked numbered big-board export at ingest.
 * - PFR 2026 draft URL returned 403 at ingest time.
 */

/** Optional narrative fields for top names (simulation + prompt grounding). */
const PROSPECT_NARRATIVE = {
  "Arvell Reese": {
    keyStrengths: ["elite bend", "first-step quickness", "pass-rush arsenal"],
    concerns: ["run-defense consistency"],
  },
  "David Bailey": {
    keyStrengths: ["motor", "power rush", "production"],
    concerns: ["athleticism ceiling", "late declare context"],
  },
  "Fernando Mendoza": {
    keyStrengths: ["pocket management", "arm talent flashes", "trajectory"],
    concerns: ["one-year spike vs long track record"],
  },
  "Jeremiyah Love": {
    keyStrengths: ["burst", "contact balance", "breakaway speed"],
    concerns: ["pass-pro sample", "volume role"],
  },
  "Rueben Bain Jr.": {
    keyStrengths: ["hands", "first-step", "versatile alignment"],
    concerns: ["frame length vs NFL OTs"],
  },
  "Sonny Styles": {
    keyStrengths: ["range", "hit power", "coverage upside"],
    concerns: ["pure fit: off-ball vs hybrid usage"],
  },
  "Ty Simpson": {
    keyStrengths: ["arm strength", "athletic upside", "program tools"],
    concerns: ["starter sample", "decision consistency"],
  },
};
const RAW_PROSPECTS_2026 = [
  ["Arvell Reese", "EDGE", "Ohio State", 7.04],
  ["David Bailey", "EDGE", "Texas Tech", 6.78],
  ["Mansoor Delane", "CB", "LSU", 6.77],
  ["Fernando Mendoza", "QB", "Indiana", 6.73],
  ["Jeremiyah Love", "RB", "Notre Dame", 6.73],
  ["Carnell Tate", "WR", "Ohio State", 6.71],
  ["Rueben Bain Jr.", "EDGE", "Miami", 6.7],
  ["Francis Mauigoa", "OT", "Miami", 6.48],
  ["Sonny Styles", "LB", "Ohio State", 6.48],
  ["Caleb Downs", "SAF", "Ohio State", 6.47],
  ["Makai Lemon", "WR", "USC", 6.47],
  ["Kenyon Sadiq", "TE", "Oregon", 6.46],
  ["Kadyn Proctor", "OT", "Alabama", 6.45],
  ["Spencer Fano", "OT", "Utah", 6.44],
  ["Jordyn Tyson", "WR", "Arizona State", 6.43],
  ["Keldric Faulk", "EDGE", "Auburn", 6.43],
  ["Akheem Mesidor", "EDGE", "Miami", 6.42],
  ["KC Concepcion", "WR", "Texas A&M", 6.42],
  ["Olaivavega Ioane", "G", "Penn State", 6.41],
  ["Denzel Boston", "WR", "Washington", 6.4],
  ["Jermod McCoy", "CB", "Tennessee", 6.4],
  ["Zion Young", "EDGE", "Missouri", 6.4],
  ["Anthony Hill Jr.", "LB", "Texas", 6.39],
  ["Avieon Terrell", "CB", "Clemson", 6.39],
  ["Emmanuel McNeil-Warren", "SAF", "Toledo", 6.39],
  ["Kayden McDonald", "DT", "Ohio State", 6.39],
  ["Omar Cooper Jr.", "WR", "Indiana", 6.39],
  ["Caleb Lomu", "OT", "Utah", 6.38],
  ["Cashius Howell", "EDGE", "Texas A&M", 6.38],
  ["Colton Hood", "CB", "Tennessee", 6.38],
  ["Jadarian Price", "RB", "Notre Dame", 6.38],
  ["Monroe Freeling", "OT", "Georgia", 6.38],
  ["Caleb Banks", "DT", "Florida", 6.37],
  ["Dillon Thieneman", "SAF", "Oregon", 6.37],
  ["Chris Brazzell II", "WR", "Tennessee", 6.36],
  ["Emmanuel Pregnon", "G", "Oregon", 6.36],
  ["Peter Woods", "DT", "Clemson", 6.36],
  ["Chris Johnson", "CB", "San Diego State", 6.35],
  ["Max Iheanachor", "OT", "Arizona State", 6.35],
  ["Chase Bisontis", "G", "Texas A&M", 6.34],
  ["Christen Miller", "DT", "Georgia", 6.34],
  ["Jacob Rodriguez", "LB", "Texas Tech", 6.34],
  ["Malachi Lawrence", "EDGE", "UCF", 6.34],
  ["Blake Miller", "OT", "Clemson", 6.33],
  ["Gabe Jacas", "EDGE", "Illinois", 6.33],
  ["Jake Golday", "LB", "Cincinnati", 6.33],
  ["Jalon Kilgore", "SAF", "South Carolina", 6.32],
  ["Zachariah Branch", "WR", "Georgia", 6.32],
  ["Skyler Bell", "WR", "Connecticut", 6.31],
  ["Derrick Moore", "EDGE", "Michigan", 6.3],
  ["Kyle Louis", "LB", "Pittsburgh", 6.3],
  ["Max Klare", "TE", "Ohio State", 6.3],
  ["Ty Simpson", "QB", "Alabama", 6.3],
  ["A.J. Haulcy", "SAF", "LSU", 6.29],
  ["CJ Allen", "LB", "Georgia", 6.29],
  ["Germie Bernard", "WR", "Alabama", 6.29],
  ["Josiah Trotter", "LB", "Missouri", 6.29],
  ["Keylan Rutledge", "G", "Georgia Tech", 6.29],
  ["T.J. Parker", "EDGE", "Clemson", 6.29],
  ["Bud Clark", "SAF", "TCU", 6.28],
  ["D'Angelo Ponds", "CB", "Indiana", 6.28],
  ["De'Zhaun Stribling", "WR", "Mississippi", 6.28],
  ["Jaishawn Barham", "EDGE", "Michigan", 6.28],
  ["R Mason Thomas", "EDGE", "Oklahoma", 6.28],
  ["Brandon Cisse", "CB", "South Carolina", 6.27],
  ["Connor Lew", "C", "Auburn", 6.27],
  ["Keionte Scott", "CB", "Miami", 6.27],
  ["Malachi Fields", "WR", "Notre Dame", 6.27],
  ["Treydan Stukes", "SAF", "Arizona", 6.27],
  ["Antonio Williams", "WR", "Clemson", 6.26],
  ["Domonique Orange", "DT", "Iowa State", 6.26],
  ["Keyron Crawford", "EDGE", "Auburn", 6.26],
  ["Sam Roush", "TE", "Stanford", 6.26],
  ["Zxavian Harris", "DT", "Mississippi", 6.25],
  ["Caleb Tiernan", "OT", "Northwestern", 6.24],
  ["Chris Bell", "WR", "Louisville", 6.24],
  ["Eli Stowers", "TE", "Vanderbilt", 6.24],
  ["Joshua Josephs", "EDGE", "Tennessee", 6.24],
  ["Lee Hunter", "DT", "Texas Tech", 6.24],
  ["Mike Washington Jr.", "RB", "Arkansas", 6.24],
  ["Gennings Dunker", "G", "Iowa", 6.23],
  ["Sam Hecht", "C", "Kansas State", 6.23],
  ["Malik Muhammad", "CB", "Texas", 6.21],
  ["Tyler Onyedim", "DT", "Texas A&M", 6.21],
  ["Brian Parker II", "C", "Duke", 6.2],
  ["Ja'Kobi Lane", "WR", "USC", 6.2],
  ["Jalen Farmer", "G", "Kentucky", 6.2],
  ["Keith Abney II", "CB", "Arizona State", 6.2],
  ["Logan Jones", "C", "Iowa", 6.2],
  ["Trey Zuhn III", "C", "Texas A&M", 6.2],
  ["Elijah Sarratt", "WR", "Indiana", 6.19],
  ["Jadon Canady", "CB", "Oregon", 6.19],
  ["Jimmy Rolder", "LB", "Michigan", 6.19],
  ["Keagen Trost", "OT", "Missouri", 6.19],
  ["Romello Height", "EDGE", "Texas Tech", 6.19],
  ["Ted Hurst", "WR", "Georgia State", 6.19],
  ["Anez Cooper", "G", "Miami", 6.18],
  ["Cyrus Allen", "WR", "Cincinnati", 6.18],
  ["Dametrious Crownover", "OT", "Texas A&M", 6.18],
  ["Dani Dennis-Sutton", "EDGE", "Penn State", 6.18],
];

const RINGER_COMPS = {
  "Fernando Mendoza": "Flacco on the field, Russ on the mic",
  "Jeremiyah Love": "Darren McFadden",
  "Sonny Styles": "Devin Lloyd",
  "Makai Lemon": "Doug Baldwin",
};

const SOURCE_PRIORITY = {
  nflTracker: 1,
  ringer: 2,
  espn: 3,
  otc: 4,
};

function projectedRoundFromRank(rank) {
  if (rank <= 32) return 1;
  if (rank <= 64) return 2;
  if (rank <= 96) return 3;
  return 4;
}

function projectedRangeFromRank(rank) {
  if (rank <= 10) return "1-10";
  if (rank <= 20) return "11-20";
  if (rank <= 32) return "21-32";
  if (rank <= 50) return "33-50";
  if (rank <= 64) return "51-64";
  if (rank <= 85) return "65-85";
  if (rank <= 96) return "86-96";
  return "97-140";
}

function buildProspectPool() {
  let ranked = RAW_PROSPECTS_2026.map(([name, position, school, nflGrade]) => ({
    name,
    position,
    school,
    nflGrade,
    sourceUpdatedAt: SOURCE_UPDATED_AT,
  }));

  ranked = applyConsensusMetadata(ranked);

  const byPositionCounters = new Map();

  for (let i = 0; i < ranked.length; i += 1) {
    const p = ranked[i];
    const nextPosRank = (byPositionCounters.get(p.position) || 0) + 1;
    byPositionCounters.set(p.position, nextPosRank);
    p.overallRank = i + 1;
    p.positionalRank = nextPosRank;
    const rankBasis = Number(p.consensusRank ?? p.overallRank);
    p.projectedRound = projectedRoundFromRank(rankBasis);
    if (!p.projectedRange) {
      p.projectedRange = projectedRangeFromRank(rankBasis);
    }
    const src = new Set(p.sources || ["nflTracker"]);
    src.add("nflTracker");
    p.sources = Array.from(src);
    if (RINGER_COMPS[p.name]) {
      p.sources.push("ringer");
      p.comparablePlayer = RINGER_COMPS[p.name];
    }
    p.sources.sort((a, b) => SOURCE_PRIORITY[a] - SOURCE_PRIORITY[b]);
    const nar = PROSPECT_NARRATIVE[p.name];
    if (nar) Object.assign(p, nar);
  }

  return Object.fromEntries(
    ranked.map((p) => {
      const row = {
        position: p.position,
        school: p.school,
        nflGrade: p.nflGrade,
        projectedRound: p.projectedRound,
        projectedRange: p.projectedRange,
        positionalRank: p.positionalRank,
        overallRank: p.overallRank,
        consensusRank: p.consensusRank ?? p.overallRank,
        comparablePlayer: p.comparablePlayer,
        sourceUpdatedAt: p.sourceUpdatedAt,
        sources: p.sources,
      };
      if (p.sourceRanges) row.sourceRanges = p.sourceRanges;
      if (p.draftNote) row.draftNote = p.draftNote;
      if (p.keyStrengths) row.keyStrengths = p.keyStrengths;
      if (p.concerns) row.concerns = p.concerns;
      return [p.name, row];
    }),
  );
}

function fullTeamToAbbrMap() {
  return {
    "Arizona Cardinals": "ARI",
    "Atlanta Falcons": "ATL",
    "Baltimore Ravens": "BAL",
    "Buffalo Bills": "BUF",
    "Carolina Panthers": "CAR",
    "Chicago Bears": "CHI",
    "Cincinnati Bengals": "CIN",
    "Cleveland Browns": "CLE",
    "Dallas Cowboys": "DAL",
    "Denver Broncos": "DEN",
    "Detroit Lions": "DET",
    "Green Bay Packers": "GB",
    "Houston Texans": "HOU",
    "Indianapolis Colts": "IND",
    "Jacksonville Jaguars": "JAX",
    "Kansas City Chiefs": "KC",
    "Las Vegas Raiders": "LV",
    "Los Angeles Chargers": "LAC",
    "Los Angeles Rams": "LAR",
    "Miami Dolphins": "MIA",
    "Minnesota Vikings": "MIN",
    "New England Patriots": "NE",
    "New Orleans Saints": "NO",
    "New York Giants": "NYG",
    "New York Jets": "NYJ",
    "Philadelphia Eagles": "PHI",
    "Pittsburgh Steelers": "PIT",
    "San Francisco 49ers": "SF",
    "Seattle Seahawks": "SEA",
    "Tampa Bay Buccaneers": "TB",
    "Tennessee Titans": "TEN",
    "Washington Commanders": "WAS",
  };
}

function readOrder2026() {
  const p = join(__dirname, "nfl-draft-order-2026.json");
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function buildTeamDraftState(orderRows) {
  const fullToAbbr = fullTeamToAbbrMap();
  const grouped = {};
  for (const row of orderRows) {
    const abbr = fullToAbbr[row.team];
    if (!abbr) continue;
    if (!grouped[abbr]) grouped[abbr] = [];
    grouped[abbr].push({
      round: Number(row.round),
      overall: Number(row.overall),
      fromTrade: !!row.slotNote,
    });
  }

  const out = {};
  for (const [fullName, abbr] of Object.entries(fullToAbbr)) {
    const picks = (grouped[abbr] || []).sort((a, b) => a.overall - b.overall);
    const needs = TEAM_NEEDS_2026[fullName]?.tags || [];
    const needPriority = needs.slice(0, 3);
    const capContext =
      picks.length >= 9 ? "high flexibility" : picks.length >= 7 ? "moderate flexibility" : "tight flexibility";
    const hasTwoRoundOne = picks.filter((p) => p.round === 1).length >= 2;
    const draftNote = hasTwoRoundOne
      ? "Multiple round-one picks create trade-up or double-dip flexibility."
      : `Primary need lane: ${TEAM_NEEDS_2026[fullName]?.headline || "best player at need"}.`;

    out[abbr] = {
      picks,
      needs,
      needPriority,
      rosteredPositions: ["QB", "RB", "WR", "TE"],
      capContext,
      draftNote,
      teamName: fullName,
      teamAbbr: abbr,
    };
  }

  return out;
}

const ORDER_2026 = readOrder2026();

export const PROSPECTS_2026 = buildProspectPool();
export const TEAM_DRAFT_STATE_2026 = buildTeamDraftState(ORDER_2026);

export const DRAFT_META_2026 = {
  location: "Pittsburgh, PA",
  dates: {
    round1: "2026-04-23",
    rounds2to3: "2026-04-24",
    rounds4to7: "2026-04-25",
  },
  totalPicks: 257,
  tradeHistory: [],
  phase: "pre_draft",
  sourceUpdatedAt: SOURCE_UPDATED_AT,
  consensusNote: CONSENSUS_BOARD_NOTE,
  sourceCoverage: {
    nflTracker: "verified_pool",
    cbsWilsonRound1Mock: "ingested_apr2026",
    cbsSevenRoundMocks: "supplemental_team_fits",
    espnSchefterIntel: "narrative_only",
    pffBigBoardOrdinals: "paywalled",
    espnRounds: "verified",
    ringerGuide: "partial_verified",
    overTheCap: "verified",
    pfr2026: "unavailable_403",
  },
};

export const POSITION_VALUE_MAP = {
  EDGE: { round1Value: "premium", round2Value: "high", round3Value: "value" },
  IDL: { round1Value: "premium", round2Value: "high", round3Value: "value" },
  DT: { round1Value: "premium", round2Value: "high", round3Value: "value" },
  IOL: { round1Value: "high", round2Value: "solid", round3Value: "late-round-value" },
  G: { round1Value: "high", round2Value: "solid", round3Value: "late-round-value" },
  C: { round1Value: "high", round2Value: "solid", round3Value: "late-round-value" },
  OT: { round1Value: "premium", round2Value: "high", round3Value: "value" },
  CB: { round1Value: "premium", round2Value: "high", round3Value: "volatile" },
  WR: { round1Value: "premium", round2Value: "high", round3Value: "volatile" },
  QB: { round1Value: "franchise", round2Value: "project", round3Value: "longshot" },
  RB: { round1Value: "avoid", round2Value: "value", round3Value: "best-value" },
  LB: { round1Value: "situational", round2Value: "solid", round3Value: "value" },
  TE: { round1Value: "high", round2Value: "solid", round3Value: "value" },
  S: { round1Value: "high", round2Value: "solid", round3Value: "value" },
  SAF: { round1Value: "high", round2Value: "solid", round3Value: "value" },
};

export const DRAFT_ORDER_2026 = ORDER_2026.map((row) => ({
  overall: Number(row.overall),
  round: Number(row.round),
  team: String(row.team || ""),
  slotNote: row.slotNote || null,
  pickInRound: Number(row.pickInRound || 0),
}));

export function getProspectsAsArray() {
  return Object.entries(PROSPECTS_2026)
    .map(([name, p]) => ({ name, ...p }))
    .sort((a, b) => Number(a.consensusRank ?? a.overallRank) - Number(b.consensusRank ?? b.overallRank));
}
