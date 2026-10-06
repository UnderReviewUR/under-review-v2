import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatOwnerBreakingBody,
  parseOwnerBreakingPaste,
  sendOwnerWebPush,
} from "./_ownerBreakingPush.js";

describe("parseOwnerBreakingPaste", () => {
  it("accepts NFL Schefter paste and defaults Ask inject", () => {
    const p = parseOwnerBreakingPaste({
      sport: "nfl",
      source: "Schefter",
      text: "Patriots trading WR X to Jets for a third-round pick",
    });
    assert.equal(p.ok, true);
    assert.equal(p.sport, "nfl");
    assert.equal(p.source, "Schefter");
    assert.equal(p.injectAsk, true);
  });

  it("rejects short text and bad source", () => {
    assert.equal(parseOwnerBreakingPaste({ sport: "nfl", source: "Schefter", text: "hi" }).ok, false);
    assert.equal(
      parseOwnerBreakingPaste({ sport: "nfl", source: "Random", text: "Long enough breaking line here" }).ok,
      false,
    );
  });

  it("does not inject Ask for soccer", () => {
    const p = parseOwnerBreakingPaste({
      sport: "soccer",
      source: "Ornstein",
      text: "Barcelona agree fee for midfielder",
      injectAsk: true,
    });
    assert.equal(p.ok, true);
    assert.equal(p.injectAsk, false);
  });
});

describe("formatOwnerBreakingBody", () => {
  it("formats source · SPORT — text", () => {
    assert.equal(
      formatOwnerBreakingBody({ sport: "nfl", source: "Schefter", text: "Player out" }),
      "Schefter · NFL — Player out",
    );
  });
});

describe("sendOwnerWebPush", () => {
  it("skips empty body and missing VAPID", async () => {
    assert.equal((await sendOwnerWebPush({ body: "" })).reason, "empty_body");
    const prevPub = process.env.VAPID_PUBLIC_KEY;
    const prevPriv = process.env.VAPID_PRIVATE_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    try {
      const r = await sendOwnerWebPush({ body: "Hello from owner paste" });
      assert.equal(r.skipped, true);
      assert.equal(r.reason, "vapid_missing");
    } finally {
      if (prevPub !== undefined) process.env.VAPID_PUBLIC_KEY = prevPub;
      else delete process.env.VAPID_PUBLIC_KEY;
      if (prevPriv !== undefined) process.env.VAPID_PRIVATE_KEY = prevPriv;
      else delete process.env.VAPID_PRIVATE_KEY;
    }
  });
});
