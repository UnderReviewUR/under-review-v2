/**
 * World Cup Card Contract — 20 golden questions (pre-launch audit suite).
 */

/** @typedef {{
 *   id: string,
 *   question: string,
 *   expectedIntent: string,
 *   wcEventId?: string,
 *   notes?: string,
 * }} WcCardContractGoldenCase */

/** @type {WcCardContractGoldenCase[]} */
export const WC_CARD_CONTRACT_GOLDEN_CASES = [
  {
    id: "rules-et",
    question: "What are the knockout rules for extra time and penalties?",
    expectedIntent: "RULES",
  },
  {
    id: "rules-advancement",
    question: "How does a draw settle in the Round of 16 for betting?",
    expectedIntent: "RULES",
  },
  {
    id: "outright-mispriced",
    question: "Is Brazil mispriced to win the tournament?",
    expectedIntent: "ENTITY_PRICING",
  },
  {
    id: "outright-norway",
    question: "Norway at +2500 to win the World Cup — mispriced?",
    expectedIntent: "ENTITY_PRICING",
  },
  {
    id: "matchup-advance",
    question: "Norway vs France — who advances? Look at the odds.",
    expectedIntent: "MATCHUP",
  },
  {
    id: "structural-group",
    question: "Best value to win Group D?",
    expectedIntent: "STRUCTURAL",
  },
  {
    id: "golden-boot",
    question: "Best golden boot value right now?",
    expectedIntent: "GOLDEN_BOOT",
  },
  {
    id: "top-scorer",
    question: "Who will score the most goals in the tournament?",
    expectedIntent: "TOP_SCORER",
  },
  {
    id: "top-scorers-list",
    question: "Give me your top 5 goalscorers for the World Cup",
    expectedIntent: "TOP_GOALSCORERS_LIST",
  },
  {
    id: "player-prop-scorer",
    question: "Best anytime goalscorer in France vs Brazil — is Mbappé worth the price?",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "760416",
  },
  {
    id: "player-prop-assist",
    question: "Should I take Mbappé over 0.5 assists in France vs Brazil?",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "760416",
  },
  {
    id: "player-prop-card",
    question: "Will Casemiro get a card in Brazil vs Haiti?",
    expectedIntent: "PLAYER_PROP",
  },
  {
    id: "score-prediction",
    question: "Top 3 scorelines for USA vs Paraguay",
    expectedIntent: "SCORE_PREDICTION",
  },
  {
    id: "general-outlook",
    question: "How does the USMNT path look if they win Group D?",
    expectedIntent: "GENERAL",
  },
  {
    id: "live-possession",
    question: "Who is controlling possession in France vs England right now?",
    expectedIntent: "GENERAL",
  },
  {
    id: "team-goals-not-player",
    question: "Which team will score the most goals in Group C?",
    expectedIntent: "STRUCTURAL",
  },
  {
    id: "continuation",
    question: "What about the other side of that?",
    expectedIntent: "CONTINUATION",
    requiresHistory: true,
    notes: "Pass prior user turn in history when running live audit.",
  },
  {
    id: "entity-spain",
    question: "Is Spain +450 fair to win it all?",
    expectedIntent: "ENTITY_PRICING",
  },
  {
    id: "matchup-brazil-paraguay",
    question: "USA vs Paraguay — who wins?",
    expectedIntent: "MATCHUP",
  },
  {
    id: "structural-longshot",
    question: "Best longshot to make the quarterfinals from Group G?",
    expectedIntent: "STRUCTURAL",
  },
];
