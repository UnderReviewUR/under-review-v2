/**
 * World Cup UR Take — 4-turn regression thread (production failure sequence).
 */

/** @typedef {{ question: string, expectedEntities: string[], expectedIntent: string, forbiddenEntities: string[] }} WcRelevanceFixtureTurn */

/** @type {WcRelevanceFixtureTurn[]} */
export const WC_RELEVANCE_REGRESSION_TURNS = [
  {
    question: "Norway at +2500 to win the World Cup — mispriced?",
    expectedEntities: ["NOR"],
    expectedIntent: "ENTITY_PRICING",
    forbiddenEntities: ["BRA", "PAR", "FRA"],
  },
  {
    question: "Is Brazil mispriced to win the tournament?",
    expectedEntities: ["BRA"],
    expectedIntent: "ENTITY_PRICING",
    forbiddenEntities: ["NOR", "PAR", "FRA"],
  },
  {
    question: "Norway vs France — who advances? Look at the odds.",
    expectedEntities: ["NOR", "FRA"],
    expectedIntent: "MATCHUP",
    forbiddenEntities: ["BRA", "PAR"],
  },
  {
    question: "What are the knockout rules for extra time and penalties?",
    expectedEntities: [],
    expectedIntent: "RULES",
    forbiddenEntities: ["NOR", "BRA", "FRA", "PAR"],
  },
  {
    question: "who will score the most goals?",
    expectedEntities: [],
    expectedIntent: "TOP_SCORER",
    forbiddenEntities: [],
    expectPlayerNames: ["Mbappé", "Kane"],
    expectPlayerMarketTier: "market_only",
  },
  {
    question: "which player will score the most goals?",
    expectedEntities: [],
    expectedIntent: "PLAYER_PROP",
    forbiddenEntities: [],
    expectPlayerNames: ["Mbappé", "Kane"],
    expectPlayerMarketTier: "market_only",
  },
  {
    question: "Best golden boot value right now?",
    expectedEntities: [],
    expectedIntent: "GOLDEN_BOOT",
    forbiddenEntities: [],
    expectPlayerNames: ["Mbappé"],
    expectPlayerMarketTier: "market_only",
  },
];
