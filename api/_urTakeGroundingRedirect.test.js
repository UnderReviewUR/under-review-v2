import test from "node:test";
import assert from "node:assert/strict";
import { tryBuildNbaGroundingRedirectStructured } from "./_urTakeGroundingRedirect.js";

test("grounding redirect returns structured lean when user names off-matchup player", () => {
  const nbaContext = {
    todaysGames: [
      {
        awayTeam: { abbr: "CLE" },
        homeTeam: { abbr: "NYK" },
      },
      {
        awayTeam: { abbr: "SAS" },
        homeTeam: { abbr: "OKC" },
      },
    ],
    rosterGrounding: {
      playersByTeamAbbrev: {
        CLE: ["Jalen Brunson", "Donovan Mitchell"],
        NYK: ["Karl-Anthony Towns", "Josh Hart"],
        SAS: ["Victor Wembanyama", "De'Aaron Fox"],
        OKC: ["Shai Gilgeous-Alexander", "Chet Holmgren"],
      },
    },
    playerStats: [
      { name: "Jalen Brunson", team: "NYK", pts: 28, reb: 4, ast: 7 },
      { name: "Victor Wembanyama", team: "SAS", pts: 24, reb: 12, ast: 3 },
    ],
    injuries: [],
  };

  const nbaMatchup = { awayAbbr: "CLE", homeAbbr: "NYK", label: "CLE at NYK" };
  const knownPlayerToTeam = new Map([
    ["victor wembanyama", "SAS"],
    ["jalen brunson", "NYK"],
  ]);
  const nbaMatchupPool = {
    allowedTeams: ["CLE", "NYK"],
    byTeam: {
      CLE: ["Donovan Mitchell"],
      NYK: ["Jalen Brunson", "Karl-Anthony Towns"],
    },
    knownPlayerToTeam,
  };

  const out = tryBuildNbaGroundingRedirectStructured({
    question: "What's the best prop on Wembanyama tonight?",
    nbaContext,
    nbaMatchup,
    nbaMatchupPool,
    nbaGroundingSnapshot: { verifiedPlayerToTeam: knownPlayerToTeam },
  });

  assert.ok(out);
  assert.match(String(out.lean), /^Lean:/);
  assert.match(String(out.lean), /Wembanyama/i);
  assert.match(String(out.whyNow), /Want that take instead/i);
  assert.equal(out.callType, "prop");
});
