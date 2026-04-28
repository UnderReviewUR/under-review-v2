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

const MATCHUP_CONTEXT = {};

const ACE_PROPS = {
  sinner:    { avg_aces_hard: 8.1, avg_aces_clay: 5.2, avg_aces_grass: 9.4, ace_rate: "10.2%" },
  alcaraz:   { avg_aces_hard: 7.4, avg_aces_clay: 6.1, avg_aces_grass: 8.9, ace_rate: "9.8%" },
  djokovic:  { avg_aces_hard: 6.2, avg_aces_clay: 4.8, avg_aces_grass: 7.1, ace_rate: "7.9%" },
  medvedev:  { avg_aces_hard: 9.3, avg_aces_clay: 5.9, avg_aces_grass: 10.2, ace_rate: "12.1%" },
  zverev:    { avg_aces_hard: 8.8, avg_aces_clay: 6.4, avg_aces_grass: 9.7, ace_rate: "11.3%" },
  fritz:     { avg_aces_hard: 10.2, avg_aces_clay: 6.8, avg_aces_grass: 11.4, ace_rate: "13.5%" },
  sabalenka: { avg_aces_hard: 5.8, avg_aces_clay: 3.9, avg_aces_grass: 6.4, ace_rate: "7.2%" },
  swiatek:   { avg_aces_hard: 3.1, avg_aces_clay: 2.8, avg_aces_grass: 3.4, ace_rate: "3.9%" },
  gauff:     { avg_aces_hard: 4.2, avg_aces_clay: 2.9, avg_aces_grass: 4.8, ace_rate: "5.3%" },
  rybakina:  { avg_aces_hard: 8.4, avg_aces_clay: 5.1, avg_aces_grass: 9.2, ace_rate: "11.1%" },
  pegula:    { avg_aces_hard: 3.8, avg_aces_clay: 2.4, avg_aces_grass: 4.1, ace_rate: "4.9%" },
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

  res.status(200).json({
    currentTournament: {
      ...currentTournament,
      key: activeKey,
      primaryElo,
    },
    tournaments: TOURNAMENTS,
    matchups: MATCHUP_CONTEXT,
    ace_props: ACE_PROPS,
    breaking: breakingOverride !== undefined ? breakingOverride : TENNIS_BREAKING,
  });
  } catch {
    return res.status(500).json({ error: "tennis_context_error" });
  }
}
