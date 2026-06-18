import assert from "node:assert/strict";
import test from "node:test";
import {
  applyWcNamedLegOutputContract,
  buildWcNamedLegCitationStripModel,
  enrichWcNamedLegCallWithCitation,
  resolveWcNamedLegCitation,
} from "./wcNamedLegOutputContract.js";
import { buildWcGroundingPacketForUrTake, resolveWcNamedLegMatchesForGrounding } from "../api/_wcGroundingUrTake.js";

test("resolveWcNamedLegCitation — Gordon nearest-line note", () => {
  const matchPlayerProps = {
    markets: {
      player_shots_ou: [
        {
          name: "Anthony Gordon",
          americanOdds: "-2500",
          line: "0.5",
          side: "over",
          nationAbbr: "ENG",
          vendor: "betrivers",
        },
      ],
    },
  };
  const question = "Anthony Gordon over 1.5 shots?";
  const namedLegMatches = resolveWcNamedLegMatchesForGrounding(question, matchPlayerProps);
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "slice2-gordon",
    question,
    routingQuestion: question,
    history: [],
    matches: [],
    fixtureTeams: [],
    resolvedEventId: null,
    matchPlayerProps,
    namedLegMatches,
  });

  const citation = resolveWcNamedLegCitation(packet, [], question);
  assert.ok(citation);
  assert.match(citation.playerName, /Gordon/i);
  assert.match(citation.legId, /gordon/i);
  assert.equal(citation.line, "0.5");
  assert.match(String(citation.note || ""), /Nearest to your 1\.5 ask/i);

  const model = buildWcNamedLegCitationStripModel(citation);
  assert.match(model?.playerLine || "", /Gordon/i);
  assert.match(model?.legIdLine || "", /^legId:/);
});

test("applyWcNamedLegOutputContract — enriches call with player name", () => {
  const matchPlayerProps = {
    markets: {
      player_shots_ou: [
        {
          name: "Anthony Gordon",
          americanOdds: "-1000",
          line: "0.5",
          side: "over",
          vendor: "betrivers",
        },
      ],
    },
  };
  const question = "Anthony Gordon over 1.5 shots?";
  const packet = buildWcGroundingPacketForUrTake({
    requestId: "slice2-apply",
    question,
    routingQuestion: question,
    history: [],
    matches: [],
    fixtureTeams: [],
    resolvedEventId: null,
    matchPlayerProps,
    namedLegMatches: resolveWcNamedLegMatchesForGrounding(question, matchPlayerProps),
  });

  const structured = applyWcNamedLegOutputContract(
    { call: "over 1 at -1000 — worth paying at the nearest posted line.", lean: "Lean: pass" },
    packet,
    { question },
  );

  assert.match(String(structured?.playerName || ""), /Gordon/i);
  assert.ok(structured?.legId);
  assert.ok(structured?.namedLegCitation?.legId);
  assert.match(String(structured?.call || ""), /Gordon/i);
});

test("enrichWcNamedLegCallWithCitation — idempotent when player already in call", () => {
  const citation = {
    playerName: "Anthony Gordon",
    legId: "player_shots_ou|anthony gordon|0.5|over|betrivers",
    americanOdds: "-1000",
    line: "0.5",
    side: "over",
    market: "player_shots_ou",
    vendor: "betrivers",
    note: null,
    askedThreshold: "1.5",
  };
  const out = enrichWcNamedLegCallWithCitation(
    { call: "Anthony Gordon over 1 at -1000 is juice — pass." },
    citation,
  );
  assert.equal(out.call, "Anthony Gordon over 1 at -1000 is juice — pass.");
});
