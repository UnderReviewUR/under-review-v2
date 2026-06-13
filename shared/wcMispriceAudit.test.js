import assert from "node:assert/strict";
import test from "node:test";
import { buildWcMispriceAuditFootnote, attachWcMispriceAuditFootnote } from "./wcMispriceAudit.js";

test("buildWcMispriceAuditFootnote — sim + BDL stamps with form nudge", () => {
  const nowMs = Date.parse("2026-06-13T16:00:00.000Z");
  const footnote = buildWcMispriceAuditFootnote({
    simCount: 10000,
    simLastUpdated: Date.parse("2026-06-13T12:00:00.000Z"),
    eloMatchesApplied: 3,
    strengthMatchesApplied: 4,
    xgMatchesApplied: 2,
    formFixturesResolved: 12,
    formRatingRange: { min: 6.8, max: 8.3 },
    formBumpApplied: true,
    bdlFutures: {
      lastUpdated: Date.parse("2026-06-13T15:30:00.000Z"),
      source: "balldontlie_live",
      byMarketType: {
        qualify_from_group: {
          COD: { vendor: "draftkings" },
        },
      },
    },
    bdlMarketType: "qualify_from_group",
    teamAbbr: "COD",
    nowMs,
  });
  assert.match(footnote, /^Sources:/);
  assert.match(footnote, /10,000 Elo\/Poisson sims/);
  assert.match(footnote, /Elo refreshed from 3 FT results/);
  assert.match(footnote, /xG\/form from 2 BDL matches/);
  assert.match(footnote, /pre-match form nudge on 12 fixtures \(ratings 6\.8–8\.3\)/);
  assert.match(footnote, /DraftKings via BDL/);
  assert.doesNotMatch(footnote, /VERIFIED CONTEXT/i);
});

test("buildWcMispriceAuditFootnote — form n/a when no bundles", () => {
  const footnote = buildWcMispriceAuditFootnote({
    simCount: 10000,
    formFixturesResolved: 0,
    formBumpApplied: false,
  });
  assert.match(footnote, /pre-match form n\/a \(no BDL bundles for upcoming fixtures\)/);
});

test("attachWcMispriceAuditFootnote — preserves card fields", () => {
  const out = attachWcMispriceAuditFootnote(
    { lean: "Lean: Pass on DR Congo", callType: "group_slate" },
    {
      simLastUpdated: Date.parse("2026-06-13T12:00:00.000Z"),
      bdlFutures: { lastUpdated: Date.now(), byMarketType: { qualify_from_group: {} } },
      formFixturesResolved: 0,
      formBumpApplied: false,
    },
  );
  assert.equal(out.lean, "Lean: Pass on DR Congo");
  assert.ok(String(out.auditFootnote || "").startsWith("Sources:"));
});
