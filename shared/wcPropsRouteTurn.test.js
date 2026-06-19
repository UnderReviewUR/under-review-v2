import assert from "node:assert/strict";
import test from "node:test";
import { isWcPropsRouteV2Enabled } from "./wcPropsRouteTurn.js";

test("isWcPropsRouteV2Enabled respects header overrides", () => {
  const prev = process.env.WC_PROPS_ROUTE_V2;
  const prevKey = process.env.BALLDONTLIE_API_KEY;
  delete process.env.WC_PROPS_ROUTE_V2;
  delete process.env.BALLDONTLIE_API_KEY;
  try {
    assert.equal(isWcPropsRouteV2Enabled({ routeHeader: "1" }), true);
    assert.equal(isWcPropsRouteV2Enabled({ routeHeader: "0" }), false);
    assert.equal(isWcPropsRouteV2Enabled({}), false);
    process.env.BALLDONTLIE_API_KEY = "test-key";
    assert.equal(isWcPropsRouteV2Enabled({}), true);
    process.env.WC_PROPS_ROUTE_V2 = "0";
    assert.equal(isWcPropsRouteV2Enabled({}), false);
  } finally {
    if (prev === undefined) delete process.env.WC_PROPS_ROUTE_V2;
    else process.env.WC_PROPS_ROUTE_V2 = prev;
    if (prevKey === undefined) delete process.env.BALLDONTLIE_API_KEY;
    else process.env.BALLDONTLIE_API_KEY = prevKey;
  }
});
