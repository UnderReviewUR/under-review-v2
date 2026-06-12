import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBdlGroupStandings } from "./wcBdlGroupStandings.js";

test("normalizeBdlGroupStandings handles nested group objects", () => {
  const out = normalizeBdlGroupStandings({
    data: [
      {
        group: "A",
        standings: [
          { team: "MEX", played: 1, won: 1, drawn: 0, lost: 0, gf: 2, ga: 0, gd: 2, points: 3 },
        ],
      },
    ],
  });
  assert.equal(out.A.length, 1);
  assert.equal(out.A[0].team, "MEX");
  assert.equal(out.A[0].points, 3);
});

test("normalizeBdlGroupStandings aggregates flat BDL GOAT rows", () => {
  const rows = [];
  for (const letter of "AB") {
    for (let i = 0; i < 4; i++) {
      rows.push({
        group: { id: letter.charCodeAt(0) - 64, name: `Group ${letter}` },
        team: { name: `Country ${letter}${i}`, abbreviation: `${letter}${i}` },
        played: 1,
        won: 1,
        drawn: 0,
        lost: 0,
        goals_for: 2,
        goals_against: 0,
        goal_difference: 2,
        points: 3,
      });
    }
  }

  const out = normalizeBdlGroupStandings({ data: rows });
  assert.equal(Object.keys(out).length, 2);
  assert.equal(out.A.length, 4);
  assert.equal(out.B.length, 4);
  assert.equal(out.A[0].team, "A0");
  assert.equal(out.A[0].gf, 2);
});

test("normalizeBdlGroupStandings returns empty for unrecognizable rows", () => {
  assert.deepEqual(normalizeBdlGroupStandings({ data: [{ foo: 1 }] }), {});
  assert.deepEqual(normalizeBdlGroupStandings(null), {});
});
