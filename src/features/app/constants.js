export const ATP_PLAYERS = [
  "Alcaraz",
  "Sinner",
  "Djokovic",
  "Zverev",
  "Medvedev",
  "De Minaur",
  "Auger-Aliassime",
  "Shelton",
  "Fritz",
  "Musetti",
  "Tien",
  "Draper",
  "Fils",
  "Bublik",
  "Mensik",
  "Ruud",
  "Korda",
  "Fonseca",
  "Paul",
  "Fokina",
  "Rublev",
  "Lehecka",
  "Cerundolo",
  "Norrie",
  "Khachanov",
];

export const WTA_PLAYERS = [
  "Sabalenka",
  "Rybakina",
  "Swiatek",
  "Pegula",
  "Gauff",
  "Mboko",
  "Anisimova",
  "Svitolina",
  "Muchova",
  "Bencic",
  "Andreeva",
  "Paolini",
  "Keys",
  "Osaka",
  "Noskova",
  "Kostyuk",
  "Vondrousova",
  "Kalinskaya",
  "Mertens",
  "Cirstea",
  "Jovic",
  "Alexandrova",
  "Zheng",
  "Kartal",
];

export const NFL_POSITIONS = ["ALL", "RB", "WR", "TE"];

export const GOLF_MARKETS = {
  outright: {
    description: "Win the tournament outright",
    bestUse: "Elite players at home courses. Value above 20/1.",
    avoid: "Scheffler outright — always juiced. Short prices in weak fields.",
  },
  top5: {
    description: "Finish top 5",
    bestUse: "Elite players any week. Scheffler top-5 is the best recurring play.",
    avoid: "Volatile players — Cameron Young types",
  },
  top10: {
    description: "Finish top 10",
    bestUse: "Best default market. Solid players in good form any week.",
    avoid: "Majors for tier-2 players — field quality kills the percentage",
  },
  top20: {
    description: "Finish top 20",
    bestUse: "Best value market for mid-tier plays. Consistent players at soft events.",
    avoid: "Overpriced favorites",
  },
  makecut: {
    description: "Make the 36-hole cut",
    bestUse: "Elite players, especially when form is strong. Near-certainty for top-10 players.",
    avoid: "Volatile drivers — anyone with >45% miss fairway rate",
  },
  matchup: {
    description: "Head-to-head matchup bet",
    bestUse: "Course-specialist vs similar-priced generic player. Use SG splits.",
    avoid: "Volatile players against consistent ones when priced even",
  },
  firstRoundLeader: {
    description: "Lead after round 1",
    bestUse: "Morning draw + power player + hot putter. Low probability but high value.",
    avoid: "Afternoon draw in wind",
  },
};

export const NFL_PROP_GUIDE = [
  { player: "James Cook", pos: "RB", team: "BUF", propType: "RUSH YDS", line: "115.5", floor: 80, ceil: 150, lean: "OVER — 112.3 avg, elite workload", leanClass: "lean-over" },
  { player: "Puka Nacua", pos: "WR", team: "LAR", propType: "REC YDS", line: "85.5", floor: 75, ceil: 140, lean: "OVER — 107.2 yds/g leads NFL", leanClass: "lean-over" },
  { player: "Trey McBride", pos: "TE", team: "ARI", propType: "CATCHES", line: "6.5", floor: 5, ceil: 10, lean: "OVER — 7.4/g is historic TE production", leanClass: "lean-over" },
  { player: "Ja'Marr Chase", pos: "WR", team: "CIN", propType: "REC YDS", line: "75.5", floor: 65, ceil: 125, lean: "OVER when Burrow healthy", leanClass: "lean-over" },
  { player: "Derrick Henry", pos: "RB", team: "BAL", propType: "RUSH TDs", line: "0.5", floor: 0, ceil: 2, lean: "OVER — 0.94 TDs/g is elite", leanClass: "lean-over" },
  { player: "Travis Kelce", pos: "TE", team: "KAN", propType: "REC YDS", line: "52.5", floor: 35, ceil: 80, lean: "FADE — real floor ~50, market overprices", leanClass: "lean-fade" },
];
