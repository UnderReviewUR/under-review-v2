import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  alabamaAlertPassesPrefs,
  normalizeOwnerAlertPrefs,
  transferAlertPassesPrefs,
} from "./prefs.js";

describe("normalizeOwnerAlertPrefs", () => {
  it("defaults Barça + Alabama on, rumors off", () => {
    const p = normalizeOwnerAlertPrefs(null);
    assert.equal(p.teams.barcelona, true);
    assert.equal(p.teams.alabama, true);
    assert.equal(p.teams.arsenal, false);
    assert.equal(p.interests.transfers, true);
    assert.equal(p.interests.rumors, false);
  });

  it("migrates v1 barca/alabama flags", () => {
    const p = normalizeOwnerAlertPrefs({ barca: false, alabama: true });
    assert.equal(p.teams.barcelona, false);
    assert.equal(p.teams.alabama, true);
  });

  it("caps custom teams", () => {
    const p = normalizeOwnerAlertPrefs({
      customTeams: ["A", "Birmingham Legion FC", "x", ...Array.from({ length: 12 }, (_, i) => `Club ${i}`)],
    });
    assert.ok(p.customTeams.length <= 8);
    assert.ok(!p.customTeams.includes("A"));
  });
});

describe("transferAlertPassesPrefs", () => {
  it("requires Barça team + transfers interest", () => {
    const prefs = normalizeOwnerAlertPrefs({
      teams: { barcelona: true },
      interests: { transfers: true, rumors: false },
    });
    assert.equal(
      transferAlertPassesPrefs(
        { barca: true, title: "Barcelona agree personal terms — James Benge" },
        prefs,
      ).ok,
      true,
    );
    const off = normalizeOwnerAlertPrefs({
      teams: { barcelona: false },
      interests: { transfers: true },
    });
    assert.equal(
      transferAlertPassesPrefs(
        { barca: true, title: "Barcelona agree personal terms — James Benge" },
        off,
      ).ok,
      false,
    );
  });

  it("drops soft rumors when rumors interest is off", () => {
    const prefs = normalizeOwnerAlertPrefs({
      teams: { barcelona: true },
      interests: { transfers: true, rumors: false },
    });
    assert.equal(
      transferAlertPassesPrefs(
        { barca: true, title: "Barcelona linked with Premier League midfielder" },
        prefs,
      ).ok,
      false,
    );
  });
});

describe("alabamaAlertPassesPrefs", () => {
  it("keeps injury when injuries on", () => {
    const prefs = normalizeOwnerAlertPrefs({
      teams: { alabama: true },
      interests: { injuries: true, roster: false },
    });
    assert.equal(
      alabamaAlertPassesPrefs(
        { title: "Alabama QB ruled out with ankle injury", reasons: ["signal:injury"] },
        prefs,
      ).ok,
      true,
    );
  });

  it("drops when alabama team off", () => {
    const prefs = normalizeOwnerAlertPrefs({ teams: { alabama: false } });
    assert.equal(
      alabamaAlertPassesPrefs({ title: "Alabama QB ruled out", reasons: [] }, prefs).ok,
      false,
    );
  });
});
