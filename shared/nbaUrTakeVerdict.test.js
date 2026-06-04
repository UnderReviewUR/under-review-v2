import assert from "node:assert/strict";
import test from "node:test";
import { NBA_INTENT } from "./nbaUrTakeIntent.js";
import {
  filterNbaFollowUpsForVerdict,
  getNbaVerdictFollowUpChips,
  getNbaVerdictNextLine,
  resolveNbaVerdictFromQuestion,
} from "./nbaUrTakeVerdict.js";

test("resolveNbaVerdictFromQuestion — series misprice vs fair", () => {
  assert.equal(
    resolveNbaVerdictFromQuestion("Are the Knicks mispriced at +180 to win the Finals?", {
      nbaRelevance: { nbaIntent: NBA_INTENT.SERIES_WINNER },
      structured: { lean: "NYK +180 is mispriced to win the series." },
    }),
    "HAS_EDGE",
  );
  assert.equal(
    resolveNbaVerdictFromQuestion("Are the Knicks mispriced at +180?", {
      nbaRelevance: { nbaIntent: NBA_INTENT.SERIES_WINNER },
      structured: { lean: "Knicks are fairly priced — no edge on the series number." },
    }),
    "FAIR_PRICE",
  );
});

test("getNbaVerdictFollowUpChips — HAS_EDGE and SERIES", () => {
  const edge = getNbaVerdictFollowUpChips("HAS_EDGE");
  assert.ok(edge.some((c) => /kills this edge/i.test(c)));
  assert.ok(edge.some((c) => /parlay/i.test(c)));

  const series = getNbaVerdictFollowUpChips("SERIES", NBA_INTENT.SERIES_WINNER);
  assert.ok(series.some((c) => /other side/i.test(c)));
  assert.ok(series.some((c) => /specific number/i.test(c)));
});

test("filterNbaFollowUpsForVerdict — trims conflicting chips", () => {
  const fair = filterNbaFollowUpsForVerdict(
    ["Build a parlay around this.", "What would need to change?"],
    "FAIR_PRICE",
  );
  assert.equal(fair.length, 1);
  assert.match(fair[0], /change/i);
});

test("getNbaVerdictNextLine — live vs series", () => {
  assert.match(getNbaVerdictNextLine("LIVE_IN_GAME"), /live lean/i);
  assert.match(getNbaVerdictNextLine("SERIES"), /series/i);
});
