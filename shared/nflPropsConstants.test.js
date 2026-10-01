import assert from "node:assert/strict";
import test from "node:test";
import { nflBoardCacheKey, nflLiveBoardCacheKeyPart } from "./nflPropsConstants.js";

test("nflLiveBoardCacheKeyPart separates includeProps from bare board", () => {
  const bare = nflLiveBoardCacheKeyPart({
    week: 4,
    season: 2026,
    includeProps: false,
    source: "bdl",
  });
  const withProps = nflLiveBoardCacheKeyPart({
    week: 4,
    season: 2026,
    includeProps: true,
    maxPropGames: 8,
    source: "bdl",
  });
  assert.notEqual(bare, withProps);
  assert.match(bare, /_p0/);
  assert.match(withProps, /_p1/);
  assert.notEqual(nflBoardCacheKey(bare), nflBoardCacheKey(withProps));
});

test("nflLiveBoardCacheKeyPart scopes matchup boards separately", () => {
  const week = nflLiveBoardCacheKeyPart({
    week: 4,
    season: 2026,
    includeProps: true,
    maxPropGames: 8,
    source: "bdl",
  });
  const scoped = nflLiveBoardCacheKeyPart({
    week: 4,
    season: 2026,
    includeProps: true,
    maxPropGames: 1,
    scopeAbbrs: ["NE", "SEA"],
    source: "bdl",
  });
  assert.notEqual(week, scoped);
  assert.match(scoped, /_sNE-SEA/);
});
