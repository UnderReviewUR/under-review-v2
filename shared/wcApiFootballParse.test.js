import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  formatApiFootballLeadersPromptBlock,
  linkEspnMatchesToApiFootball,
  parseApiFootballFixtures,
  parseApiFootballTopPlayers,
} from "./wcApiFootballParse.js";
import { abbrFromApiFootballTeamName } from "./wcApiFootballTeamMap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = join(__dirname, "..", "api", "fixtures");

test("abbrFromApiFootballTeamName maps WC nations", () => {
  assert.equal(abbrFromApiFootballTeamName("France"), "FRA");
  assert.equal(abbrFromApiFootballTeamName("United States"), "USA");
  assert.equal(abbrFromApiFootballTeamName("South Korea"), "KOR");
});

test("parseApiFootballFixtures extracts fixture ids", () => {
  const json = JSON.parse(
    readFileSync(join(FIXTURES, "wc-api-football-fixtures-sample.json"), "utf8"),
  );
  const parsed = parseApiFootballFixtures(json);
  assert.equal(parsed.count, 2);
  assert.equal(parsed.byMapKey["2026-06-13|FRA|ENG"].apiFixtureId, 10001);
});

test("linkEspnMatchesToApiFootball links by teams and date", () => {
  const json = JSON.parse(
    readFileSync(join(FIXTURES, "wc-api-football-fixtures-sample.json"), "utf8"),
  );
  const parsed = parseApiFootballFixtures(json);
  const linked = linkEspnMatchesToApiFootball(
    [{ id: "760416", homeTeam: "FRA", awayTeam: "ENG", date: "2026-06-13" }],
    parsed.byMapKey,
  );
  assert.equal(linked["760416"].apiFixtureId, 10001);
});

test("parseApiFootballTopPlayers returns assist leaders", () => {
  const json = JSON.parse(
    readFileSync(join(FIXTURES, "wc-api-football-topassists-sample.json"), "utf8"),
  );
  const rows = parseApiFootballTopPlayers(json, "assists");
  assert.equal(rows.length, 2);
  assert.equal(rows[0].nationAbbr, "FRA");
  assert.equal(rows[0].total, 4);
});

test("formatApiFootballLeadersPromptBlock cites supplementary source", () => {
  const block = formatApiFootballLeadersPromptBlock({
    assists: [{ name: "Kylian Mbappé", nationAbbr: "FRA", total: 4, appearances: 3 }],
    yellowCards: [],
    redCards: [],
  });
  assert.match(block, /API-FOOTBALL TOURNAMENT LEADERS/);
  assert.match(block, /supplementary backup/i);
  assert.match(block, /Mbapp/);
});
