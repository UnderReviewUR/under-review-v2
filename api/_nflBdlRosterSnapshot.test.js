import assert from "node:assert/strict";
import test from "node:test";
import { NFL_BDL_ROSTER_SNAPSHOT } from "./data/nflBdlRosterSnapshot.js";
import { buildNflStaticPlayerTeamIndex } from "./_nflMatchupPropHygiene.js";
import { findNflPoolPlayerInQuestion } from "./_nflMatchupCard.js";

test("BDL GOAT snapshot covers 32 teams and Patriots skill", () => {
  assert.equal(NFL_BDL_ROSTER_SNAPSHOT.teamCount, 32);
  assert.ok(NFL_BDL_ROSTER_SNAPSHOT.playerCount > 2000);
  assert.equal(NFL_BDL_ROSTER_SNAPSHOT.playerTeamByName["aj brown"], "NE");
  assert.equal(NFL_BDL_ROSTER_SNAPSHOT.playerTeamByName["romeo doubs"], "NE");
  assert.equal(NFL_BDL_ROSTER_SNAPSHOT.playerTeamByName["drake maye"], "NE");
});

test("static team index loses to BDL snapshot for Brown and Doubs", () => {
  const idx = buildNflStaticPlayerTeamIndex();
  assert.equal(idx["aj brown"], "NE");
  assert.equal(idx["romeo doubs"], "NE");
});

test("matchup identity uses BDL team for Doubs and Brown", () => {
  assert.equal(findNflPoolPlayerInQuestion("aj brown over 34.5")?.team, "NE");
  assert.equal(findNflPoolPlayerInQuestion("doubs over 14.5")?.team, "NE");
});
