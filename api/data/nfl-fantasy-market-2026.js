// Compact ESPN Draft Kit / mock-draft market layer.
// Source PDFs: ESPN 2026 Fantasy Football Draft Kit, last updated 2026-08-09.
// This is market/format context, not roster truth or betting odds.

export const NFL_FANTASY_MARKET_2026 = {
  meta: {
    source: "ESPN Fantasy Football Draft Kit",
    updatedAt: "2026-08-09",
    scoring: "PPR; 10-team $200 salary cap unless otherwise noted",
    notes:
      "Use as fantasy-market sentiment and rank/value context. Do not override ESPN roster refresh or live prop lines.",
  },
  players: {
    "Jahmyr Gibbs": {
      ppr: { overallRank: 1, posRank: "RB1", salary: 57, bye: 6 },
      superflex: { overallRank: 4, posRank: "RB1", salary: 57, bye: 6 },
      signal: "Consensus elite PPR anchor; top overall non-superflex player.",
    },
    "Bijan Robinson": {
      ppr: { overallRank: 2, posRank: "RB2", salary: 56, bye: 11 },
      superflex: { overallRank: 5, posRank: "RB2", salary: 57, bye: 11 },
      signal: "Elite workhorse tier; priced directly with Gibbs.",
    },
    "Puka Nacua": {
      ppr: { overallRank: 3, posRank: "WR1", salary: 56, bye: 11 },
      superflex: { overallRank: 6, posRank: "WR1", salary: 55, bye: 11 },
      signal: "Market treats him as top PPR WR by volume.",
    },
    "Ja'Marr Chase": {
      ppr: { overallRank: 4, posRank: "WR2", salary: 55, bye: 6 },
      superflex: { overallRank: 7, posRank: "WR2", salary: 53, bye: 6 },
      signal: "Elite WR with stable Burrow correlation when healthy.",
    },
    "Jaxon Smith-Njigba": {
      ppr: { overallRank: 5, posRank: "WR3", salary: 54, bye: 11 },
      superflex: { overallRank: 8, posRank: "WR3", salary: 51, bye: 11 },
      signal: "Market prices him as a true target-dominant WR1.",
    },
    "Christian McCaffrey": {
      ppr: { overallRank: 6, posRank: "RB3", salary: 53, bye: 8 },
      superflex: { overallRank: 9, posRank: "RB3", salary: 49, bye: 8 },
      signal: "Still elite, but ESPN mock narratives flagged age/workload risk.",
    },
    "Jonathan Taylor": {
      ppr: { overallRank: 7, posRank: "RB4", salary: 52, bye: 13 },
      superflex: { overallRank: 12, posRank: "RB4", salary: 44, bye: 13 },
      signal: "TD-heavy elite RB market profile.",
    },
    "Amon-Ra St. Brown": {
      ppr: { overallRank: 8, posRank: "WR4", salary: 52, bye: 6 },
      superflex: { overallRank: 13, posRank: "WR4", salary: 43, bye: 6 },
      signal: "High-floor PPR volume target.",
    },
    "CeeDee Lamb": {
      ppr: { overallRank: 9, posRank: "WR5", salary: 51, bye: 14 },
      superflex: { overallRank: 14, posRank: "WR5", salary: 42, bye: 14 },
      signal: "Elite market respect, but verify current roster/QB and injury context.",
    },
    "De'Von Achane": {
      ppr: { overallRank: 10, posRank: "RB5", salary: 50, bye: 6 },
      superflex: { overallRank: 15, posRank: "RB5", salary: 41, bye: 6 },
      signal: "Explosive PPR profile; ESPN mock notes flagged Miami context risk.",
    },
    "Trey McBride": {
      ppr: { overallRank: 17, posRank: "TE1", salary: 38, bye: 14 },
      superflex: { overallRank: 21, posRank: "TE1", salary: 34, bye: 14 },
      signal: "Elite TE premium; high weekly edge versus replacement TE.",
    },
    "Brock Bowers": {
      ppr: { overallRank: 24, posRank: "TE2", salary: 32, bye: 13 },
      superflex: { overallRank: 32, posRank: "TE2", salary: 25, bye: 13 },
      espn12TeamMock: { overallPick: 17, posRank: "TE1" },
      signal: "ESPN mock/market treats him like a target-share WR from the TE slot.",
    },
    "Josh Allen": {
      ppr: { overallRank: 36, posRank: "QB1", salary: 22, bye: 7 },
      superflex: { overallRank: 1, posRank: "QB1", salary: 59, bye: 7 },
      signal: "Superflex 1.01 profile; rushing TD equity separates him.",
    },
    "Jayden Daniels": {
      ppr: { overallRank: 55, posRank: "QB2", salary: 10, bye: 7 },
      superflex: { overallRank: 2, posRank: "QB2", salary: 58, bye: 7 },
      signal: "Superflex elite due rushing ceiling.",
    },
    "Lamar Jackson": {
      ppr: { overallRank: 56, posRank: "QB3", salary: 10, bye: 13 },
      superflex: { overallRank: 3, posRank: "QB3", salary: 58, bye: 13 },
      signal: "Elite rushing QB; ESPN mock group often waited and found value.",
    },
    "Drake Maye": {
      ppr: { overallRank: 57, posRank: "QB4", salary: 10, bye: 11 },
      superflex: { overallRank: 10, posRank: "QB4", salary: 48, bye: 11 },
      signal: "Market prices second-year leap as near-elite.",
    },
    "Caleb Williams": {
      ppr: { overallRank: 87, posRank: "QB13", salary: 3, bye: 10 },
      superflex: { overallRank: 38, posRank: "QB13", salary: 21, bye: 10 },
      espn12TeamMock: { overallPick: 133, posRank: "QB12" },
      signal: "Late QB/bench target in standard PPR; materially more important in superflex.",
    },
    "Patrick Mahomes": {
      ppr: { overallRank: 94, posRank: "QB15", salary: 3, bye: 5 },
      superflex: { overallRank: 44, posRank: "QB15", salary: 17, bye: 5 },
      espn12TeamMock: { overallPick: 140, posRank: "QB14" },
      signal: "Fantasy market discount versus name value; useful late-QB sentiment signal.",
    },
    "Kenneth Gainwell": {
      ppr: { overallRank: 98, posRank: "RB31", salary: 2, bye: 10 },
      signal:
        "ESPN mock value target: PPR receiving role and possible extra touches if Tampa backfield injuries linger.",
    },
    "George Kittle": {
      ppr: { overallRank: 101, posRank: "TE8", salary: 2, bye: 8 },
      signal: "ESPN injury-return optimism; use with current injury status before trusting.",
    },
  },
};

function key(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const MARKET_BY_KEY = new Map(
  Object.entries(NFL_FANTASY_MARKET_2026.players).map(([name, row]) => [key(name), { name, ...row }]),
);

export function getNflFantasyMarketPlayer(name) {
  return MARKET_BY_KEY.get(key(name)) || null;
}
