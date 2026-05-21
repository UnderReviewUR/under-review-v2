import test from "node:test";
import assert from "node:assert/strict";

/** Mirror getBdlTournamentBundle preferredFromPool sort (Fix 1). */
function pickPreferredUpcoming(nonTeam, pool, now) {
  const ordered = [...(nonTeam.length ? nonTeam : pool)].sort((a, b) => {
    const tier = (t) => {
      const start = t._startTs;
      if (start > now && start - now <= 72 * 60 * 60 * 1000) return 0;
      return 1;
    };
    const aTier = tier(a);
    const bTier = tier(b);
    if (aTier !== bTier) return aTier - bTier;
    return a._startTs - b._startTs;
  });
  return ordered[0] || null;
}

test("upcoming pool prefers nearest start within 72h over higher purse", () => {
  const now = Date.parse("2026-05-20T17:00:00.000Z");
  const byron = {
    name: "THE CJ CUP Byron Nelson",
    _startTs: Date.parse("2026-05-21T11:00:00.000Z"),
    purse: 9_000_000,
  };
  const schwab = {
    name: "Charles Schwab Challenge",
    _startTs: Date.parse("2026-05-27T11:00:00.000Z"),
    purse: 9_500_000,
  };
  const pool = [schwab, byron];
  const picked = pickPreferredUpcoming(pool, pool, now);
  assert.match(String(picked?.name), /Byron Nelson/i);
});
