import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isBarcaNonFirstTeam,
  isBarcaWeakRumorOnly,
  passesBarcaHighSignalGate,
} from "./barcaHighSignal.js";

describe("barcaHighSignal", () => {
  it("drops academy / femenil noise", () => {
    assert.equal(isBarcaNonFirstTeam("Barcelona B midfielder linked with loan"), true);
    assert.equal(isBarcaNonFirstTeam("Barcelona agree fee for striker"), false);
  });

  it("flags weak rumor without strong verbs", () => {
    assert.equal(isBarcaWeakRumorOnly("Barcelona interested in Premier League midfielder"), true);
    assert.equal(isBarcaWeakRumorOnly("Barcelona agree personal terms for midfielder"), false);
  });

  it("keeps tier-2 Barça byline and drops aggregate soft ping", () => {
    assert.equal(
      passesBarcaHighSignalGate({
        barca: true,
        title: "Barcelona close to signing — James Benge",
        reporters: ["benge"],
        tier: 2,
        score: 10,
        reasons: ["transfer:signing", "reporter:benge"],
      }).ok,
      true,
    );
    assert.equal(
      passesBarcaHighSignalGate({
        barca: true,
        title: "Barcelona linked with unknown winger - Google News",
        reporters: [],
        tier: null,
        score: 7,
        reasons: ["soft:deal", "barca:barcelona"],
      }).ok,
      false,
    );
  });
});
