import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWcPlayerMarketPrebuiltStructured,
  extractKnownPlayerNamesFromKv,
  resolveWcPlayerMarketAnswer,
  resolveWcPlayerMarketTier,
} from "./wcPlayerMarketResolve.js";
import { MOCK_WC_PLAYER_MARKET_KV } from "../api/wcPlayerMarkets.fixture.js";

test("resolveWcPlayerMarketTier — market_only with golden boot KV", () => {
  const tier = resolveWcPlayerMarketTier({
    goldenBoot: MOCK_WC_PLAYER_MARKET_KV.goldenBoot,
    players: MOCK_WC_PLAYER_MARKET_KV.players,
    wcContext: { matchDetails: [] },
    wcIntent: "TOP_SCORER",
  });
  assert.equal(tier, "market_only");
});

test("resolveWcPlayerMarketAnswer — does not force pass when KV has names", () => {
  const resolved = resolveWcPlayerMarketAnswer(
    "who will score the most goals?",
    "TOP_SCORER",
    { matchDetails: [], playerMarketKv: MOCK_WC_PLAYER_MARKET_KV },
    MOCK_WC_PLAYER_MARKET_KV,
  );
  assert.equal(resolved.forcePass, false);
  assert.equal(resolved.playerMarketTier, "market_only");
  assert.ok(extractKnownPlayerNamesFromKv(MOCK_WC_PLAYER_MARKET_KV).length >= 10);
});

test("buildWcPlayerMarketPrebuiltStructured — cites top contender", () => {
  const s = buildWcPlayerMarketPrebuiltStructured(
    "Best golden boot?",
    "GOLDEN_BOOT",
    "market_only",
    MOCK_WC_PLAYER_MARKET_KV.goldenBoot,
  );
  assert.ok(s);
  assert.match(s.lean, /Mbapp/);
  assert.match(s.lean, /\+600/);
});
