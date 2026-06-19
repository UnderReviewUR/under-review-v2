import test from "node:test";
import assert from "node:assert/strict";
import { isWcLiveMatchStatus, isWcScheduledMatchStatus } from "../shared/wcFeaturedMatch.js";

test("warm targets include live fixtures ahead of scheduled", () => {
  const matches = [
    { id: "1", status: "NS", commenceTs: Date.now() + 3600_000, homeTeam: "A", awayTeam: "B" },
    { id: "2", status: "live", commenceTs: Date.now() - 3600_000, homeTeam: "USA", awayTeam: "AUS" },
  ];
  const cutoff = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const targets = matches
    .filter((m) => {
      if (m.status === "FT") return false;
      if (isWcLiveMatchStatus(m.status)) return true;
      if (!isWcScheduledMatchStatus(m.status)) return false;
      return Number(m.commenceTs) <= cutoff;
    })
    .sort((a, b) => {
      const aLive = isWcLiveMatchStatus(a.status) ? 0 : 1;
      const bLive = isWcLiveMatchStatus(b.status) ? 0 : 1;
      if (aLive !== bLive) return aLive - bLive;
      return Number(a.commenceTs) - Number(b.commenceTs);
    });
  assert.equal(targets.length, 2);
  assert.equal(targets[0].id, "2");
});
