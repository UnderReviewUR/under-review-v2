import test from "node:test";
import assert from "node:assert/strict";
import {
  buildEstimatedEdge,
  formatEstimatedEdgeUserPromptBlock,
  buildEstimatedEdgeModelAppendix,
  buildNbaEstimatedEdgeClosingRule,
  ESTIMATED_EDGE_BOOK_LANGUAGE_RE,
} from "./_estimatedEdgeEngine.js";
import { getStructuredURTakePromptEstimatedEdgeOverlay } from "./prompts/urTakeStructuredPrompt.js";

function collectStrings(obj, out = []) {
  if (obj == null) return out;
  if (typeof obj === "string") {
    out.push(obj);
    return out;
  }
  if (Array.isArray(obj)) {
    for (const x of obj) collectStrings(x, out);
    return out;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj)) collectStrings(v, out);
  }
  return out;
}

function assertNoBookLanguage(edge) {
  for (const s of collectStrings(edge)) {
    if (typeof s !== "string") continue;
    assert.equal(
      ESTIMATED_EDGE_BOOK_LANGUAGE_RE.test(s),
      false,
      `book-language leak: ${s.slice(0, 120)}`,
    );
  }
}

function assertCoreFields(edge) {
  assert.ok(edge);
  assert.equal(edge.source, "estimated_edge");
  assert.ok(["strong", "usable", "thin"].includes(edge.dataQuality));
  assert.ok(String(edge.dataQualityReason || "").trim().length > 0);
}

test("buildEstimatedEdge returns null for unsupported sport", () => {
  assert.equal(buildEstimatedEdge({ sport: "nfl", question: "x", context: {} }), null);
});

test("NBA strong: numerics + Medium possible", () => {
  const edge = buildEstimatedEdge({
    sport: "nba",
    question: "LeBron James over 24.5 points tonight",
    context: {
      nbaContext: {
        playerStats: [
          {
            name: "LeBron James",
            pts: 24,
            reb: 7,
            ast: 8,
            min: "34:00",
            recentGames: [
              { pts: 26, reb: 6, ast: 7, min: "33:00" },
              { pts: 22, reb: 8, ast: 9, min: "35:00" },
              { pts: 25, reb: 7, ast: 6, min: "34:00" },
            ],
          },
        ],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "strong");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine != null);
  assert.equal(typeof edge.playableOverAtOrBelow, "number");
  assert.ok(String(edge.passBand || "").includes("–"));
  assert.ok(edge.confidence === "Medium" || edge.confidence === "Speculative");
  assertNoBookLanguage(edge);
});

test("NBA usable: numerics but weaker recent gate", () => {
  const edge = buildEstimatedEdge({
    sport: "nba",
    question: "LeBron James over 24.5 points tonight",
    context: {
      nbaContext: {
        playerStats: [
          {
            name: "LeBron James",
            pts: 24,
            reb: 7,
            ast: 8,
            min: null,
            recentGames: [{ pts: 25, reb: 7, ast: 8, min: "34:00" }],
          },
        ],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine != null);
  assert.equal(edge.confidence, "Speculative");
  assertNoBookLanguage(edge);
});

test("NBA thin: no player match — no numerics, leanRead + reason", () => {
  const edge = buildEstimatedEdge({
    sport: "nba",
    question: "over 99.5 points randomxyzplayer",
    context: { nbaContext: { playerStats: [{ name: "LeBron James", pts: 20, reb: 5, ast: 5 }] } },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.equal(edge.fairLine, null);
  assert.equal(edge.playableOverAtOrBelow, null);
  assert.equal(edge.passBand, null);
  assert.ok(String(edge.leanRead || "").length > 10);
  assert.ok(String(edge.dataQualityReason || "").length > 5);
  assertNoBookLanguage(edge);
});

test("NBA thin: market not parsed", () => {
  const edge = buildEstimatedEdge({
    sport: "nba",
    question: "LeBron James tonight",
    context: {
      nbaContext: {
        playerStats: [{ name: "LeBron James", pts: 22, reb: 6, ast: 7, min: "32:00", recentGames: [] }],
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("NBA thin: missing season baseline for stat", () => {
  const edge = buildEstimatedEdge({
    sport: "nba",
    question: "LeBron James over 10.5 rebounds tonight",
    context: {
      nbaContext: {
        playerStats: [{ name: "LeBron James", pts: 22, reb: null, ast: 7, min: "32:00", recentGames: [] }],
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("MLB strong: K/9 + park", () => {
  const edge = buildEstimatedEdge({
    sport: "mlb",
    question: "Gerrit Cole strikeouts over 5.5 today",
    context: {
      mlbContext: {
        games: [
          {
            parkFactor: 102,
            awayTeam: { abbr: "NYY" },
            homeTeam: { abbr: "BOS" },
            probableStarters: {
              away: { name: "Gerrit Cole", k9: "10.5", era: "3.20", handedness: "R" },
              home: { name: "Chris Sale", k9: "9.1", era: "3.50", handedness: "L" },
            },
          },
        ],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "strong");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine);
  assertNoBookLanguage(edge);
});

test("MLB usable: K/9 without park factor", () => {
  const edge = buildEstimatedEdge({
    sport: "mlb",
    question: "Gerrit Cole strikeouts over 5.5 today",
    context: {
      mlbContext: {
        games: [
          {
            probableStarters: {
              away: { name: "Gerrit Cole", k9: "10.5", era: "3.20", handedness: "R" },
              home: { name: "Chris Sale", k9: "9.1", era: "3.50", handedness: "L" },
            },
          },
        ],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assertNoBookLanguage(edge);
});

test("MLB thin: K ask but no starter match", () => {
  const edge = buildEstimatedEdge({
    sport: "mlb",
    question: "Schermzenfake strikeouts over 5.5",
    context: {
      mlbContext: {
        games: [
          {
            probableStarters: {
              away: { name: "Gerrit Cole", k9: "10" },
              home: { name: "Chris Sale", k9: "9" },
            },
          },
        ],
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("MLB thin: starter matched but no K/9", () => {
  const edge = buildEstimatedEdge({
    sport: "mlb",
    question: "Gerrit Cole strikeouts over 5.5 today",
    context: {
      mlbContext: {
        games: [
          {
            parkFactor: 100,
            probableStarters: {
              away: { name: "Gerrit Cole", k9: null, era: "3.2" },
              home: { name: "Chris Sale", k9: null, era: "3.5" },
            },
          },
        ],
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("Golf strong: matched golfer + multiple list signals", () => {
  const edge = buildEstimatedEdge({
    sport: "golf",
    question: "Scottie Scheffler top 20 this week",
    context: {
      golfContext: {
        currentEvent: {
          leaderboard: [
            {
              name: "Scottie Scheffler",
              position: 1,
              score: -8,
              sg_app: 1.2,
            },
          ],
        },
        rankings: [{ name: "Scottie Scheffler", rank: 1 }],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "strong");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine);
  assertNoBookLanguage(edge);
});

test("Golf usable: one leaderboard row signal", () => {
  const edge = buildEstimatedEdge({
    sport: "golf",
    question: "Scottie Scheffler top 20 this week",
    context: {
      golfContext: {
        currentEvent: {
          leaderboard: [{ name: "Scottie Scheffler", position: 2, score: -5 }],
        },
        rankings: [],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "strong");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine);
  assertNoBookLanguage(edge);
});

test("Golf thin: no matched golfer", () => {
  const edge = buildEstimatedEdge({
    sport: "golf",
    question: "who wins the tournament",
    context: { golfContext: { currentEvent: { leaderboard: [] }, rankings: [] } },
  });
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assertNoBookLanguage(edge);
});

test("Golf thin: name only on board (no list stats)", () => {
  const edge = buildEstimatedEdge({
    sport: "golf",
    question: "Scottie Scheffler top 20 this week",
    context: {
      golfContext: {
        currentEvent: { leaderboard: [{ name: "Scottie Scheffler" }] },
        rankings: [],
      },
    },
  });
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assertNoBookLanguage(edge);
});

test("Tennis strong: both Elo + profile depth", () => {
  const edge = buildEstimatedEdge({
    sport: "tennis",
    question: "total games",
    context: {
      matchupContext: { raw: { home: "Carlos Alcaraz", away: "Jannik Sinner" } },
      players: {
        atp: {
          "Carlos Alcaraz": { cElo: 2100, form: "W W L W W", holdPct: 0.88 },
          "Jannik Sinner": { cElo: 2060, form: "W W W L W", breakPct: 0.22 },
        },
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "strong");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine);
  assert.ok(edge.playableOverAtOrBelow != null);
  assertNoBookLanguage(edge);
});

test("Tennis usable: partial profile without dual Elo", () => {
  const edge = buildEstimatedEdge({
    sport: "tennis",
    question: "total games",
    context: {
      matchupContext: { raw: { home: "Carlos Alcaraz", away: "Jannik Sinner" } },
      players: {
        atp: {
          "Carlos Alcaraz": { cElo: 2100, form: "W W W L W" },
          "Jannik Sinner": { form: "L W W W W" },
        },
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assertNoBookLanguage(edge);
});

test("Tennis thin: missing one player snapshot", () => {
  const edge = buildEstimatedEdge({
    sport: "tennis",
    question: "total games",
    context: {
      matchupContext: { raw: { home: "Carlos Alcaraz", away: "Jannik Sinner" } },
      players: {
        atp: {
          "Carlos Alcaraz": { cElo: 2100 },
        },
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("Tennis thin: no H2H card", () => {
  const edge = buildEstimatedEdge({
    sport: "tennis",
    question: "total games",
    context: { matchupContext: { raw: {} }, players: { atp: {} } },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("F1 strong: driver + constructor + session", () => {
  const edge = buildEstimatedEdge({
    sport: "f1",
    question: "Max Verstappen podium",
    context: {
      f1Context: {
        nextRace: { circuit: "Monaco" },
        standings: [
          { full_name: "Max Verstappen", position: 1, constructor: "Red Bull Racing" },
          { full_name: "Lewis Hamilton", position: 2, constructor: "Ferrari" },
        ],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "strong");
  assert.ok(edge.projection);
  assert.ok(edge.fairLine);
  assertNoBookLanguage(edge);
});

test("F1 usable: driver + constructor, no session", () => {
  const edge = buildEstimatedEdge({
    sport: "f1",
    question: "Max Verstappen top 10",
    context: {
      f1Context: {
        standings: [{ full_name: "Max Verstappen", position: 1, team: "Red Bull" }],
      },
    },
  });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assertNoBookLanguage(edge);
});

test("F1 thin: no driver match", () => {
  const edge = buildEstimatedEdge({
    sport: "f1",
    question: "podium value",
    context: {
      f1Context: {
        standings: [{ full_name: "Max Verstappen", position: 1 }],
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("F1 thin: driver matched but no constructor or session", () => {
  const edge = buildEstimatedEdge({
    sport: "f1",
    question: "Max Verstappen",
    context: {
      f1Context: {
        standings: [{ full_name: "Max Verstappen", position: 4 }],
      },
    },
  });
  assert.equal(edge.dataQuality, "thin");
  assert.equal(edge.projection, null);
  assert.ok(edge.leanRead);
  assertNoBookLanguage(edge);
});

test("tennis_wta_profile usable tier", () => {
  const edge = buildEstimatedEdge({ sport: "tennis_wta_profile", question: "Swiatek", context: {} });
  assertCoreFields(edge);
  assert.equal(edge.dataQuality, "usable");
  assert.ok(edge.projection);
  assert.equal(edge.fairLine, null);
  assertNoBookLanguage(edge);
});

test("formatEstimatedEdgeUserPromptBlock includes dataQuality", () => {
  const edge = buildEstimatedEdge({
    sport: "nba",
    question: "nobodymatching points",
    context: { nbaContext: { playerStats: [] } },
  });
  const b = formatEstimatedEdgeUserPromptBlock(edge);
  assert.match(b, /DATA QUALITY \(thin\)/);
  assert.match(b, /UR_ESTIMATED_EDGE_JSON/);
});

test("buildEstimatedEdgeModelAppendix branches on dataQuality", () => {
  const thin = buildEstimatedEdgeModelAppendix({
    source: "estimated_edge",
    dataQuality: "thin",
    dataQualityReason: "x",
  });
  assert.match(thin, /THIN MODE/);
  const strong = buildEstimatedEdgeModelAppendix({
    source: "estimated_edge",
    dataQuality: "strong",
    dataQualityReason: "y",
  });
  assert.match(strong, /STRONG MODE/);
});

test("getStructuredURTakePromptEstimatedEdgeOverlay empty without edge", () => {
  assert.equal(getStructuredURTakePromptEstimatedEdgeOverlay(null), "");
});

test("getStructuredURTakePromptEstimatedEdgeOverlay thin vs strong", () => {
  const t = getStructuredURTakePromptEstimatedEdgeOverlay({ dataQuality: "thin", source: "estimated_edge" });
  assert.match(t, /UR structural read/);
  assert.match(t, /No verified line movement available/);
  const s = getStructuredURTakePromptEstimatedEdgeOverlay({ dataQuality: "strong", source: "estimated_edge" });
  assert.match(s, /UR threshold mode/);
  assert.doesNotMatch(s, /No verified line movement available/);
});

test("buildNbaEstimatedEdgeClosingRule switches on thin", () => {
  assert.match(buildNbaEstimatedEdgeClosingRule({ source: "estimated_edge", dataQuality: "thin" }), /leanRead/);
  assert.doesNotMatch(
    buildNbaEstimatedEdgeClosingRule({ source: "estimated_edge", dataQuality: "strong" }),
    /leanRead/,
  );
});
