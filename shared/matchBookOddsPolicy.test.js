import assert from "node:assert/strict";
import test from "node:test";
import {
  isMatchBookOddsEnabled,
  matchBookOddsEventCacheKey,
  matchBookOddsHasQuota,
  matchBookOddsListCacheKey,
  MATCH_BOOK_ODDS_MIN_REMAINING_CREDITS,
} from "./matchBookOddsPolicy.js";

test("matchBookOdds cache keys are stable", () => {
  assert.equal(matchBookOddsListCacheKey("tennis_atp"), "match_book_odds:list:tennis_atp");
  assert.equal(
    matchBookOddsEventCacheKey("tennis_atp", "evt-9"),
    "match_book_odds:event:tennis_atp:evt-9",
  );
});

test("matchBookOddsHasQuota respects reserve floor", () => {
  assert.equal(matchBookOddsHasQuota(MATCH_BOOK_ODDS_MIN_REMAINING_CREDITS), true);
  assert.equal(matchBookOddsHasQuota(MATCH_BOOK_ODDS_MIN_REMAINING_CREDITS - 1), false);
  assert.equal(matchBookOddsHasQuota(null), true);
});

test("isMatchBookOddsEnabled honors MATCH_BOOK_ODDS flag", () => {
  const prevKey = process.env.ODDS_API_KEY;
  const prevFlag = process.env.MATCH_BOOK_ODDS;
  try {
    process.env.ODDS_API_KEY = "test-key";
    delete process.env.MATCH_BOOK_ODDS;
    assert.equal(isMatchBookOddsEnabled(), true);
    process.env.MATCH_BOOK_ODDS = "0";
    assert.equal(isMatchBookOddsEnabled(), false);
    process.env.MATCH_BOOK_ODDS = "1";
    assert.equal(isMatchBookOddsEnabled(), true);
  } finally {
    if (prevKey === undefined) delete process.env.ODDS_API_KEY;
    else process.env.ODDS_API_KEY = prevKey;
    if (prevFlag === undefined) delete process.env.MATCH_BOOK_ODDS;
    else process.env.MATCH_BOOK_ODDS = prevFlag;
  }
});
