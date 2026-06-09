import test from "node:test";
import assert from "node:assert/strict";
import {
  isNbaGroundingProseRefusal,
  tryBuildNbaGroundingRedirectStructured,
} from "./_urTakeGroundingRedirect.js";

const baseNbaContext = () => ({
  todaysGames: [
    { awayTeam: { abbr: "CLE" }, homeTeam: { abbr: "NYK" } },
    { awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "OKC" } },
  ],
  rosterGrounding: {
    playersByTeamAbbrev: {
      CLE: ["Donovan Mitchell"],
      NYK: ["Jalen Brunson", "Karl-Anthony Towns", "Josh Hart"],
      SAS: ["Victor Wembanyama", "De'Aaron Fox"],
      OKC: ["Shai Gilgeous-Alexander", "Chet Holmgren"],
    },
  },
  playerStats: [
    { name: "Jalen Brunson", team: "NYK", pts: 28, reb: 4, ast: 7 },
    { name: "Donovan Mitchell", team: "CLE", pts: 26, reb: 3, ast: 5 },
  ],
  injuries: [],
});

const nbaMatchup = { awayAbbr: "CLE", homeAbbr: "NYK", label: "CLE at NYK" };
const nbaMatchupPool = {
  allowedTeams: ["CLE", "NYK"],
  byTeam: {
    CLE: ["Donovan Mitchell"],
    NYK: ["Jalen Brunson", "Karl-Anthony Towns"],
  },
  knownPlayerToTeam: new Map([
    ["jalen brunson", "NYK"],
    ["donovan mitchell", "CLE"],
  ]),
};

test("grounding redirect resolves Wemby nickname off focused matchup", () => {
  const out = tryBuildNbaGroundingRedirectStructured({
    question: "What's the best prop on Wemby tonight?",
    nbaContext: baseNbaContext(),
    nbaMatchup,
    nbaMatchupPool,
  });

  assert.ok(out);
  assert.match(String(out.lean), /^Lean:/);
  assert.match(String(out.lean), /Wembanyama/i);
  assert.match(String(out.whyNow), /Want that take instead/i);
});

test("grounding redirect returns structured lean when user names off-matchup player", () => {
  const out = tryBuildNbaGroundingRedirectStructured({
    question: "What's the best prop on Wembanyama tonight?",
    nbaContext: baseNbaContext(),
    nbaMatchup,
    nbaMatchupPool,
  });

  assert.ok(out);
  assert.match(String(out.lean), /Wembanyama/i);
  assert.equal(out.callType, "prop");
});

test("isNbaGroundingProseRefusal detects model roster wall", () => {
  const prose = `I can't identify 'Wemby' from the verified roster for tonight's CLE @ NYK matchup.
The authorized player pool doesn't include that name.`;
  assert.equal(isNbaGroundingProseRefusal(prose), true);
});

test("isNbaGroundingProseRefusal ignores normal takes", () => {
  assert.equal(
    isNbaGroundingProseRefusal("Lean: Brunson O28.5 PTS. Line looks soft vs CLE."),
    false,
  );
});

test("grounding redirect — Fox is finals-ineligible on SAS @ NYK", () => {
  const ctx = {
    todaysGames: [{ awayTeam: { abbr: "SAS" }, homeTeam: { abbr: "NYK" }, state: "pre" }],
    rosterGrounding: {
      playersByTeamAbbrev: {
        SAS: ["Victor Wembanyama", "De'Aaron Fox", "Stephon Castle"],
        NYK: ["Jalen Brunson", "Karl-Anthony Towns"],
      },
    },
    playerStats: [
      { name: "Victor Wembanyama", team: "SAS", pts: 24, reb: 11, ast: 3 },
      { name: "Stephon Castle", team: "SAS", pts: 14, reb: 4, ast: 6 },
    ],
  };
  const out = tryBuildNbaGroundingRedirectStructured({
    question: "fox over 3.5 rebounds?",
    nbaContext: ctx,
    nbaMatchup: { awayAbbr: "SAS", homeAbbr: "NYK", label: "SAS @ NYK" },
    nbaMatchupPool: {
      allowedTeams: ["SAS", "NYK"],
      byTeam: {
        SAS: ["Victor Wembanyama", "Stephon Castle"],
        NYK: ["Jalen Brunson"],
      },
      knownPlayerToTeam: new Map([
        ["victor wembanyama", "SAS"],
        ["stephon castle", "SAS"],
      ]),
    },
    finalsMode: true,
  });
  assert.ok(out);
  assert.match(String(out.lean), /Pass/i);
  assert.match(String(out.lean), /Finals roster/i);
  assert.match(String(out.whyNow), /Fox/i);
});
