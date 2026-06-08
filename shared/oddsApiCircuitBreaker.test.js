import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  getOddsApiCircuitState,
  isOddsApiDisabled,
  recordOddsApiResponse,
  resetOddsApiCircuitForTests,
} from "./oddsApiCircuitBreaker.js";

describe("oddsApiCircuitBreaker", () => {
  const prevEnv = process.env.ODDS_API_DISABLED;

  beforeEach(() => {
    resetOddsApiCircuitForTests();
    delete process.env.ODDS_API_DISABLED;
  });

  afterEach(() => {
    resetOddsApiCircuitForTests();
    if (prevEnv == null) delete process.env.ODDS_API_DISABLED;
    else process.env.ODDS_API_DISABLED = prevEnv;
  });

  it("opens circuit on 401", () => {
    assert.equal(isOddsApiDisabled(), false);
    recordOddsApiResponse(
      new Response(null, {
        status: 401,
        headers: { "x-requests-remaining": "0" },
      }),
    );
    assert.equal(isOddsApiDisabled(), true);
    assert.equal(getOddsApiCircuitState().reason, "quota_exhausted_401");
  });

  it("opens circuit when remaining hits zero", () => {
    recordOddsApiResponse(
      new Response(null, {
        status: 200,
        headers: { "x-requests-remaining": "0" },
      }),
    );
    assert.equal(isOddsApiDisabled(), true);
  });

  it("respects ODDS_API_DISABLED env", () => {
    process.env.ODDS_API_DISABLED = "1";
    assert.equal(isOddsApiDisabled(), true);
    assert.equal(getOddsApiCircuitState().reason, "env_ODDS_API_DISABLED");
  });
});
