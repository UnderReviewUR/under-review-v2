/**
 * Goal.com US betting article catalog — stable CMS URLs (refresh via hub if 404).
 */

/** @typedef {"wc_winner"|"golden_boot"|"golden_ball"|"golden_glove"|"young_player"|"most_assists"|"host_usa"|"host_mex"|"host_can"|"nba_finals_series"|"nba_finals_history"} GoalBettingMarketId */

/**
 * @typedef {object} GoalBettingPageConfig
 * @property {GoalBettingMarketId} id
 * @property {string} label
 * @property {string} url
 * @property {"wc"|"nba"} sport
 * @property {"team"|"player"|"futures"|"history"} rowKind
 */

/** @type {GoalBettingPageConfig[]} */
export const GOAL_BETTING_PAGES = [
  {
    id: "wc_winner",
    label: "World Cup winner",
    url: "https://www.goal.com/en-us/betting/world-cup/world-cup-winner-odds/A%3Ablt4b7e4ceb80cb6863",
    sport: "wc",
    rowKind: "team",
  },
  {
    id: "golden_boot",
    label: "Golden Boot",
    url: "https://www.goal.com/en-us/betting/world-cup/world-cup-golden-boot-odds/A%3Ablt912cb25b4dbe10f3",
    sport: "wc",
    rowKind: "player",
  },
  {
    id: "golden_ball",
    label: "Golden Ball",
    url: "https://www.goal.com/en-us/betting/world-cup/world-cup-golden-ball-odds/A%3Abltb31994cd8e2baaca",
    sport: "wc",
    rowKind: "player",
  },
  {
    id: "golden_glove",
    label: "Golden Glove",
    url: "https://www.goal.com/en-us/betting/world-cup/world-cup-golden-glove-odds/A%3Abltd16a08f79c19b7ac",
    sport: "wc",
    rowKind: "player",
  },
  {
    id: "host_usa",
    label: "USMNT host futures",
    url: "https://www.goal.com/en-us/betting/world-cup/usmnt-world-cup-odds/A%3Ablt281a0ed6486a6f85",
    sport: "wc",
    rowKind: "futures",
  },
  {
    id: "host_mex",
    label: "Mexico host futures",
    url: "https://www.goal.com/en-us/betting/world-cup/mexico-world-cup-odds/A%3Abltd59f746076be9dc6",
    sport: "wc",
    rowKind: "futures",
  },
  {
    id: "host_can",
    label: "Canada host futures",
    url: "https://www.goal.com/en-us/betting/world-cup/canada-world-cup-odds/A%3Abltd6a460f44f80d69f",
    sport: "wc",
    rowKind: "futures",
  },
  {
    id: "nba_finals_series",
    label: "NBA Finals series",
    url: "https://www.goal.com/en-us/betting/nba-championship-odds/bltb8eb56081b2d32fa",
    sport: "nba",
    rowKind: "team",
  },
];

/** @param {string} id */
export function getGoalBettingPage(id) {
  return GOAL_BETTING_PAGES.find((p) => p.id === id) || null;
}

/** @param {"wc"|"nba"} sport */
export function listGoalBettingPagesForSport(sport) {
  return GOAL_BETTING_PAGES.filter((p) => p.sport === sport);
}
