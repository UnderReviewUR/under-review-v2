import {
  TOURNAMENTS,
  getActiveTournamentKey,
} from "../data/tennis/tournamentMeta.js";
import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";

export const config = { api: { bodyParser: false } };

const SURFACE_ELO_MAP = {
  "Hard": "hElo",
  "Clay": "cElo",
  "Grass": "gElo",
  "Hard (Plexicushion)": "hElo",
  "Hard (DecoTurf)": "hElo",
  "Clay (Red Clay)": "cElo",
  "Clay (Green Clay)": "cElo",
};

/** Legacy field retained for older consumers; primary serve shape is acesPerMatch / DF / 1st%. */
const MATCHUP_CONTEXT = {};

const H2H_FEED_NOTE =
  "H2H records: not available in current feed. Do not cite H2H statistics. Reason from surface and serve profile only.";

const SURFACE_RECORD_FEED_NOTE =
  "Surface-specific win/loss records are not available in the current feed. For each matchup, use serve profile + tournament surface only — do not invent surface records.";

const MATCH_SURFACE_NOTE_TEMPLATE =
  "[Player] on [surface]: record not available — reference serve profile and tournament history for surface edge.";

/**
 * Static season-style serve profiles (maintained in-repo, not live API).
 * firstServePercent is 0–1 fraction. surface = strongest career surface label.
 */
const ACE_PROPS = {
  djokovic: {
    acesPerMatch: 4.9,
    doubleFaultsPerMatch: 2.1,
    firstServePercent: 0.65,
    surface: "hard",
    avg_aces_hard: 6.2,
    avg_aces_clay: 4.8,
    avg_aces_grass: 7.1,
    ace_rate: "7.9%",
  },
  alcaraz: {
    acesPerMatch: 5.8,
    doubleFaultsPerMatch: 2.8,
    firstServePercent: 0.62,
    surface: "clay",
    avg_aces_hard: 7.4,
    avg_aces_clay: 6.1,
    avg_aces_grass: 8.9,
    ace_rate: "9.8%",
  },
  sinner: {
    acesPerMatch: 7.2,
    doubleFaultsPerMatch: 2.0,
    firstServePercent: 0.64,
    surface: "hard",
    avg_aces_hard: 8.1,
    avg_aces_clay: 5.2,
    avg_aces_grass: 9.4,
    ace_rate: "10.2%",
  },
  zverev: {
    acesPerMatch: 8.1,
    doubleFaultsPerMatch: 3.2,
    firstServePercent: 0.66,
    surface: "hard",
    avg_aces_hard: 8.8,
    avg_aces_clay: 6.4,
    avg_aces_grass: 9.7,
    ace_rate: "11.3%",
  },
  medvedev: {
    acesPerMatch: 8.5,
    doubleFaultsPerMatch: 2.4,
    firstServePercent: 0.67,
    surface: "hard",
    avg_aces_hard: 9.3,
    avg_aces_clay: 5.9,
    avg_aces_grass: 10.2,
    ace_rate: "12.1%",
  },
  rublev: {
    acesPerMatch: 6.1,
    doubleFaultsPerMatch: 2.9,
    firstServePercent: 0.61,
    surface: "clay",
    avg_aces_hard: 6.8,
    avg_aces_clay: 5.5,
    avg_aces_grass: 7.2,
    ace_rate: "9.0%",
  },
  hurkacz: {
    acesPerMatch: 9.4,
    doubleFaultsPerMatch: 2.1,
    firstServePercent: 0.68,
    surface: "grass",
    avg_aces_hard: 10.1,
    avg_aces_clay: 6.0,
    avg_aces_grass: 11.2,
    ace_rate: "12.8%",
  },
  fritz: {
    acesPerMatch: 9.1,
    doubleFaultsPerMatch: 2.3,
    firstServePercent: 0.63,
    surface: "hard",
    avg_aces_hard: 10.2,
    avg_aces_clay: 6.8,
    avg_aces_grass: 11.4,
    ace_rate: "13.5%",
  },
  paul: {
    acesPerMatch: 5.5,
    doubleFaultsPerMatch: 2.5,
    firstServePercent: 0.62,
    surface: "hard",
    avg_aces_hard: 6.0,
    avg_aces_clay: 5.0,
    avg_aces_grass: 6.5,
    ace_rate: "8.5%",
  },
  de_minaur: {
    acesPerMatch: 3.8,
    doubleFaultsPerMatch: 2.0,
    firstServePercent: 0.62,
    surface: "hard",
    avg_aces_hard: 4.2,
    avg_aces_clay: 3.5,
    avg_aces_grass: 4.5,
    ace_rate: "6.0%",
  },
  tsitsipas: {
    acesPerMatch: 6.8,
    doubleFaultsPerMatch: 2.6,
    firstServePercent: 0.61,
    surface: "clay",
    avg_aces_hard: 7.2,
    avg_aces_clay: 6.5,
    avg_aces_grass: 7.8,
    ace_rate: "9.5%",
  },
  ruud: {
    acesPerMatch: 4.2,
    doubleFaultsPerMatch: 2.0,
    firstServePercent: 0.63,
    surface: "clay",
    avg_aces_hard: 4.6,
    avg_aces_clay: 4.9,
    avg_aces_grass: 4.1,
    ace_rate: "6.8%",
  },
  musetti: {
    acesPerMatch: 4.5,
    doubleFaultsPerMatch: 2.4,
    firstServePercent: 0.6,
    surface: "clay",
    avg_aces_hard: 5.0,
    avg_aces_clay: 5.2,
    avg_aces_grass: 4.8,
    ace_rate: "7.2%",
  },
  dimitrov: {
    acesPerMatch: 6.2,
    doubleFaultsPerMatch: 2.3,
    firstServePercent: 0.62,
    surface: "hard",
    avg_aces_hard: 6.8,
    avg_aces_clay: 5.4,
    avg_aces_grass: 7.5,
    ace_rate: "9.0%",
  },
  shelton: {
    acesPerMatch: 11.2,
    doubleFaultsPerMatch: 3.1,
    firstServePercent: 0.58,
    surface: "hard",
    avg_aces_hard: 12.0,
    avg_aces_clay: 8.5,
    avg_aces_grass: 11.0,
    ace_rate: "14.5%",
  },
  norrie: {
    acesPerMatch: 4.0,
    doubleFaultsPerMatch: 1.9,
    firstServePercent: 0.64,
    surface: "clay",
    avg_aces_hard: 4.4,
    avg_aces_clay: 4.6,
    avg_aces_grass: 4.2,
    ace_rate: "6.5%",
  },
  khachanov: {
    acesPerMatch: 7.5,
    doubleFaultsPerMatch: 2.8,
    firstServePercent: 0.62,
    surface: "hard",
    avg_aces_hard: 8.0,
    avg_aces_clay: 6.2,
    avg_aces_grass: 8.2,
    ace_rate: "10.5%",
  },
  rune: {
    acesPerMatch: 5.2,
    doubleFaultsPerMatch: 2.6,
    firstServePercent: 0.61,
    surface: "hard",
    avg_aces_hard: 5.6,
    avg_aces_clay: 4.9,
    avg_aces_grass: 5.8,
    ace_rate: "8.0%",
  },
  holger: {
    acesPerMatch: 5.2,
    doubleFaultsPerMatch: 2.6,
    firstServePercent: 0.61,
    surface: "hard",
    avg_aces_hard: 5.6,
    avg_aces_clay: 4.9,
    avg_aces_grass: 5.8,
    ace_rate: "8.0%",
  },
  lehecka: {
    acesPerMatch: 7.8,
    doubleFaultsPerMatch: 2.5,
    firstServePercent: 0.6,
    surface: "hard",
    avg_aces_hard: 8.2,
    avg_aces_clay: 6.5,
    avg_aces_grass: 8.0,
    ace_rate: "10.8%",
  },
  jarry: {
    acesPerMatch: 10.5,
    doubleFaultsPerMatch: 2.7,
    firstServePercent: 0.59,
    surface: "clay",
    avg_aces_hard: 10.8,
    avg_aces_clay: 9.2,
    avg_aces_grass: 10.0,
    ace_rate: "13.2%",
  },
  griekspoor: {
    acesPerMatch: 9.0,
    doubleFaultsPerMatch: 2.4,
    firstServePercent: 0.61,
    surface: "grass",
    avg_aces_hard: 9.5,
    avg_aces_clay: 7.0,
    avg_aces_grass: 9.8,
    ace_rate: "12.0%",
  },
  cobolli: {
    acesPerMatch: 4.8,
    doubleFaultsPerMatch: 2.5,
    firstServePercent: 0.59,
    surface: "clay",
    avg_aces_hard: 5.2,
    avg_aces_clay: 5.0,
    avg_aces_grass: 4.9,
    ace_rate: "7.5%",
  },
  navone: {
    acesPerMatch: 4.2,
    doubleFaultsPerMatch: 2.3,
    firstServePercent: 0.58,
    surface: "clay",
    avg_aces_hard: 4.5,
    avg_aces_clay: 4.8,
    avg_aces_grass: 3.9,
    ace_rate: "7.0%",
  },
  marozsan: {
    acesPerMatch: 5.5,
    doubleFaultsPerMatch: 2.4,
    firstServePercent: 0.6,
    surface: "clay",
    avg_aces_hard: 5.9,
    avg_aces_clay: 5.6,
    avg_aces_grass: 5.2,
    ace_rate: "8.2%",
  },
  cerundolo: {
    acesPerMatch: 5.0,
    doubleFaultsPerMatch: 2.6,
    firstServePercent: 0.58,
    surface: "clay",
    avg_aces_hard: 5.4,
    avg_aces_clay: 5.5,
    avg_aces_grass: 4.6,
    ace_rate: "7.8%",
  },
  bergs: {
    acesPerMatch: 6.5,
    doubleFaultsPerMatch: 2.4,
    firstServePercent: 0.59,
    surface: "hard",
    avg_aces_hard: 6.9,
    avg_aces_clay: 5.8,
    avg_aces_grass: 6.5,
    ace_rate: "9.2%",
  },
  eubanks: {
    acesPerMatch: 10.2,
    doubleFaultsPerMatch: 2.9,
    firstServePercent: 0.57,
    surface: "grass",
    avg_aces_hard: 10.5,
    avg_aces_clay: 7.8,
    avg_aces_grass: 11.0,
    ace_rate: "13.0%",
  },
  mpetshi_perricard: {
    acesPerMatch: 12.5,
    doubleFaultsPerMatch: 3.2,
    firstServePercent: 0.56,
    surface: "grass",
    avg_aces_hard: 12.0,
    avg_aces_clay: 9.5,
    avg_aces_grass: 12.8,
    ace_rate: "15.5%",
  },
  atmane: {
    acesPerMatch: 5.8,
    doubleFaultsPerMatch: 2.8,
    firstServePercent: 0.57,
    surface: "hard",
    avg_aces_hard: 6.2,
    avg_aces_clay: 5.0,
    avg_aces_grass: 5.5,
    ace_rate: "8.5%",
  },
  sabalenka: {
    acesPerMatch: 6.2,
    doubleFaultsPerMatch: 3.5,
    firstServePercent: 0.58,
    surface: "hard",
    avg_aces_hard: 5.8,
    avg_aces_clay: 3.9,
    avg_aces_grass: 6.4,
    ace_rate: "7.2%",
  },
  swiatek: {
    acesPerMatch: 2.8,
    doubleFaultsPerMatch: 2.0,
    firstServePercent: 0.64,
    surface: "clay",
    avg_aces_hard: 3.1,
    avg_aces_clay: 2.8,
    avg_aces_grass: 3.4,
    ace_rate: "3.9%",
  },
  gauff: {
    acesPerMatch: 3.9,
    doubleFaultsPerMatch: 2.5,
    firstServePercent: 0.61,
    surface: "hard",
    avg_aces_hard: 4.2,
    avg_aces_clay: 2.9,
    avg_aces_grass: 4.8,
    ace_rate: "5.3%",
  },
  rybakina: {
    acesPerMatch: 7.6,
    doubleFaultsPerMatch: 3.8,
    firstServePercent: 0.59,
    surface: "grass",
    avg_aces_hard: 8.4,
    avg_aces_clay: 5.1,
    avg_aces_grass: 9.2,
    ace_rate: "11.1%",
  },
  pegula: {
    acesPerMatch: 3.5,
    doubleFaultsPerMatch: 2.1,
    firstServePercent: 0.63,
    surface: "hard",
    avg_aces_hard: 3.8,
    avg_aces_clay: 2.4,
    avg_aces_grass: 4.1,
    ace_rate: "4.9%",
  },
};

/**
 * Manual breaking news injected into UR TAKE tennis prompts (API field `breaking`).
 * Leave empty when clear — stale lines (e.g. old WD) will mislead on unrelated tournaments.
 * Prefer dated entries so ops can spot staleness at a glance:
 *
 * Last updated: leave empty when clear
 * Example: "2026-04-17 | Alcaraz WD Madrid — field repricing now"
 *
 * Override without deploy: set env `TENNIS_BREAKING` (same format).
 */
const TENNIS_BREAKING = "";

function buildMatchSurfaceRows(tournament) {
  const surface = tournament?.surface || "this surface";
  const rows = [];
  const add = (player) => {
    if (!player || player === "N/A") return;
    rows.push({
      player,
      surface,
      surfaceNote: `[${player}] on [${surface}]: record not available — reference serve profile and tournament history for surface edge.`,
    });
  };
  add(tournament?.atp_favorite);
  add(tournament?.wta_favorite);
  return rows;
}

function augmentTournamentContext(tournament) {
  const base = tournament?.context || "";
  const matchRows = buildMatchSurfaceRows(tournament);
  return [base, H2H_FEED_NOTE, SURFACE_RECORD_FEED_NOTE, ...matchRows.map((m) => m.surfaceNote)]
    .filter(Boolean)
    .join("\n\n");
}

export default function handler(req, res) {
  try {
  if (!applyCors(req, res)) return;

  const activeKey = getActiveTournamentKey();
  if (!activeKey || !TOURNAMENTS[activeKey]) {
    return res.status(200).json({ matches: [], context: null });
  }
  const currentTournament = TOURNAMENTS[activeKey];
  const primaryElo = SURFACE_ELO_MAP[currentTournament?.surface] || "hElo";

  const breakingOverride = getEnv("TENNIS_BREAKING", { treatEmptyAsMissing: false });

  const matchSurfaceRows = buildMatchSurfaceRows(currentTournament);

  res.status(200).json({
    currentTournament: {
      ...currentTournament,
      key: activeKey,
      primaryElo,
      context: augmentTournamentContext(currentTournament),
    },
    matches: matchSurfaceRows.map((m) => ({
      player: m.player,
      surface: m.surface,
      surfaceNote: m.surfaceNote,
    })),
    tournaments: TOURNAMENTS,
    matchups: MATCHUP_CONTEXT,
    ace_props: ACE_PROPS,
    /** UR Take grounding — same text is merged into currentTournament.context */
    h2hFeedNote: H2H_FEED_NOTE,
    surfaceFormFeedNote: SURFACE_RECORD_FEED_NOTE,
    matchSurfaceNoteTemplate: MATCH_SURFACE_NOTE_TEMPLATE,
    breaking: breakingOverride !== undefined ? breakingOverride : TENNIS_BREAKING,
  });
  } catch {
    return res.status(500).json({ error: "tennis_context_error" });
  }
}
