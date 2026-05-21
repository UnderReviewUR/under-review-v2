import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { parseActionNetworkGameProps } from "./_nbaPropsParse.js";

describe("parseActionNetworkGameProps", () => {
  it("parses points/rebounds/assists with consensus and per-book lines", () => {
    const samplePath = `${process.env.TEMP || "/tmp"}/an-props-sample.json`;
    let raw;
    try {
      raw = readFileSync(samplePath, "utf8");
    } catch {
      console.log("skip: no an-props-sample.json in TEMP");
      return;
    }

    const data = JSON.parse(raw);
    const parsed = parseActionNetworkGameProps(
      data.player_props,
      {},
      291185,
    );

    assert.equal(parsed.gameId, 291185);
    assert.ok(parsed.playerCount > 0);
    assert.equal(parsed.hasPostedLines, true);

    const withPts = parsed.players.find((p) => p.props?.points?.over);
    assert.ok(withPts, "expected at least one points over consensus");
    assert.ok(withPts.props.points.over.line != null);
    assert.ok(withPts.props.points.over.odds != null);
    assert.ok(withPts.props.points.over.bookId === 15);
    assert.ok(Array.isArray(withPts.props.points.books));
    assert.ok(withPts.props.points.books.length >= 2);
  });

  it("builds synthetic rows from line player_id", () => {
    const parsed = parseActionNetworkGameProps(
      {
        core_bet_type_27_points: [
          {
            lines: {
              15: [
                {
                  player_id: 999,
                  side: "over",
                  value: 22.5,
                  odds: -110,
                  book_id: 15,
                  updated_at: "2026-05-20T17:00:09-07:00",
                },
                {
                  player_id: 999,
                  side: "under",
                  value: 22.5,
                  odds: -110,
                  book_id: 15,
                },
              ],
            },
          },
        ],
      },
      { 999: { abbr: "T.Test", team_id: 175 } },
      291185,
    );

    const p = parsed.players.find((x) => x.playerId === 999);
    assert.ok(p);
    assert.equal(p.playerAbbr, "T.Test");
    assert.equal(p.teamId, 175);
    assert.equal(p.props.points.over.line, 22.5);
  });
});
