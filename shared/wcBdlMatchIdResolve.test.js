import test from "node:test";
import assert from "node:assert/strict";
import { looksLikeWcEspnEventId } from "../api/_wcBdlData.js";

test("looksLikeWcEspnEventId distinguishes ESPN ids from BDL slate ids", () => {
  assert.equal(looksLikeWcEspnEventId("760418"), true);
  assert.equal(looksLikeWcEspnEventId(760423), true);
  assert.equal(looksLikeWcEspnEventId("7"), false);
  assert.equal(looksLikeWcEspnEventId(104), false);
  assert.equal(looksLikeWcEspnEventId("wc-promo-mex-rsa"), false);
});
