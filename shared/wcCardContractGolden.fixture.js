import { WC_GOLDEN_ESP_OUTRIGHT } from "./wcGoldenOutrightsRefs.js";

const ESP_OUTRIGHT_QUESTION = WC_GOLDEN_ESP_OUTRIGHT || "+500";

/**
 * World Cup Card Contract — golden questions + follow-up threads (pre-launch audit suite).
 *
 * Voice contract (all non-RULES cases): HEADLINE argues · LINE holds delta ·
 * THE PLAY = decision · WATCH FOR = edge.
 *
 * Re-run after prompt changes:
 *   npm run audit:wc-card-contract
 *   node scripts/run-wc-card-contract-audit.mjs  (live API + ANTHROPIC_API_KEY)
 */

const BEL_EGY_MATCHUP_PRIOR = {
  role: "assistant",
  structured: {
    callType: "matchup",
    call: "Belgium -140 to win",
    lean: "Pass on ML — Lean Under 2.5 goals",
    whyNow:
      "Tight Group G opener — Egypt sits deep and Belgium rarely blows teams out in Game 1.",
    edge: "Watch for Egypt low block and slow tempo in the first half.",
    line: "Posted Under 2.5 -114",
    deep: "WINS IF: 0-0, 1-0, 1-1, 0-1 at full time.",
    breakdownAvailable: true,
  },
};

const CIV_ECU_PROPS_PRIOR = {
  role: "assistant",
  structured: {
    callType: "player_market_verified",
    call: "CIV vs ECU — top player props",
    lean:
      "1. Sebastien Haller Anytime Goalscorer +180\n2. Moise Kean Over 0.5 Shots on Target -125\n3. Franck Kessie Over 0.5 Shots +105",
    whyNow: "Ivory Coast push volume at home; Ecuador sit deeper without early risk.",
    edge: "Wait for confirmed XI before parlaying both sides.",
    breakdownAvailable: true,
  },
};

const CIV_ECU_PARLAY_PRIOR = {
  role: "assistant",
  structured: {
    callType: "player_market_verified",
    call: "CIV vs ECU 4-leg player parlay",
    lean: "Lean 4-leg parlay — Haller AG + Kean SOT + Kessie shots + Ecuador team under 1.5 goals",
    whyNow: "Script: CIV control, Ecuador counter only on set pieces.",
    edge: "Drop leg 4 if Ecuador start with two forwards.",
    breakdownAvailable: true,
  },
};

/** @typedef {import("./wcCardContractFollowUpScorer.js").WcFollowUpExpect} WcFollowUpExpect */

/** @typedef {{
 *   id: string,
 *   question: string,
 *   expectedIntent: string,
 *   wcEventId?: string,
 *   notes?: string,
 *   cardVoice?: "argue"|"rules_factual"|"list"|"pass_ok",
 *   requiresHistory?: boolean,
 *   history?: Array<{ role?: string, content?: string, structured?: Record<string, unknown> }>,
 *   followUpExpect?: WcFollowUpExpect,
 *   exemplarGood?: Record<string, unknown>,
 *   exemplarBad?: Record<string, unknown>,
 *   routingExpect?: {
 *     matchupAltPrebuilt?: boolean,
 *     playerPropsFastPath?: boolean,
 *   },
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
    id: "player-prop-jimenez-sgp-combo",
    question: "Jimenez 2+ shots and Mexico team to score first goal — correlated or cleaner leg?",
    expectedIntent: "PLAYER_PROP",
    cardVoice: "argue",
    notes: "Script+price: must surface correlation / cleaner-leg language in deep or WATCH FOR.",
  },
  {
    id: "player-prop-jimenez-shots-home",
    question: "Jimenez 2+ shots?",
    expectedIntent: "PLAYER_PROP",
    cardVoice: "argue",
    notes: "Home routing: soccer prop without nation name — must classify PLAYER_PROP not NBA.",
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
    expectedIntent: "STRUCTURAL",
    cardVoice: "argue",
  },
  {
    id: "live-possession",
    question: "Who is controlling possession in France vs England right now?",
    expectedIntent: "MATCHUP",
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
    history: [
      {
        role: "user",
        content: "Is Brazil mispriced to win the World Cup at +450?",
      },
      {
        role: "assistant",
        structured: {
          callType: "advancement",
          call: "Brazil +450 is fair — books price Group I chaos.",
          lean: "Pass at +450 — no outright edge.",
          whyNow: "Group I depth caps knockout upside at this price.",
          edge: "Watch for Vinícius injury news.",
        },
      },
    ],
    notes: "Continuation after outright take — must not replay identical card.",
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

  // --- Follow-up / explain threads (Phase 1 golden gate) ---
  {
    id: "thread-matchup-why-under",
    question: "why under 2.5 goals?",
    expectedIntent: "MATCHUP",
    wcEventId: "1781476490935",
    history: [
      { role: "user", content: "Best bet on BEL vs EGY if I only know the moneyline?" },
      BEL_EGY_MATCHUP_PRIOR,
    ],
    followUpExpect: {
      explainKind: "totals",
      priorTotalsSide: "under",
      priorTotalsLine: 2.5,
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      forbidLeanFlip: true,
      expectedCallType: "matchup",
      forbidCallTypes: ["player_market_verified"],
    },
    routingExpect: { matchupAltPrebuilt: true, playerPropsFastPath: false },
    exemplarGood: {
      callType: "matchup",
      call: "Under 2.5 goals",
      lean: "Pass on ML — Lean Under 2.5 goals",
      whyNow:
        "Under 2.5 cashes when Egypt packs in and the chance count stays down in Group G; Belgium -140 can still win 1-0 or 1-1 — you're betting low tempo, not against them.",
      edge: "Watch for an early Egypt red card opening the game.",
      line: "Posted Under 2.5 -114",
      deep: "WINS IF: 0-0, 1-0, 1-1, 0-1 at full time.\nPosted Under 2.5 -114",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    exemplarBad: {
      callType: "matchup",
      call: "Over 2.5 goals",
      lean: "Pass on ML — Lean Over 2.5 goals",
      whyNow:
        "Tight Group G opener — Egypt sits deep and Belgium rarely blows teams out in Game 1.",
      breakdownAvailable: true,
    },
    notes: "Totals explain must reaffirm Under and use mechanism copy.",
  },
  {
    id: "thread-matchup-over-or-under",
    question: "Over or under goals?",
    expectedIntent: "MATCHUP",
    history: [
      { role: "user", content: "Best bet on BEL vs EGY if I only know the moneyline?" },
      BEL_EGY_MATCHUP_PRIOR,
    ],
    followUpExpect: {
      explainKind: null,
      allowLeanFlip: true,
      expectedCallType: "matchup",
    },
    routingExpect: { matchupAltPrebuilt: true, playerPropsFastPath: false },
    exemplarGood: {
      callType: "matchup",
      call: "Over 2.5 goals",
      lean: "Pass on ML — Lean Over 2.5 goals",
      whyNow: "If Belgium scores early, Egypt has to chase — that opens the game for a second.",
      edge: "Watch for Egypt parking the bus in a 0-0 first half.",
      breakdownAvailable: true,
    },
    notes: "Market pivot follow-up — flip allowed, not an explain ask.",
  },
  {
    id: "thread-matchup-other-side",
    question: "What's the other side?",
    expectedIntent: "CONTINUATION",
    history: [
      { role: "user", content: "Best bet on BEL vs EGY if I only know the moneyline?" },
      BEL_EGY_MATCHUP_PRIOR,
    ],
    followUpExpect: {
      explainKind: "continuation",
      requireDistinctWhy: true,
      expectedCallType: "matchup",
    },
    routingExpect: { matchupAltPrebuilt: true, playerPropsFastPath: false },
    exemplarGood: {
      callType: "matchup",
      call: "Over 2.5 goals",
      lean: "Pass on ML — Lean Over 2.5 goals",
      whyNow: "If Belgium nick one early, Egypt must open up — second goal becomes live.",
      edge: "Watch for 0-0 at halftime keeping Under live.",
      breakdownAvailable: true,
    },
    notes: "Other-side chip must not repeat ML headline as call.",
  },
  {
    id: "thread-props-list-why-second",
    question: "why the second pick?",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "1781476490935",
    history: [
      { role: "user", content: "List 5 best player props for CIV vs ECU" },
      CIV_ECU_PROPS_PRIOR,
    ],
    followUpExpect: {
      explainKind: "player_prop",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      expectedCallType: "player_market_verified",
      forbidCallTypes: ["matchup"],
    },
    routingExpect: { matchupAltPrebuilt: false, playerPropsFastPath: true },
    exemplarGood: {
      callType: "player_market_verified",
      call: "Moise Kean Over 0.5 Shots on Target",
      lean: "Lean Kean Over 0.5 SOT -125",
      whyNow:
        "Kean's role is central when Italy's press wins the ball high — Ecuador's back line clears to midfield, not the channel.",
      edge: "Bench Kean if Ecuador start five at the back.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    exemplarBad: {
      callType: "matchup",
      lean: "Pass on ML — Lean Under 2.5 goals",
      whyNow: "Ivory Coast push volume at home; Ecuador sit deeper without early risk.",
    },
    notes: "Props list explain — must not fall through to fixture totals prebuilt.",
  },
  {
    id: "thread-props-explain-named-player",
    question: "why Romelu Lukaku over 0.5 goals?",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "1781476490935",
    history: [
      { role: "user", content: "Best anytime goalscorer in BEL vs EGY?" },
      {
        role: "assistant",
        structured: {
          callType: "player_market_verified",
          call: "Romelu Lukaku Anytime Goalscorer +145",
          lean: "Lean Lukaku AG +145",
          whyNow: "Belgium's volume runs through Lukaku in the box on set pieces.",
          edge: "Wait for Belgium XI confirmation.",
        },
      },
    ],
    followUpExpect: {
      explainKind: "player_prop",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      expectedCallType: "player_market_verified",
      forbidCallTypes: ["matchup"],
    },
    routingExpect: { matchupAltPrebuilt: false, playerPropsFastPath: true },
    exemplarGood: {
      callType: "player_market_verified",
      call: "Romelu Lukaku Anytime Goalscorer +145",
      lean: "Lean Lukaku AG +145",
      whyNow:
        "Lukaku's goals come off Belgium's first-phase crosses — Egypt's low block still concedes headers from wide delivery.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "Intent must be PLAYER_PROP, not MATCHUP totals.",
  },
  {
    id: "thread-parlay-why-leg-3",
    question: "why leg 3?",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "1781476490935",
    history: [
      { role: "user", content: "4 player parlay for CIV vs ECU" },
      CIV_ECU_PARLAY_PRIOR,
    ],
    followUpExpect: {
      explainKind: "parlay_leg",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      expectedCallType: "player_market_verified",
      forbidCallTypes: ["matchup"],
    },
    routingExpect: { matchupAltPrebuilt: false, playerPropsFastPath: true },
    exemplarGood: {
      callType: "player_market_verified",
      call: "Leg 3 — Franck Kessie Over 0.5 Shots",
      lean: "Keep Kessie Over 0.5 shots +105 in the parlay",
      whyNow:
        "Kessie shoots from edge-of-box recycle balls when CIV tilt the field — leg 3 is the volume hinge, not the finisher.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "Parlay leg explain — mechanism for leg 3, not parlay thesis repeat.",
  },
  {
    id: "thread-pivot-props-then-totals",
    question: "why under 2.5 goals?",
    expectedIntent: "MATCHUP",
    wcEventId: "1781476490935",
    history: [
      { role: "user", content: "Best bet on BEL vs EGY if I only know the moneyline?" },
      BEL_EGY_MATCHUP_PRIOR,
      { role: "user", content: "List 5 best player props for BEL vs EGY" },
      CIV_ECU_PROPS_PRIOR,
    ],
    followUpExpect: {
      explainKind: "totals",
      priorTotalsSide: "under",
      forbidLeanFlip: true,
      requireDistinctWhy: true,
      expectedCallType: "matchup",
    },
    routingExpect: { matchupAltPrebuilt: false, playerPropsFastPath: false },
    exemplarGood: {
      callType: "matchup",
      lean: "Pass on ML — Lean Under 2.5 goals",
      whyNow:
        "Under 2.5 cashes on a low-event script even if Belgium control — Egypt's block caps total chances.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes:
      "Pivot guard baseline: after props list, totals explain should NOT blindly use matchup alt prebuilt (routingExpect.matchupAltPrebuilt=false).",
  },
  {
    id: "thread-golden-boot-why-not",
    question: "why not Mbappé?",
    expectedIntent: "GOLDEN_BOOT",
    history: [
      { role: "user", content: "Best golden boot value right now?" },
      {
        role: "assistant",
        structured: {
          callType: "player_market_verified",
          call: "Erling Haaland +800",
          lean: "Lean Haaland Golden Boot +800",
          whyNow: "Norway's knockout path is shorter but Haaland's shot volume leads the field.",
          edge: "Watch Norway qualification path variance.",
        },
      },
    ],
    followUpExpect: {
      explainKind: "player_prop",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
    },
    exemplarGood: {
      callType: "player_market_verified",
      call: "Pass on Mbappé +600",
      lean: "Pass on Mbappé +600 — fair favorite",
      whyNow:
        "Mbappé's name is priced in — France need six games and share goals; Haaland's team funnel is tighter at +800.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "Push-back on golden boot pick — distinct counter-thesis.",
  },
  {
    id: "thread-top-scorers-deeper",
    question: "go deeper on #1",
    expectedIntent: "CONTINUATION",
    history: [
      { role: "user", content: "Give me your top 5 goalscorers for the World Cup" },
      {
        role: "assistant",
        structured: {
          callType: "goalscorers_list",
          call: "Top 5 goalscorers — Haaland leads the volume edge.",
          lean: "Top 5 — tap to view full breakdown.",
          whyNow: "Haaland, Mbappé, Kane, Messi, Vinícius — ranked by knockout games plus role.",
          deep: "1. Haaland +800\n2. Mbappé +600\n3. Kane +700\n4. Messi +1200\n5. Vinícius +1400",
          breakdownAvailable: true,
        },
      },
    ],
    followUpExpect: {
      explainKind: "continuation",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
    },
    exemplarGood: {
      callType: "goalscorers_list",
      call: "Haaland +800 — volume case",
      lean: "Lean Haaland +800 for Golden Boot",
      whyNow:
        "Haaland leads non-penalty xG per 90 in the field — Norway's shorter run is priced, but shot share isn't.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "List drill-down — expand #1 with mechanism, list stays in breakdown.",
  },
  {
    id: "thread-group-runner-up",
    question: "Who's the runner-up in Group G?",
    expectedIntent: "STRUCTURAL",
    history: [
      { role: "user", content: "Best value to win Group G?" },
      {
        role: "assistant",
        structured: {
          callType: "group_slate",
          call: "Belgium value to win Group G",
          lean: "Lean Belgium Group G winner",
          whyNow: "Belgium's Elo edge tops Egypt and IR Iran in sims.",
          breakdownAvailable: true,
        },
      },
    ],
    followUpExpect: {
      explainKind: "continuation",
      requireDistinctWhy: true,
      expectedCallType: "group_slate",
    },
    exemplarGood: {
      callType: "group_slate",
      call: "Egypt runner-up in Group G",
      lean: "Lean Egypt qualify in second",
      whyNow: "Egypt's low-block script targets second place behind Belgium when points split.",
      breakdownAvailable: true,
    },
    notes: "Group slate runner-up chip — distinct from winner pick.",
  },
  {
    id: "thread-player-prop-assist-why",
    question: "explain the Mbappé assist pick",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "760416",
    history: [
      { role: "user", content: "Should I take Mbappé over 0.5 assists in France vs Brazil?" },
      {
        role: "assistant",
        structured: {
          callType: "player_market_verified",
          call: "Mbappé Over 0.5 Assists +110",
          lean: "Lean Mbappé Over 0.5 assists +110",
          whyNow: "Mbappé's wide role creates cut-back chances when Brazil sit narrow.",
          edge: "Wait for Brazil fullback selection.",
        },
      },
    ],
    followUpExpect: {
      explainKind: "player_prop",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      expectedCallType: "player_market_verified",
    },
    exemplarGood: {
      callType: "player_market_verified",
      call: "Mbappé Over 0.5 Assists +110",
      lean: "Lean Mbappé Over 0.5 assists +110",
      whyNow:
        "Assist angle is final-third entries — Mbappé's dribble-to-cutback pattern, not just the finish.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "Named prop explain after assist ask.",
  },
  {
    id: "thread-parlay-correlation",
    question: "explain why those legs correlate",
    expectedIntent: "PLAYER_PROP",
    wcEventId: "1781476490935",
    history: [
      { role: "user", content: "4 player parlay for CIV vs ECU" },
      CIV_ECU_PARLAY_PRIOR,
    ],
    followUpExpect: {
      explainKind: "parlay_leg",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      expectedCallType: "player_market_verified",
    },
    exemplarGood: {
      callType: "player_market_verified",
      call: "CIV vs ECU parlay correlation",
      lean: "Lean correlated CIV volume script",
      whyNow:
        "Legs 1–3 all need CIV territory — they rise and fall together if Ecuador park the bus successfully.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "Parlay correlation explain — script mechanism in why, legs in deep.",
  },
  {
    id: "thread-entity-pricing-deeper",
    question: "go deeper on why USA is the misprice",
    expectedIntent: "ENTITY_PRICING",
    history: [
      { role: "user", content: "Which Group D advancement path is most mispriced?" },
      {
        role: "assistant",
        structured: {
          callType: "advancement",
          call: "USA escape is the misprice — not Türkiye winning Group D.",
          lean: "Lean: USA qualify from group",
          whyNow: "USA advance sim 62% · market ~52%.",
          edge: "Watch USA–Paraguay opener.",
        },
      },
    ],
    followUpExpect: {
      explainKind: "continuation",
      requireDistinctWhy: true,
      requireBreakdownExpanded: true,
      expectedCallType: "advancement",
    },
    exemplarGood: {
      callType: "advancement",
      call: "USA escape is the misprice",
      lean: "Lean: USA qualify from group",
      whyNow:
        "Host path plus Türkiye draw risk — market still prices USA escape like a coin flip when sims have 62%.",
      breakdownDefaultExpanded: true,
      breakdownAvailable: true,
    },
    notes: "Advancement drill-down — mechanism vs first-turn delta line.",
  },
];

/** @type {WcCardContractGoldenCase[]} */
export const WC_CARD_CONTRACT_THREAD_CASES = WC_CARD_CONTRACT_GOLDEN_CASES.filter(
  (c) => Boolean(c.followUpExpect || c.history?.length),
);
