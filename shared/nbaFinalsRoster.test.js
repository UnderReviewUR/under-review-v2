import assert from "node:assert/strict";
import test from "node:test";
import {
  isNbaFinalsExcludedPlayer,
  scrubFinalsExcludedPlayerMentions,
  stripFinalsExcludedFromRosterGrounding,
} from "./nbaFinalsRoster.js";

test("isNbaFinalsExcludedPlayer — Fox variants", () => {
  assert.equal(isNbaFinalsExcludedPlayer("De'Aaron Fox"), true);
  assert.equal(isNbaFinalsExcludedPlayer("fox"), true);
  assert.equal(isNbaFinalsExcludedPlayer("Stephon Castle"), false);
});

test("stripFinalsExcludedFromRosterGrounding — removes Fox from SAS", () => {
  const out = stripFinalsExcludedFromRosterGrounding({
    playersByTeamAbbrev: {
      SAS: ["Victor Wembanyama", "De'Aaron Fox", "Stephon Castle"],
      NYK: ["Jalen Brunson"],
    },
  });
  assert.deepEqual(out.playersByTeamAbbrev.SAS, [
    "Victor Wembanyama",
    "Stephon Castle",
  ]);
});

test("scrubFinalsExcludedPlayerMentions — Castle assist leg", () => {
  const t = scrubFinalsExcludedPlayerMentions(
    "Castle over 6.5 assists when Fox struggles (11.2 PPG last five).",
  );
  assert.doesNotMatch(t, /\bfox\b/i);
  assert.match(t, /castle/i);
});
