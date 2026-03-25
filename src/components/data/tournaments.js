// src/data/tournaments.js

export const TOURNAMENTS = {
  miami_open: {
    id: "miami_open",
    name: "Miami Open",
    surface: "Hard",
    speed: "Medium-Fast",
    location: "Miami, FL",
    months: [3, 4],
    atp_favorite: "Sinner",
    wta_favorite: "Sabalenka",
    note: "Baseline consistency rewarded. Humidity slows the ball slightly. Big servers underperform vs clay specialists here.",
    surfaceEdge: "hard",
    color: "#00F5E9"
  },
  roland_garros: {
    id: "roland_garros",
    name: "Roland Garros",
    surface: "Clay",
    speed: "Slow",
    location: "Paris, France",
    months: [5, 6],
    atp_favorite: "Alcaraz / Sinner",
    wta_favorite: "Swiatek",
    note: "Clay heavily favors heavy topspin, high bounce, long rallies. Serve impact drops. Return game premium. Classic clay specialists dominate.",
    surfaceEdge: "clay",
    color: "#F5C842"
  },
  wimbledon: {
    id: "wimbledon",
    name: "Wimbledon",
    surface: "Grass",
    speed: "Fast",
    location: "London, UK",
    months: [6, 7],
    atp_favorite: "Djokovic / Sinner",
    wta_favorite: "Rybakina",
    note: "Fast grass rewards big serve and net approach. First-set momentum is critical. Upsets common in early rounds. Ace counts spike.",
    surfaceEdge: "grass",
    color: "#4ADE80"
  },
  us_open: {
    id: "us_open",
    name: "US Open",
    surface: "Hard",
    speed: "Medium-Fast",
    location: "New York, NY",
    months: [8, 9],
    atp_favorite: "Sinner / Alcaraz",
    wta_favorite: "Sabalenka / Gauff",
    note: "Night sessions and crowd create energy swings. Windy conditions affect serve accuracy. Hard-court all-rounders thrive.",
    surfaceEdge: "hard",
    color: "#FF2D6B"
  },
  australian_open: {
    id: "australian_open",
    name: "Australian Open",
    surface: "Hard",
    speed: "Medium",
    location: "Melbourne, Australia",
    months: [1],
    atp_favorite: "Sinner",
    wta_favorite: "Sabalenka",
    note: "Rebound Ace surface slightly slower than US Open. Heat can be a factor. Sinner has dominated Melbourne recently.",
    surfaceEdge: "hard",
    color: "#60A5FA"
  },
  indian_wells: {
    id: "indian_wells",
    name: "Indian Wells",
    surface: "Hard",
    speed: "Medium-Fast",
    location: "Indian Wells, CA",
    months: [3],
    atp_favorite: "Alcaraz",
    wta_favorite: "Swiatek",
    note: "Altitude and dry air speed up ball. Big servers do well. Desert conditions unique — ball moves differently than other hard courts.",
    surfaceEdge: "hard",
    color: "#F97316"
  }
};

// Helper: get current or upcoming tournament by date
export function getActiveTournament() {
  const month = new Date().getMonth() + 1;
  for (const t of Object.values(TOURNAMENTS)) {
    if (t.months.includes(month)) return t;
  }
  // Default fallback
  return TOURNAMENTS.miami_open;
}

export function getTournamentById(id) {
  return TOURNAMENTS[id] || null;
}
