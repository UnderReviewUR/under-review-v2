const wtaPlayers = {
  Sabalenka: {
    eloRank: 1,
    elo: 2247,
    record: "63-9 (87.5%) last 52 weeks",
    record2026: "17-1 — #1 in-season form. Currently at career peak Elo. Dominant 2026.",

    style: ["aggressive_power_baseliner"],
    strengths: ["serve", "forehand", "physicality", "pressure_play"],

    serveStats: {
      holdPct: 79.9,
      acePct: 6.6,
      dfPct: 3.3,
    },

    returnStats: {
      rpwPct: 45.3,
      breakPct: 38.0,
    },

    bpStats: {
      breakPointConversionPct: 44.5,
      breakPointSavePct: 66.0,
    },

    overallStats: {
      tiebreakPct: 92.3,
    },

    h2h: "vs Rybakina 9-7 · vs Swiatek 5-8 · vs Gauff 6-6 · vs Pegula 9-3",

    fullNote:
      "The most explosive hard-court force on the WTA when the ball is coming through cleanly. She is not just a power player now — the return numbers are elite too.",

    miamiNote:
      "Miami still rewards her front-foot style, but the slightly slower court gives opponents a few more neutral-ball chances than ultra-fast hard courts would.",

    surfaceNote: {
      hard: "One of the best hard-court players in the world.",
      clay: "Still elite because the return and weight of shot translate.",
      grass: "Serve and first-strike patterns keep her dangerous everywhere.",
    },
  },

  Rybakina: {
    eloRank: 2,
    elo: 2163,
    record: "61-17 (78.2%) last 52 weeks",
    record2026: "17-4 — #3 in-season form. Strong 2026.",

    style: ["serve_and_baseline_power_player"],
    strengths: ["serve", "flat_groundstrokes", "net_presence"],

    serveStats: {
      holdPct: 83.6,
      acePct: 10.3,
      dfPct: 3.7,
    },

    returnStats: {
      rpwPct: 42.7,
      breakPct: 33.0,
    },

    bpStats: {
      breakPointConversionPct: 45.3,
      breakPointSavePct: 66.7,
    },

    overallStats: {},

    h2h: "vs Sabalenka 7-9 · vs Swiatek 6-6 · vs Pegula 0-3",

    fullNote:
      "Serve is the defining weapon. She can hit through almost any hard-court matchup, but the return profile is more ordinary than the top-line reputation suggests.",

    miamiNote:
      "Still dangerous here because the serve travels, but Miami does not hand the same level of easy first-strike tennis that the fastest surfaces do.",

    surfaceNote: {
      hard: "Elite hard-court player.",
      clay: "Playable on clay, but not where her main edge is maximized.",
      grass: "Grass is arguably her cleanest ceiling surface.",
    },
  },
};

export default wtaPlayers;
