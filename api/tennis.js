export const config = { api: { bodyParser: false } };

const TOURNAMENTS = {
  miami_open: {
    name: "Miami Open",
    dates: "2026-03-19 to 2026-03-30",
    surface: "Hard (Plexicushion)",
    speed: "medium",
    location: "Miami Gardens, FL",
    tour: "ATP/WTA",
    context: "Balanced hard-court event. Use hard-court form, return quality, and tiebreak pressure.",
    surface_notes: "Use hElo as primary Elo signal.",
    atp_favorite: "Sinner",
    wta_favorite: "Sabalenka",
  },

  charleston_open: {
    name: "Charleston Open",
    dates: "2026-04-07 to 2026-04-13",
    surface: "Clay (Green Clay)",
    speed: "slow",
    location: "Charleston, SC",
    tour: "WTA",
    context: "Green clay raises break rate and extends rallies. Strong baseliners and movement profiles gain value.",
    surface_notes: "Use cElo as primary Elo signal.",
    atp_favorite: "N/A",
    wta_favorite: "Swiatek",
  },

  madrid_open: {
    name: "Madrid Open",
    dates: "2026-04-24 to 2026-05-03",
    surface: "Clay",
    speed: "medium-slow",
    location: "Madrid, Spain",
    tour: "ATP/WTA",
    context: "Altitude speeds conditions up versus standard clay. Power carries more than usual.",
    surface_notes: "Use cElo, but weight serve and aggression more than normal clay.",
    atp_favorite: "Alcaraz",
    wta_favorite: "Swiatek",
  },

  italian_open: {
    name: "Italian Open (Rome)",
    dates: "2026-05-10 to 2026-05-18",
    surface: "Clay (Red Clay)",
    speed: "slow",
    location: "Rome, Italy",
    tour: "ATP/WTA",
    context: "Traditional slow clay. Long rallies, higher break rate, and fitness edge.",
    surface_notes: "Use cElo as primary signal.",
    atp_favorite: "Alcaraz",
    wta_favorite: "Swiatek",
  },

  roland_garros: {
    name: "Roland Garros",
    dates: "2026-05-25 to 2026-06-08",
    surface: "Clay (Red Clay)",
    speed: "slow",
    location: "Paris, France",
    tour: "ATP/WTA",
    context: "Slowest major. Surface specialists gain the most.",
    surface_notes: "Use cElo as strongest clay signal.",
    atp_favorite: "Alcaraz",
    wta_favorite: "Swiatek",
  },

  wimbledon: {
    name: "Wimbledon",
    dates: "2026-06-29 to 2026-07-12",
    surface: "Grass",
    speed: "fast",
    location: "London, UK",
    tour: "ATP/WTA",
    context: "Fast surface, short rallies, tiebreak pressure, and hold-heavy profiles.",
    surface_notes: "Use gElo as primary signal.",
    atp_favorite: "Djokovic",
    wta_favorite: "Sabalenka",
  },

  us_open: {
    name: "US Open",
    dates: "2026-08-31 to 2026-09-13",
    surface: "Hard (DecoTurf)",
    speed: "medium-fast",
    location: "New York, NY",
    tour: "ATP/WTA",
    context: "Faster hard-court major. Power and return aggression both matter.",
    surface_notes: "Use hElo as primary signal.",
    atp_favorite: "Sinner",
    wta_favorite: "Sabalenka",
  },

  australian_open: {
    name: "Australian Open",
    dates: "2027-01-12 to 2027-01-26",
    surface: "Hard (Plexicushion)",
    speed: "medium",
    location: "Melbourne, Australia",
    tour: "ATP/WTA",
    context: "Medium hard-court conditions with heat as a major variable.",
    surface_notes: "Use hElo as primary signal.",
    atp_favorite: "Sinner",
    wta_favorite: "Sabalenka",
  },
};

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

function parseDateRange(range) {
  const [start, end] = String(range || "").split(" to ").map((s) => s.trim());
  return {
    start: start ? new Date(`${start}T00:00:00`) : null,
    end: end ? new Date(`${end}T23:59:59`) : null,
  };
}

function getActiveTournamentKey() {
  const now = new Date();

  for (const [key, tournament] of Object.entries(TOURNAMENTS)) {
    const { start, end } = parseDateRange(tournament.dates);
    if (start && end && now >= start && now <= end) {
      return key;
    }
  }

  const ordered = Object.entries(TOURNAMENTS)
    .map(([key, tournament]) => {
      const { start } = parseDateRange(tournament.dates);
      return { key, start };
    })
    .filter((item) => item.start instanceof Date && !isNaN(item.start))
    .sort((a, b) => a.start - b.start);

  const upcoming = ordered.find((item) => item.start >= now);
  return upcoming?.key || "miami_open";
}

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const activeKey = getActiveTournamentKey();
  const currentTournament = TOURNAMENTS[activeKey];
  const primaryElo = SURFACE_ELO_MAP[currentTournament?.surface] || "hElo";

  res.status(200).json({
    currentTournament: {
      ...currentTournament,
      key: activeKey,
      primaryElo,
    },
    tournaments: TOURNAMENTS,
    matchups: MATCHUP_CONTEXT,
    ace_props: ACE_PROPS,
  });
}
