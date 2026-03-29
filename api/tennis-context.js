// api/tennis-context.js
// Tournament rotation system for Under Review
// TO SWITCH TOURNAMENTS: change ACTIVE_TOURNAMENT to any key in TOURNAMENTS below
// That's the only line you ever need to touch.

export const config = { api: { bodyParser: false } };

// ---- CHANGE THIS TO ROTATE TOURNAMENTS ------------------------------------
const ACTIVE_TOURNAMENT = "charleston_open";
// --------------------------------------------------------------------------

const TOURNAMENTS = {

  miami_open: {
    name: "Miami Open",
    dates: "2026-03-19 to 2026-03-30",
    surface: "Hard (Plexicushion)",
    speed: "medium",
    location: "Miami Gardens, FL",
    tour: "ATP/WTA",
    context: "Slightly slower than US Open. Returners get neutral looks and rallies run longer than faster hard courts. Physical fatigue compounds faster in best-of-3 than at slams -- late-round serve and games total props are sensitive to physical state.",
    surface_notes: "Use hElo as primary Elo signal. Balanced surface favors all-court players. Games totals lean moderate. Late rounds slightly favor OVER games as fatigue builds.",
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
    context: "Green clay is slower than red clay -- more topspin, longer rallies, baseliners dominate. Serve is less decisive than hard court. Break rate rises for everyone. Stamina matters more in best-of-3 here than almost any other surface.",
    surface_notes: "Use cElo as primary Elo signal. High break rate means OVER games is the default lean. Aces UNDER almost always -- even big servers struggle here. Counter-punchers and baseliners have maximum advantage over power players.",
    atp_favorite: "N/A (WTA event)",
    wta_favorite: "Swiatek",
  },

  madrid_open: {
    name: "Madrid Open",
    dates: "2026-04-24 to 2026-05-03",
    surface: "Clay",
    speed: "medium-slow",
    location: "Madrid, Spain",
    tour: "ATP/WTA",
    context: "High altitude (650m) speeds the ball up significantly -- clay plays more like a medium hard court here. Big servers get more benefit than at Roland Garros. Upsets happen more frequently because altitude partially neutralizes baseliners' clay advantage. Night sessions especially unpredictable.",
    surface_notes: "Use cElo but weight it less than usual -- altitude favors power players. Aces slightly OVER vs normal clay. Games totals lower than standard clay. Serve holds more here than Roland Garros.",
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
    context: "Traditional red clay in Rome. Slower and heavier than Madrid -- clay specialists get full advantage here. Final tuneup before Roland Garros. Players are in peak clay form by this point in the season. Physically demanding with long rallies.",
    surface_notes: "Use cElo as primary signal. Games OVER is strong default lean. Aces UNDER for most players. Extended rallies favor retrievers and fitness players. Break rate elevated.",
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
    context: "Slowest major. Best-of-5 for men makes clay specialists even more dominant. Serve is least effective of any slam. Rain delays are common and shift momentum. Fitness and mental resilience are magnified more here than any other tournament.",
    surface_notes: "Use cElo as primary Elo signal -- strongest clay signal in the database. Aces UNDER for almost everyone. Games totals OVER. Hard court specialists are most disadvantaged here. Swiatek advantage is peak at Roland Garros.",
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
    context: "Fastest major. Big servers dominate more here than anywhere. First-strike tennis is rewarded -- short rallies, net approaches, slice backhands. Early rounds are especially volatile because low-ranked big servers can beat top-10 players on grass. Grass specialists have maximum edge.",
    surface_notes: "Use gElo as primary signal. Aces OVER for all big servers. Games totals UNDER. Hold rates spike and break rate falls across the board. Tiebreaks are extremely common. Grass Elo gap is the most predictive metric here.",
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
    context: "Faster than Australian Open. Night sessions favor power players -- crowd energy amplifies aggressive play. Humidity in day sessions can be significant. Most unpredictable major for upsets. Tiebreaks are common in men's draw.",
    surface_notes: "Use hElo as primary signal. Balanced between serve and return. Aces OVER for top servers. Night session props differ from day -- factor in crowd energy and conditions. Games totals medium.",
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
    context: "Similar speed to Miami. Heat is the defining factor -- extreme heat rule comes into play and rest periods shift match dynamics. Players who handle heat have a real edge. Night sessions are contested under cooler conditions and play faster. Rod Laver Arena plays medium-fast.",
    surface_notes: "Use hElo as primary signal. Heat is the key variable not in the Elo numbers. Factor in player nationality and heat tolerance. Night sessions lean UNDER games vs day sessions. Games totals medium.",
    atp_favorite: "Sinner",
    wta_favorite: "Sabalenka",
  },
};

// --- Surface-specific analysis helper -----------------------------------------
// Used by ur-take.js to know which Elo signal to prioritize
const SURFACE_ELO_MAP = {
  "Hard":       "hElo",
  "Clay":       "cElo",
  "Grass":      "gElo",
  "Hard (Plexicushion)":  "hElo",
  "Hard (DecoTurf)":      "hElo",
  "Clay (Red Clay)":      "cElo",
  "Clay (Green Clay)":    "cElo",
};

// --- Matchup context (player-specific angles for current tournament) -----------
// Add specific matchup notes here that are relevant to the active tournament
// These get injected into the ur-take system prompt
const MATCHUP_CONTEXT = {
  // Example format:
  // sinner_vs_medvedev: { note: "Sinner leads H2H 8-4 on hard", angle: "Sinner serve dominance in tiebreaks is the edge" },
};

// --- Ace prop baselines --------------------------------------------------------
const ACE_PROPS = {
  sinner:     { avg_aces_hard: 8.1,  avg_aces_clay: 5.2,  avg_aces_grass: 9.4,  ace_rate: "10.2%" },
  alcaraz:    { avg_aces_hard: 7.4,  avg_aces_clay: 6.1,  avg_aces_grass: 8.9,  ace_rate: "9.8%"  },
  djokovic:   { avg_aces_hard: 6.2,  avg_aces_clay: 4.8,  avg_aces_grass: 7.1,  ace_rate: "7.9%"  },
  medvedev:   { avg_aces_hard: 9.3,  avg_aces_clay: 5.9,  avg_aces_grass: 10.2, ace_rate: "12.1%" },
  zverev:     { avg_aces_hard: 8.8,  avg_aces_clay: 6.4,  avg_aces_grass: 9.7,  ace_rate: "11.3%" },
  rublev:     { avg_aces_hard: 5.1,  avg_aces_clay: 3.8,  avg_aces_grass: 5.9,  ace_rate: "6.8%"  },
  fritz:      { avg_aces_hard: 10.2, avg_aces_clay: 6.8,  avg_aces_grass: 11.4, ace_rate: "13.5%" },
  draper:     { avg_aces_hard: 7.9,  avg_aces_clay: 5.2,  avg_aces_grass: 8.8,  ace_rate: "10.4%" },
  sabalenka:  { avg_aces_hard: 5.8,  avg_aces_clay: 3.9,  avg_aces_grass: 6.4,  ace_rate: "7.2%"  },
  swiatek:    { avg_aces_hard: 3.1,  avg_aces_clay: 2.8,  avg_aces_grass: 3.4,  ace_rate: "3.9%"  },
  gauff:      { avg_aces_hard: 4.2,  avg_aces_clay: 2.9,  avg_aces_grass: 4.8,  ace_rate: "5.3%"  },
  rybakina:   { avg_aces_hard: 8.4,  avg_aces_clay: 5.1,  avg_aces_grass: 9.2,  ace_rate: "11.1%" },
  pegula:     { avg_aces_hard: 3.8,  avg_aces_clay: 2.4,  avg_aces_grass: 4.1,  ace_rate: "4.9%"  },
};

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const currentTournament = TOURNAMENTS[ACTIVE_TOURNAMENT];
  const primaryElo = SURFACE_ELO_MAP[currentTournament?.surface] || "hElo";

  res.status(200).json({
    currentTournament: {
      ...currentTournament,
      key: ACTIVE_TOURNAMENT,
      primaryElo,
    },
    tournaments: TOURNAMENTS,
    matchups: MATCHUP_CONTEXT,
    ace_props: ACE_PROPS,
  });
}
