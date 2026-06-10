import { WC_GOLDEN_ESP_OUTRIGHT } from "./wcGoldenOutrightsRefs.js";

const ESP_OUTRIGHT_QUESTION = WC_GOLDEN_ESP_OUTRIGHT || "+500";

/**
 * World Cup Card Contract — 20 golden questions (pre-launch audit suite).
 *
 * Voice contract (all non-RULES cases): HEADLINE argues · LINE holds delta ·
 * THE PLAY = decision · WATCH FOR = edge. Re-run after prompt changes:
 *   node scripts/run-wc-card-contract-audit.mjs
 *
 * Day-one intents (ship first): MATCHUP, STRUCTURAL, ENTITY_PRICING, GENERAL.
 * Iterate later: GOLDEN_BOOT, TOP_SCORER, PLAYER_PROP, TOP_GOALSCORERS_LIST.
 */

/** @typedef {{
 *   id: string,
 *   question: string,
 *   expectedIntent: string,
 *   wcEventId?: string,
 *   notes?: string,
 *   cardVoice?: "argue"|"rules_factual"|"list"|"pass_ok",
 * }} WcCardContractGoldenCase */

/** @type {WcCardContractGoldenCase[]} */
export const WC_CARD_CONTRACT_GOLDEN_CASES = [
  {
    id: "rules-et",
    question: "What are the knockout rules for extra time and penalties?",
    expectedIntent: "RULES",
    cardVoice: "rules_factual",
  },
  {
    id: "rules-advancement",
    question: "How does a draw settle in the Round of 16 for betting?",
    expectedIntent: "RULES",
    cardVoice: "rules_factual",
  },
  {
    id: "outright-mispriced",
    question: "Is Brazil mispriced to win the tournament?",
    expectedIntent: "ENTITY_PRICING",
    cardVoice: "argue",
  },
  {
    id: "outright-norway",
    question: "Norway at +2500 to win the World Cup — mispriced?",
    expectedIntent: "ENTITY_PRICING",
    cardVoice: "argue",
  },
  {
    id: "matchup-advance",
    question: "Norway vs France — who advances? Look at the odds.",
    expectedIntent: "MATCHUP",
    cardVoice: "argue",
  },
  {
    id: "structural-group",
    question: "Best value to win Group D?",
    expectedIntent: "STRUCTURAL",
    cardVoice: "argue",
  },
  {
    id: "golden-boot",
    question: "Best golden boot value right now?",
    expectedIntent: "GOLDEN_BOOT",
    cardVoice: "pass_ok",
  },
  {
    id: "top-scorer",
    question: "Who will score the most goals in the tournament?",
    expectedIntent: "TOP_SCORER",
    cardVoice: "pass_ok",
  },
  {
    id: "top-scorers-list",
    question: "Give me your top 5 goalscorers for the World Cup",
    expectedIntent: "TOP_GOALSCORERS_LIST",
    cardVoice: "list",
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
    cardVoice: "argue",
  },
  {
    id: "live-possession",
    question: "Who is controlling possession in France vs England right now?",
    expectedIntent: "GENERAL",
    cardVoice: "argue",
  },
  {
    id: "team-goals-not-player",
    question: "Which team will score the most goals in Group C?",
    expectedIntent: "STRUCTURAL",
    cardVoice: "argue",
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
    question: `Is Spain ${ESP_OUTRIGHT_QUESTION} fair to win it all?`,
    expectedIntent: "ENTITY_PRICING",
    cardVoice: "argue",
  },
  {
    id: "matchup-brazil-paraguay",
    question: "USA vs Paraguay — who wins?",
    expectedIntent: "MATCHUP",
    cardVoice: "argue",
  },
  {
    id: "structural-longshot",
    question: "Best longshot to make the quarterfinals from Group G?",
    expectedIntent: "STRUCTURAL",
    cardVoice: "argue",
  },
  {
    id: "group-d-comparative-advancement",
    question: "Which Group D advancement path is most mispriced?",
    expectedIntent: "ENTITY_PRICING",
    cardVoice: "argue",
    notes: "Retention gate: attribution, dedup, roster grounding, within-group comparative proof.",
  },
];
