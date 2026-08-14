import assert from "node:assert/strict";
import test from "node:test";
import {
  espnNflAbbrsMatch,
  findNflInactivePlayer,
  formatNflInactivesPromptBlock,
  isNflDressingAsk,
  nflInactivesPostedForAsk,
  normalizeEspnNflAbbr,
  parseEspnNflGameRosterEntries,
  parseEspnNflScoreboardEvents,
} from "./nflEspnInactives.js";
import { applyNflAskGuard } from "./nflAskGuard.js";

test("normalizeEspnNflAbbr maps WSH to WAS", () => {
  assert.equal(normalizeEspnNflAbbr("WSH"), "WAS");
  assert.equal(espnNflAbbrsMatch("WSH", "WAS"), true);
  assert.equal(espnNflAbbrsMatch("DEN", "ATL"), false);
});

test("isNflDressingAsk catches Burrow dressing, not a plain spread", () => {
  assert.equal(
    isNflDressingAsk("Is Joe Burrow even dressing tonight vs Detroit or is CIN -6.5 just backup football?"),
    true,
  );
  assert.equal(
    isNflDressingAsk("Broncos at Falcons tonight — posted DEN -3.5. Are Nix and Penix even dressing?"),
    true,
  );
  assert.equal(isNflDressingAsk("DEN @ ATL — DEN -3.5. Side or total?"), false);
});

test("parseEspnNflScoreboardEvents reads home/away ids", () => {
  const events = parseEspnNflScoreboardEvents({
    events: [
      {
        id: "401",
        date: "2026-08-14T23:00:00Z",
        shortName: "DEN @ ATL",
        status: { type: { state: "pre" } },
        competitions: [
          {
            competitors: [
              { id: "1", homeAway: "home", team: { abbreviation: "ATL" } },
              { id: "7", homeAway: "away", team: { abbreviation: "DEN" } },
            ],
          },
        ],
      },
    ],
  });
  assert.equal(events.length, 1);
  assert.equal(events[0].homeAbbr, "ATL");
  assert.equal(events[0].awayAbbr, "DEN");
  assert.equal(events[0].homeId, "1");
  assert.equal(events[0].status, "pre");
});

test("parseEspnNflGameRosterEntries only keeps didNotPlay", () => {
  const parsed = parseEspnNflGameRosterEntries(
    {
      entries: [
        { displayName: "Nix", didNotPlay: false, playerId: 1, athlete: { $ref: "http://x/1" } },
        {
          displayName: "Sutton",
          didNotPlay: true,
          playerId: 2,
          jersey: "14",
          athlete: { $ref: "http://x/2" },
        },
      ],
    },
    "DEN",
  );
  assert.equal(parsed.posted, true);
  assert.equal(parsed.players.length, 1);
  assert.equal(parsed.players[0].lastName, "Sutton");
});

test("empty roster is not posted", () => {
  const parsed = parseEspnNflGameRosterEntries({ entries: [] }, "ATL");
  assert.equal(parsed.posted, false);
  assert.equal(parsed.players.length, 0);
});

test("formatNflInactivesPromptBlock says not posted", () => {
  const block = formatNflInactivesPromptBlock({
    asOf: Date.now(),
    games: [
      {
        awayAbbr: "DEN",
        homeAbbr: "ATL",
        posted: false,
        players: [],
      },
    ],
  });
  assert.match(block, /not posted yet/i);
  assert.match(block, /90 min/i);
  assert.doesNotMatch(block, /espn/i);
});

test("formatNflInactivesPromptBlock lists posted names", () => {
  const block = formatNflInactivesPromptBlock({
    games: [
      {
        awayAbbr: "DEN",
        homeAbbr: "ATL",
        posted: true,
        players: [
          { player: "Bo Nix", team: "DEN" },
          { player: "Michael Penix Jr.", team: "ATL" },
        ],
      },
    ],
  });
  assert.match(block, /POSTED/);
  assert.match(block, /Bo Nix/);
  assert.match(block, /Penix/);
});

test("findNflInactivePlayer hits last name in the question", () => {
  const hit = findNflInactivePlayer(
    {
      games: [
        {
          posted: true,
          awayAbbr: "DEN",
          homeAbbr: "ATL",
          players: [{ player: "Bo Nix", lastName: "Nix", team: "DEN" }],
        },
      ],
    },
    "Is Nix even dressing tonight?",
  );
  assert.ok(hit);
  assert.equal(hit.player.team, "DEN");
});

test("nflInactivesPostedForAsk is false until a row exists", () => {
  assert.equal(
    nflInactivesPostedForAsk({
      games: [{ awayAbbr: "DEN", homeAbbr: "ATL", status: "pre", posted: false, players: [] }],
    }),
    false,
  );
  assert.equal(
    nflInactivesPostedForAsk({
      games: [
        {
          awayAbbr: "DEN",
          homeAbbr: "ATL",
          status: "pre",
          posted: true,
          players: [{ player: "Bo Nix", team: "DEN" }],
        },
      ],
    }),
    true,
  );
});

test("guard PASSes dressing ask when inactives are not posted", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "Is Joe Burrow even dressing tonight vs Detroit?",
    structured: { call: "CIN -6.5", lean: "Lean: CIN -6.5. Burrow plays.", confidence: "Medium" },
    games: [{ awayAbbr: "DET", homeAbbr: "CIN", seasonType: "pre", spread: { displayLine: "CIN -6.5" } }],
    inactives: {
      games: [{ awayAbbr: "DET", homeAbbr: "CIN", status: "pre", posted: false, players: [] }],
    },
  });
  assert.ok(codes.includes("inactives_not_posted"));
  assert.equal(structured.call, "PASS");
});

test("guard PASSes when the named player is on the inactive list", () => {
  const { structured, codes } = applyNflAskGuard({
    question: "Bo Nix passing yards tonight?",
    structured: { call: "OVER 225.5", lean: "Lean: Over. Nix plays the half.", confidence: "Medium" },
    games: [{ awayAbbr: "DEN", homeAbbr: "ATL", seasonType: "pre" }],
    inactives: {
      games: [
        {
          awayAbbr: "DEN",
          homeAbbr: "ATL",
          status: "pre",
          posted: true,
          players: [{ player: "Bo Nix", lastName: "Nix", team: "DEN" }],
        },
      ],
    },
  });
  assert.ok(codes.includes("inactive_confirmed"));
  assert.equal(structured.call, "PASS");
});
