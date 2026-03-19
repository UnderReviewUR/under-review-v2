const atpPlayers = {
  Alcaraz: {
    eloRank: 1,
    elo: 2290,
    record: "72-7 (91.1%) last 52 weeks",
    record2026: "16-1 — Won Australian Open, unbeaten until IW final. #1 in-season form on tour.",

    style: ["all_court_attacker"],
    strengths: ["drop_shots", "net_presence", "elite_athleticism"],

    serveStats: {
      holdPct: 88.5,
      acePct: 7.2,
      dfPct: 3.1,
    },

    returnStats: {
      rpwPct: 41.6,
      breakPct: 30.7,
    },

    bpStats: {
      breakPointConversionPct: 43.5,
      breakPointSavePct: 66.9,
    },

    overallStats: {
      dominanceRatio: 1.31,
      totalPointsWonPct: 54.5,
      tiebreakPct: 61.8,
    },

    h2h: "vs Sinner 11-6 · vs Djokovic 4-5 · vs Zverev 6-6 · vs Medvedev 6-2 · vs Fritz 5-1 · vs De Minaur 5-0 · vs Shelton 3-0",

    fullNote:
      "The most complete statistical profile on tour. Elite on both serve and return. Converts break chances at a very high rate and thrives in chaotic, creative matchups where variety matters.",

    miamiNote:
      "Won Miami in 2022 and 2023. His movement and variety play extremely well here, especially when rallies extend.",

    surfaceNote: {
      hard: "Elite hard-court player with major titles and deep success in Miami conditions.",
      clay: "One of the best clay-court players in the world.",
      grass: "Comfortable on grass with proven top-end title equity.",
    },
  },

  Sinner: {
    eloRank: 2,
    elo: 2285,
    record: "64-8 (88.9%) last 52 weeks",
    record2026: "13-2 — Won Indian Wells. Fewer matches than Alcaraz/Medvedev but quality arguably #1.",

    style: ["aggressive_baseliner"],
    strengths: ["backhand", "return_game", "fitness", "composure"],

    serveStats: {
      holdPct: 91.8,
      acePct: 10.2,
      dfPct: 1.9,
    },

    returnStats: {
      rpwPct: 42.2,
      breakPct: 32.1,
    },

    bpStats: {
      breakPointConversionPct: 43.6,
      breakPointSavePct: 72.4,
    },

    overallStats: {
      dominanceRatio: 1.49,
      totalPointsWonPct: 56.2,
      tiebreakPct: 81.0,
    },

    h2h: "vs Alcaraz 6-11 · vs Djokovic 4-6 · vs Zverev 6-4 · vs Medvedev 8-7 · vs De Minaur 13-0 · vs Fritz 4-1 · vs Shelton 8-1",

    fullNote:
      "Statistically the most dominant player on tour right now. Wins through clean baseline pressure, elite returning, and almost no wasted service points.",

    miamiNote:
      "Arrives as one of the favorites in Miami. Hard courts are where his baseline pressure becomes hardest to absorb.",

    surfaceNote: {
      hard: "Best surface. One of the strongest hard-court profiles in the sport.",
      clay: "Very strong, though not quite as overwhelming as on hard.",
      grass: "Improving rapidly and already a real title-level threat.",
    },
  },

  Medvedev: {
    eloRank: 5,
    elo: 2030,
    record: "47-21 (69.1%) last 52 weeks",
    record2026: "18-4 — Most wins of any top player in 2026. Lost IW final to Sinner. Best form in years.",

    style: ["defensive_baseliner"],
    strengths: ["return_game", "flat_groundstrokes", "long_match_resilience"],

    serveStats: {
      holdPct: 84.2,
      acePct: 11.2,
      dfPct: 5.7,
    },

    returnStats: {
      rpwPct: 40.1,
      breakPct: 27.5,
    },

    bpStats: {
      breakPointConversionPct: 40.3,
      breakPointSavePct: 62.4,
    },

    overallStats: {
      dominanceRatio: 1.17,
      totalPointsWonPct: 52.5,
      tiebreakPct: 41.9,
    },

    h2h: "vs Alcaraz 2-6 · vs Sinner 7-8 · vs Djokovic 5-10 · vs Zverev 6-8 · vs Fritz 8-4",

    fullNote:
      "Still one of the best returners on tour, but his serve is much less trustworthy than his reputation suggests. He loses too many close sets for a top-tier player.",

    miamiNote:
      "Miami hard courts still suit his flat patterns well. He is always dangerous when he can extend return games and drag servers into discomfort.",

    surfaceNote: {
      hard: "Clearly his best surface.",
      clay: "Significantly less dangerous on clay.",
      grass: "Below his hard-court level.",
    },
  },

  Fritz: {
    eloRank: 9,
    elo: 1983,
    record: "53-25 (67.9%) last 52 weeks",
    record2026: "10-7 — Underperforming in 2026. yElo rank 22 is well below his career Elo ranking.",

    style: ["big_server", "aggressive_baseliner"],
    strengths: ["serve_power", "forehand", "hard_court_comfort"],

    serveStats: {
      holdPct: 89.2,
      acePct: 15.8,
      dfPct: 2.4,
    },

    returnStats: {
      rpwPct: 34.4,
      breakPct: 15.6,
    },

    bpStats: {
      breakPointConversionPct: 34.1,
      breakPointSavePct: 68.1,
    },

    overallStats: {
      dominanceRatio: 1.16,
      totalPointsWonPct: 52.0,
      tiebreakPct: 59.6,
    },

    h2h: "vs Sinner 1-4 · vs Alcaraz 1-5 · vs Medvedev 4-8 · vs Zverev 3-6 · vs De Minaur 3-6",

    fullNote:
      "One of the clearest serve-first profiles in the ATP. The hold and ace numbers are elite, but the return game gives him very little margin when service games stop being automatic.",

    miamiNote:
      "Dangerous in Miami because he can stack free points quickly, but slower hard conditions make him a little more scoreline-dependent than on faster courts.",

    surfaceNote: {
      hard: "Best surface and most dangerous version of his game.",
      clay: "Noticeably weaker on clay.",
      grass: "Serve still plays, but not his cleanest overall environment.",
    },
  },

  Perricard: {
    eloRank: 999,
    elo: 0,
    record: "Manual build in progress",
    record2026: "Manual build in progress",

    style: ["big_server", "first_strike_baseliner"],
    strengths: ["ace_volume", "easy_holds", "short_point_tennis"],

    serveStats: {
      acePct: 18.0,
    },

    returnStats: {},

    bpStats: {},

    overallStats: {},

    h2h: "Build in progress",

    fullNote:
      "Serve dictates almost everything. When the first serve is landing, the match gets compressed quickly and ace volume becomes the entire betting conversation.",

    miamiNote:
      "Miami can take a little of the pure edge off the biggest servers, so his ceiling is still real but less automatic than on truly fast hard courts.",

    surfaceNote: {
      hard: "Most dangerous when conditions reward first-strike tennis and cheap holds.",
      clay: "Less comfortable when rallies extend and free points disappear.",
      grass: "Natural grass upside because the serve becomes even more central.",
    },
  },
};

export default atpPlayers;
