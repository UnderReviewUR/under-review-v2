import test from "node:test";
import assert from "node:assert/strict";

import {
  applyNbaMarketInvalidation,
  buildAllowedMatchupPlayerPool,
  buildNbaUrTakeDecisionModeSpine,
  extractMentionedPlayersFromOutput,
  normalizeNbaMarketPlayerKey,
  resolveQuestionNbaPlayers,
  resolveNbaDecisionMode,
  validatePlayersAgainstMatchup,
} from "./ur-take.js";
import handler from "./ur-take.js";

function createMockRes(resolve) {
  return {
    _status: 200,
    setHeader() {},
    status(code) {
      this._status = code;
      return this;
    },
    json(payload) {
      resolve({ status: this._status, payload });
      return this;
    },
    end() {
      resolve({ status: this._status, payload: null });
    },
  };
}

function mockOddsApiListPayload() {
  const nowIso = new Date().toISOString();
  return [
    {
      id: "mock_nba_evt_mil_phi",
      home_team: "Philadelphia 76ers",
      away_team: "Milwaukee Bucks",
      commence_time: nowIso,
      completed: false,
    },
  ];
}

function mockOddsApiEventPropsPayload() {
  return {
    bookmakers: [
      {
        key: "draftkings",
        markets: [
          {
            key: "player_points",
            outcomes: [
              { description: "Tyrese Maxey", name: "Over", point: 25.5, price: -110 },
              { description: "Joel Embiid", name: "Over", point: 31.5, price: -110 },
              { description: "Damian Lillard", name: "Over", point: 26.5, price: -110 },
              { description: "Giannis Antetokounmpo", name: "Over", point: 29.5, price: -110 },
            ],
          },
        ],
      },
    ],
  };
}

async function invokeUrTake(
  body,
  {
    anthropicText = "",
    allowAnthropic = false,
    omitOddsKey = false,
    captureAnthropic = null,
  } = {},
) {
  const originalFetch = globalThis.fetch;
  const originalRequireAuth = process.env.UR_TAKE_REQUIRE_AUTH;
  const originalApiKey = process.env.ANTHROPIC_API_KEY;
  const originalOddsKey = process.env.ODDS_API_KEY;
  process.env.UR_TAKE_REQUIRE_AUTH = "false";
  process.env.ANTHROPIC_API_KEY = "test-key";
  if (omitOddsKey) {
    delete process.env.ODDS_API_KEY;
  } else {
    process.env.ODDS_API_KEY = "test_odds_key_placeholder_for_ur_take_tests";
  }

  globalThis.fetch = async (input, init) => {
    const url = String(typeof input === "string" ? input : input?.url || "");
    if (url.includes("https://api.anthropic.com/v1/messages")) {
      if (!allowAnthropic) {
        throw new Error("anthropic should not be called in this test");
      }
      if (typeof captureAnthropic === "function") {
        try {
          captureAnthropic(JSON.parse(String(init?.body || "{}")));
        } catch {
          captureAnthropic(null);
        }
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => null },
        json: async () => ({
          content: [{ type: "text", text: anthropicText }],
        }),
      };
    }
    if (url.includes("api.the-odds-api.com/v4/sports/basketball_nba/events/") && url.includes("/odds")) {
      return {
        ok: true,
        status: 200,
        json: async () => mockOddsApiEventPropsPayload(),
      };
    }
    if (
      url.includes("api.the-odds-api.com/v4/sports/basketball_nba/odds") &&
      url.includes("markets=h2h")
    ) {
      return {
        ok: true,
        status: 200,
        json: async () => mockOddsApiListPayload(),
      };
    }
    if (url.includes("api.the-odds-api.com/v4/sports/basketball_nba/scores")) {
      return {
        ok: true,
        status: 200,
        json: async () => [],
      };
    }
    if (
      url.includes("api.the-odds-api.com") ||
      url.includes("site.api.espn.com") ||
      url.includes("api.balldontlie.io")
    ) {
      throw new Error("forced_nba_board_fetch_failure_for_test");
    }
    throw new Error(`unexpected url in test: ${url}`);
  };

  try {
    return await new Promise((resolve) => {
      const req = {
        method: "POST",
        headers: { "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}` },
        body,
      };
      handler(req, createMockRes(resolve));
    });
  } finally {
    globalThis.fetch = originalFetch;
    process.env.UR_TAKE_REQUIRE_AUTH = originalRequireAuth;
    process.env.ANTHROPIC_API_KEY = originalApiKey;
    if (originalOddsKey !== undefined) {
      process.env.ODDS_API_KEY = originalOddsKey;
    } else {
      delete process.env.ODDS_API_KEY;
    }
  }
}

const sharedNba = {
  seasonContext: { phase: "regular", postseason: false, season: 2025 },
  todaysGames: [
    {
      id: "g1",
      state: "pre",
      homeTeam: { abbr: "PHI", name: "Philadelphia 76ers" },
      awayTeam: { abbr: "MIL", name: "Milwaukee Bucks" },
    },
  ],
  playerStats: [
    { name: "Tyrese Maxey", team: "PHI", pts: 26, ast: 7, reb: 4, fg3_pct: 0.39 },
    { name: "Joel Embiid", team: "PHI", pts: 31, ast: 5, reb: 11, fg3_pct: 0.31 },
    { name: "Damian Lillard", team: "MIL", pts: 25, ast: 7, reb: 4, fg3_pct: 0.37 },
    { name: "Giannis Antetokounmpo", team: "MIL", pts: 30, ast: 6, reb: 11, fg3_pct: 0.29 },
  ],
  rosterGrounding: {
    playersByTeamAbbrev: {
      PHI: ["Tyrese Maxey", "Joel Embiid"],
      MIL: ["Damian Lillard", "Giannis Antetokounmpo"],
    },
    rosterGroundingQuality: "full",
  },
  bdlGrounding: {
    bdlGroundedPlayers: {
      "Tyrese Maxey": { team: "PHI", onSlate: true, availability: null },
      "Joel Embiid": { team: "PHI", onSlate: true, availability: { status: "Out", detail: "Knee" } },
      "Damian Lillard": { team: "MIL", onSlate: true, availability: null },
      "Giannis Antetokounmpo": { team: "MIL", onSlate: true, availability: null },
      "Jalen Brunson": { team: "NYK", onSlate: true, availability: null },
      "CJ McCollum": { team: "NOP", onSlate: true, availability: null },
    },
    bdlSlateTeams: ["MIL", "PHI", "NYK", "NOP"],
    bdlAvailability: {
      "Joel Embiid": { team: "PHI", status: "Out", detail: "Knee" },
    },
  },
  gameTotals: { "Milwaukee Bucks @ Philadelphia 76ers": { total: 227.5, pace: "FAST" } },
  propLines: [
    {
      game: "Milwaukee Bucks @ Philadelphia 76ers",
      awayAbbr: "MIL",
      homeAbbr: "PHI",
      player: "Tyrese Maxey",
      prop: "points",
      line: 25.5,
      side: "Over",
      odds: -110,
      book: "draftkings",
      eventCompleted: false,
    },
    {
      game: "Milwaukee Bucks @ Philadelphia 76ers",
      awayAbbr: "MIL",
      homeAbbr: "PHI",
      player: "Joel Embiid",
      prop: "rebounds",
      line: 11.5,
      side: "Over",
      odds: -115,
      book: "draftkings",
      eventCompleted: false,
    },
    {
      game: "Milwaukee Bucks @ Philadelphia 76ers",
      awayAbbr: "MIL",
      homeAbbr: "PHI",
      player: "Damian Lillard",
      prop: "points",
      line: 27.5,
      side: "Over",
      odds: -110,
      book: "draftkings",
      eventCompleted: false,
    },
  ],
  injuries: [],
  newsImpact: null,
};

const detOrlNba = {
  seasonContext: { phase: "regular", postseason: false, season: 2025 },
  todaysGames: [
    {
      id: "g2",
      state: "pre",
      homeTeam: { abbr: "ORL", name: "Orlando Magic" },
      awayTeam: { abbr: "DET", name: "Detroit Pistons" },
    },
    {
      id: "g3",
      state: "pre",
      homeTeam: { abbr: "BOS", name: "Boston Celtics" },
      awayTeam: { abbr: "NYK", name: "New York Knicks" },
    },
  ],
  playerStats: [
    { name: "Cade Cunningham", team: "DET", pts: 23, ast: 7, reb: 4 },
    { name: "Jalen Duren", team: "DET", pts: 14, ast: 2, reb: 10 },
    { name: "Paolo Banchero", team: "ORL", pts: 24, ast: 5, reb: 7 },
    { name: "Franz Wagner", team: "ORL", pts: 20, ast: 4, reb: 5 },
    { name: "Jayson Tatum", team: "BOS", pts: 29, ast: 5, reb: 8 },
  ],
  rosterGrounding: {
    playersByTeamAbbrev: {
      DET: ["Cade Cunningham", "Jalen Duren"],
      ORL: ["Paolo Banchero", "Franz Wagner"],
      BOS: ["Jayson Tatum"],
    },
    rosterGroundingQuality: "full",
  },
  propLines: [
    {
      game: "Detroit Pistons @ Orlando Magic",
      awayAbbr: "DET",
      homeAbbr: "ORL",
      player: "Cade Cunningham",
      prop: "points",
      line: 22.5,
      side: "Over",
      odds: -110,
      book: "draftkings",
    },
    {
      game: "Detroit Pistons @ Orlando Magic",
      awayAbbr: "DET",
      homeAbbr: "ORL",
      player: "Paolo Banchero",
      prop: "rebounds",
      line: 7.5,
      side: "Over",
      odds: -108,
      book: "draftkings",
    },
    {
      game: "New York Knicks @ Boston Celtics",
      awayAbbr: "NYK",
      homeAbbr: "BOS",
      player: "Jayson Tatum",
      prop: "points",
      line: 28.5,
      side: "Over",
      odds: -115,
      book: "draftkings",
    },
  ],
  injuries: [],
  newsImpact: null,
};

test("blocked unavailable mode resolves from invalidation + decision resolver", () => {
  const invalidation = applyNbaMarketInvalidation({
    question: "Joel Embiid over 11.5 rebounds?",
    board: {
      ...sharedNba,
      injuries: [{ player: "Joel Embiid", team: "PHI", status: "Out", detail: "Knee" }],
    },
    newsImpact: null,
  });
  const mode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent: { isAvailabilityQuestion: false, asksBettingConsequence: false },
    directPropAsk: true,
    invalidation,
  });
  assert.equal(invalidation.blockedReason, "unavailable");
  assert.equal(mode, "blocked_unavailable");
});

test("blocked unlisted market preserves terminal block semantics", async () => {
  const inv = applyNbaMarketInvalidation({
    question: "Brown under 25.5 live?",
    board: sharedNba,
    newsImpact: null,
  });
  assert.equal(inv.blockedReason, "unlisted_market");
  assert.equal(inv.blocked, false);
  const mode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent: { isAvailabilityQuestion: false, asksBettingConsequence: false },
    directPropAsk: true,
    invalidation: inv,
  });
  assert.equal(mode, "blocked_unlisted_market");
});

test("invokeUrTake with no ODDS_API_KEY surfaces odds feed block copy", async () => {
  const out = await invokeUrTake(
    {
      question: "Jaylen Brown under 25.5 live?",
      sportHint: "nba",
      history: [],
      nbaContext: sharedNba,
    },
    {
      omitOddsKey: true,
      allowAnthropic: true,
      anthropicText: JSON.stringify({
        summary: "Lean under on pace sensitivity.",
        deep: "Without verified prices this is an unverified analytical lean.",
      }),
    },
  );
  assert.equal(out.payload.decisionMode, "blocked_odds_feed_unavailable");
  assert.ok(typeof out.payload.response === "string" && out.payload.response.length > 0);
  assert.ok(!/ODDS FEED UNAVAILABLE/i.test(out.payload.response));
});

test("empty active prop slate uses odds_feed_unavailable (not unlisted market phrasing)", () => {
  const inv = applyNbaMarketInvalidation({
    question: "Jaylen Brown under 25.5 live?",
    board: {
      ...sharedNba,
      propLines: [],
    },
    newsImpact: null,
  });
  assert.equal(inv.blockedReason, "odds_feed_unavailable");
  const mode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent: { isAvailabilityQuestion: false, asksBettingConsequence: false },
    directPropAsk: true,
    invalidation: inv,
  });
  assert.equal(mode, "blocked_odds_feed_unavailable");
});

test("two-player prompt resolves both players independently", () => {
  const players = resolveQuestionNbaPlayers(
    "Brunson and CJ McCollum points over or under tonight?",
    sharedNba,
  );
  const lower = players.map((p) => String(p).toLowerCase());
  assert.ok(lower.includes("jalen brunson"));
  assert.ok(lower.includes("cj mccollum"));
  const inv = applyNbaMarketInvalidation({
    question: "Brunson and CJ McCollum points over or under tonight?",
    board: sharedNba,
    newsImpact: null,
  });
  const cjGrounding = (inv.playerGrounding || []).find(
    (p) => String(p?.name || "").toLowerCase() === "cj mccollum",
  );
  assert.ok(cjGrounding);
  assert.equal(cjGrounding.team, "NOP");
  assert.equal(cjGrounding.onSlate, true);
});

test("exact market verification fails when requested market type missing", () => {
  const board = {
    ...sharedNba,
    propLines: [
      {
        game: "Milwaukee Bucks @ Philadelphia 76ers",
        awayAbbr: "MIL",
        homeAbbr: "PHI",
        player: "Tyrese Maxey",
        prop: "points",
        line: 25.5,
        side: "Over",
        odds: -110,
        book: "draftkings",
      },
    ],
  };
  const inv = applyNbaMarketInvalidation({
    question: "Tyrese Maxey assists over or under 7.5 tonight?",
    board,
    newsImpact: null,
  });
  assert.equal(inv.blockedReason, "unlisted_market");
  assert.equal(inv.hasAnyRequestedMarket, false);
  assert.equal(inv.blocked, false);
});

test("deterministic blocked-mode routing keeps unavailable separate", () => {
  const unavailable = applyNbaMarketInvalidation({
    question: "Joel Embiid over 11.5 rebounds?",
    board: {
      ...sharedNba,
      injuries: [{ player: "Joel Embiid", team: "PHI", status: "Out", detail: "Knee" }],
    },
    newsImpact: null,
  });
  const unavailableMode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent: { isAvailabilityQuestion: false, asksBettingConsequence: false },
    directPropAsk: true,
    invalidation: unavailable,
  });
  assert.equal(unavailableMode, "blocked_unavailable");
  assert.equal(unavailable.blockedReason, "unavailable");
  assert.equal(unavailable.blocked, true);
});

test("non-BDL prop rows do not create authoritative player grounding", () => {
  const board = {
    todaysGames: [
      {
        id: "g1",
        state: "pre",
        awayTeam: { abbr: "NOP", name: "New Orleans Pelicans" },
        homeTeam: { abbr: "NYK", name: "New York Knicks" },
      },
    ],
    playerStats: [{ name: "CJ McCollum", team: "NOP", pts: 22, ast: 5, reb: 4 }],
    injuries: [],
    propLines: [
      {
        game: "New Orleans Pelicans @ New York Knicks",
        awayAbbr: "NOP",
        homeAbbr: "NYK",
        player: "CJ McCollum",
        prop: "points",
        line: 21.5,
      },
    ],
    bdlGrounding: {
      bdlGroundedPlayers: {
        "Jalen Brunson": { team: "NYK", onSlate: true, availability: null },
      },
      bdlSlateTeams: ["NYK", "NOP"],
      bdlAvailability: {},
    },
  };
  const inv = applyNbaMarketInvalidation({
    question: "CJ McCollum over 21.5 points?",
    board,
    newsImpact: null,
  });
  assert.ok((inv.unresolvedPlayers || []).some((p) => String(p).toLowerCase().includes("cj")));
  assert.ok(!(inv.playerGrounding || []).some((p) => String(p?.name || "").toLowerCase() === "cj mccollum"));
});

test("player name keys normalize periods for prop line matching", () => {
  assert.equal(
    normalizeNbaMarketPlayerKey("J. Tatum"),
    normalizeNbaMarketPlayerKey("J Tatum"),
  );
});

test("conditional_wait and actionable resolve correctly from decision stack", () => {
  const unresolvedInvalidation = applyNbaMarketInvalidation({
    question: "Damian Lillard over 27.5 points tonight?",
    board: {
      ...sharedNba,
      injuries: [{ player: "Damian Lillard", team: "MIL", status: "Questionable", detail: "Calf" }],
    },
    newsImpact: null,
  });
  const unresolvedMode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent: { isAvailabilityQuestion: false, asksBettingConsequence: false },
    directPropAsk: true,
    invalidation: unresolvedInvalidation,
  });
  assert.equal(unresolvedMode, "conditional_wait");

  const actionableInvalidation = applyNbaMarketInvalidation({
    question: "Tyrese Maxey over 25.5 tonight?",
    board: sharedNba,
    newsImpact: null,
  });
  const actionableMode = resolveNbaDecisionMode({
    sportHint: "nba",
    availabilityIntent: { isAvailabilityQuestion: false, asksBettingConsequence: false },
    directPropAsk: true,
    invalidation: actionableInvalidation,
  });
  assert.equal(actionableMode, "actionable");
});

test("status_only routes upstream and returns consistent confidence", async () => {
  const out = await invokeUrTake({
    question: "Is Joel Embiid out?",
    sportHint: "nba",
    history: [],
    nbaContext: {
      ...sharedNba,
      injuries: [{ player: "Joel Embiid", team: "PHI", status: "Out", detail: "Knee" }],
    },
  });
  assert.equal(out.status, 200);
  assert.equal(out.payload.decisionMode, "status_only");
  assert.ok(/^STATUS\b/i.test(out.payload.response));
  assert.notEqual(out.payload.take.confidence, "Unspecified");
  assert.match(out.payload.take.confidence, /^(Low|Medium|High)\b/);
});

test("status_plus_consequence keeps routing and consequence block", async () => {
  const out = await invokeUrTake({
    question: "Is Damian Lillard questionable and what's the betting impact?",
    sportHint: "nba",
    history: [],
    nbaContext: {
      ...sharedNba,
      injuries: [{ player: "Damian Lillard", team: "MIL", status: "Questionable", detail: "Calf" }],
    },
  });
  assert.equal(out.status, 200);
  assert.equal(out.payload.decisionMode, "status_plus_consequence");
  assert.ok(/BETTING CONSEQUENCE/i.test(out.payload.response));
});

test("actionable output strips internal labels and backfills take confidence", async () => {
  const out = await invokeUrTake(
    {
      question: "Best NBA angle tonight?",
      sportHint: "nba",
      history: [],
      nbaContext: sharedNba,
    },
    {
      allowAnthropic: true,
      anthropicText:
        "**NBA SERVER DECISION MODE (AUTHORITATIVE)**\n\nWHEN Maxey line is 25.5.\n\nOver is live with clean volume.",
    },
  );
  assert.equal(out.status, 200);
  assert.equal(out.payload.decisionMode, "actionable");
  assert.ok(!/NBA SERVER DECISION MODE/i.test(out.payload.response));
  assert.notEqual(out.payload.take.confidence, "Unspecified");
});

test("matchup grounding validation flags off-game players", () => {
  const matchup = { awayAbbr: "DET", homeAbbr: "ORL", label: "DET at ORL" };
  const pool = buildAllowedMatchupPlayerPool(matchup, detOrlNba);
  const allowedTeamSet = new Set(pool.allowedTeams.map((t) => String(t || "").toUpperCase()));
  const mentions = extractMentionedPlayersFromOutput(
    "Play Jayson Tatum over points and Cade Cunningham over assists.",
    pool.knownPlayerToTeam,
  );
  const invalid = validatePlayersAgainstMatchup(mentions, allowedTeamSet, pool.knownPlayerToTeam);
  assert.ok(invalid.some((p) => p.player === "Jayson Tatum" && p.team === "BOS"));
});

test("buildNbaUrTakeDecisionModeSpine emits mode-specific system routing", () => {
  assert.match(buildNbaUrTakeDecisionModeSpine("actionable"), /NBA DECISION MODE SPINE — actionable/);
  assert.match(buildNbaUrTakeDecisionModeSpine("blocked_unavailable"), /unavailable/);
  assert.match(buildNbaUrTakeDecisionModeSpine("conditional_wait"), /conditional wait/i);
  assert.equal(buildNbaUrTakeDecisionModeSpine("none"), "");
});

test("non-NBA control remains unaffected and decisionMode stays null", async () => {
  const out = await invokeUrTake(
    {
      question: "Clay — who benefits more?",
      sportHint: "tennis",
      history: [],
      matchupContext: {
        league: "ATP",
        raw: {
          home: "Carlos Alcaraz",
          away: "Alexander Zverev",
          bdl_tournament_surface: "clay",
          tournament_name: "Madrid Masters",
        },
      },
      context: {
        currentTournament: {
          name: "Madrid Masters",
          surface: "Clay",
          speed: "Medium-slow",
          context: "Altitude venue",
        },
      },
    },
    {
      allowAnthropic: true,
      anthropicText: JSON.stringify({
        summary: "Alcaraz benefits more from clay.",
        deep: "Surface profile favors Alcaraz.",
      }),
    },
  );
  assert.equal(out.status, 200);
  assert.equal(out.payload.sport, "tennis");
  assert.equal(out.payload.decisionMode, null);
});

test("NBA conversation follow-up forces short system prompt and compact context payload", async () => {
  /** @type {any} */
  let anthropicPayload = null;
  const nbaPlayoff = {
    ...sharedNba,
    seasonContext: { phase: "playoffs", postseason: true, season: 2025 },
    playoffSeries: [
      {
        away: "MIL",
        home: "PHI",
        awayWins: 2,
        homeWins: 1,
        round: "East SF",
        status: "in progress",
        completedGamesCombinedPoints: [220, 210, 215],
        completedGamesCombinedPointsAverage: 215,
      },
    ],
    injuries: [{ player: "Joel Embiid", team: "PHI", status: "Out", detail: "Knee" }],
  };
  const out = await invokeUrTake(
    {
      question: "MIL @ PHI — what's the series scoring average; still lean under on pace?",
      sportHint: "nba",
      history: [
        { role: "user", content: "Bucks vs Sixers — best angle?" },
        {
          role: "assistant",
          content:
            "THE PLAY\nLean under on the total if it opens 225.5+\n\nCONFIDENCE\nMedium — pace could compress late.",
        },
      ],
      nbaContext: nbaPlayoff,
    },
    {
      allowAnthropic: true,
      anthropicText:
        "Series avg math: 220+210+215=645 combined → 645/3=215 per game — still under-biased if they post 225+.",
      captureAnthropic: (p) => {
        anthropicPayload = p;
      },
    },
  );
  assert.equal(out.status, 200);
  assert.ok(anthropicPayload);
  assert.match(String(anthropicPayload.system || ""), /FOLLOW-UP OUTPUT GATE/);
  assert.match(String(anthropicPayload.system || ""), /Answer only the specific question asked/);
  assert.match(
    String(anthropicPayload.system || ""),
    /Only name players from the verified roster list provided/,
  );
  assert.doesNotMatch(String(anthropicPayload.system || ""), /JSON RESPONSE MODE/);
  const lastUser = [...(anthropicPayload.messages || [])].reverse().find((m) => m.role === "user");
  const userText = typeof lastUser?.content === "string" ? lastUser.content : "";
  assert.match(userText, /COMPACT NBA CONTEXT/);
  assert.match(userText, /Series completed-game combined scoring average: 215/);
  assert.match(userText, /Verified rosters — playersByTeamAbbrev/);
  assert.match(userText, /MIL:.*Tyrese Maxey|PHI:.*Tyrese Maxey/s);
  assert.match(userText, /Prior response key positions:/i);
  assert.match(userText, /Joel Embiid.*:\s*out/i);
  assert.doesNotMatch(userText, /NBA context:\n\{/);
  assert.doesNotMatch(userText, /"todaysGames"\s*:/);
});
