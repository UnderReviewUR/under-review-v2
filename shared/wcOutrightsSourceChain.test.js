import test from "node:test";
import assert from "node:assert/strict";
import {
  mergeWcOutrightsLayers,
  resolveWcOutrightsSourceChain,
} from "./wcOutrightsSourceChain.js";

test("mergeWcOutrightsLayers picks median implied across sources", () => {
  const merged = mergeWcOutrightsLayers([
    { source: "espn", outrights: { ESP: "+500" } },
    { source: "odds_api", outrights: { ESP: "+600" } },
  ]);
  assert.ok(merged.outrights.ESP);
  assert.match(merged.outrights.ESP, /^\+/);
  assert.equal(merged.provenance.ESP.sources.length, 2);
});

test("resolveWcOutrightsSourceChain falls through to seed", () => {
  const chain = resolveWcOutrightsSourceChain({
    espn: { ok: false, outrights: {}, error: "empty" },
    oddsApi: { ok: false, outrights: {}, error: "empty" },
    cached: null,
    nowMs: Date.now(),
  });
  assert.equal(chain.sourceTier, "static_seed");
  assert.ok(chain.outrights.ESP);
  assert.equal(chain.seeded, true);
});

test("resolveWcOutrightsSourceChain merges aggregator scrape layers", () => {
  const chain = resolveWcOutrightsSourceChain({
    espn: { ok: true, outrights: { ESP: "+500" } },
    oddsApi: { ok: false, outrights: {}, error: "empty" },
    aggregators: [
      {
        source: "covers",
        ok: true,
        outrights: {
          ESP: "+450",
          FRA: "+475",
          ENG: "+700",
          BRA: "+950",
          ARG: "+900",
          POR: "+850",
          GER: "+1400",
          NED: "+2000",
        },
      },
      { source: "oddschecker", ok: false, outrights: {}, error: "http_403" },
    ],
    cached: null,
    nowMs: Date.now(),
  });
  assert.equal(chain.sourceTier, "live_merge");
  assert.ok(chain.outrights.ESP);
  assert.equal(chain.attempts.filter((a) => a.ok).length, 2);
});

test("resolveWcOutrightsSourceChain serves stale kv when live empty", () => {
  const nowMs = Date.now();
  const chain = resolveWcOutrightsSourceChain({
    espn: { ok: false, outrights: {}, error: "empty" },
    oddsApi: { ok: false, outrights: {}, error: "empty" },
    cached: { outrights: { ESP: "+480" }, lastUpdated: nowMs - 60_000, source: "espn" },
    nowMs,
  });
  assert.equal(chain.sourceTier, "stale_kv_fresh");
  assert.equal(chain.outrights.ESP, "+480");
  assert.equal(chain.servedStale, true);
});
