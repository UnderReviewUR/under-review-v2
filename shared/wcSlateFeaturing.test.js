import assert from "node:assert/strict";
import test from "node:test";
import { ensureWorldCupInSlateOutput } from "./wcSlateFeaturing.js";
import { isWcSlateFeaturingWindow } from "./wc2026Constants.js";

const WC_BOARD = {
  tournament: "2026 FIFA World Cup",
  groups: [{ group: "A", leader: "USA" }],
  upcoming: [{ homeTeam: "USA", awayTeam: "MEX", group: "A" }],
  valueOutrights: [{ team: "NOR", name: "Norway", odds: "+2500" }],
};

test("isWcSlateFeaturingWindow is kickoff through Jul 19 ET", () => {
  assert.equal(isWcSlateFeaturingWindow(Date.parse("2026-06-10T16:00:00Z")), false);
  assert.equal(isWcSlateFeaturingWindow(Date.parse("2026-06-11T16:00:00Z")), true);
  assert.equal(isWcSlateFeaturingWindow(Date.parse("2026-07-19T16:00:00Z")), true);
  assert.equal(isWcSlateFeaturingWindow(Date.parse("2026-07-20T16:00:00Z")), false);
});

test("ensureWorldCupInSlateOutput injects WC when model omitted it", () => {
  const june15 = Date.parse("2026-06-15T16:00:00Z");
  const out = {
    safeLean: { sport: "golf", game: "US Open", angle: "x", why: "y" },
    sharpAngle: { sport: "f1", event: "GP", angle: "a", why: "b" },
    contrarian: { sport: "nba", match: "A @ B", angle: "c", why: "d" },
  };
  const merged = ensureWorldCupInSlateOutput(out, { worldcup: WC_BOARD }, june15);
  const sports = [merged.safeLean, merged.sharpAngle, merged.contrarian].map((r) => r.sport);
  assert.ok(sports.includes("worldcup"));
});

test("ensureWorldCupInSlateOutput is no-op when WC row already present", () => {
  const june15 = Date.parse("2026-06-15T16:00:00Z");
  const out = {
    safeLean: { sport: "worldcup", game: "WC", angle: "x", why: "y" },
    sharpAngle: { sport: "golf", event: "PGA", angle: "a", why: "b" },
    contrarian: { sport: "f1", match: "GP", angle: "c", why: "d" },
  };
  const merged = ensureWorldCupInSlateOutput(out, { worldcup: WC_BOARD }, june15);
  assert.equal(merged.safeLean.sport, "worldcup");
});
