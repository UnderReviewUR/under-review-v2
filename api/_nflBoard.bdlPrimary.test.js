import assert from "node:assert/strict";
import test from "node:test";

test("buildNflLiveBoard prefers BDL and never calls Odds API when primary is on", async () => {
  const prevFlag = process.env.NFL_BDL_PRIMARY;
  const prevKey = process.env.BALLDONTLIE_API_KEY;
  process.env.NFL_BDL_PRIMARY = "1";
  process.env.BALLDONTLIE_API_KEY = "test-key-not-used-for-network";

  const originalFetch = globalThis.fetch;
  /** @type {string[]} */
  const urls = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    urls.push(url);
    if (/the-odds-api\.com/i.test(url)) {
      throw new Error("Odds API must not be called for NFL GOAT board");
    }
    // Force empty BDL responses so we exercise the empty-board return path.
    return new Response(JSON.stringify({ data: [], meta: {} }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  try {
    const { buildNflLiveBoard } = await import("./_nflBoard.js");
    const board = await buildNflLiveBoard({
      week: 1,
      season: 2026,
      includeProps: true,
      maxPropGames: 1,
    });
    assert.equal(board.source, "balldontlie_nfl");
    assert.ok(!urls.some((u) => /the-odds-api\.com/i.test(u)));
    assert.ok(
      urls.length === 0 || urls.some((u) => /balldontlie|api\.balldontlie/i.test(u)),
      `expected BDL URLs, got ${urls.slice(0, 3).join(" | ")}`,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (prevFlag === undefined) delete process.env.NFL_BDL_PRIMARY;
    else process.env.NFL_BDL_PRIMARY = prevFlag;
    if (prevKey === undefined) delete process.env.BALLDONTLIE_API_KEY;
    else process.env.BALLDONTLIE_API_KEY = prevKey;
  }
});
