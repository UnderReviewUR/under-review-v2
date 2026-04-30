import test from "node:test";
import assert from "node:assert/strict";

import {
  getSessionMemory,
  saveSessionMemory,
  formatMemoryForPrompt,
} from "./_urTakeMemory.js";

test("getSessionMemory returns null when key does not exist", async () => {
  const m = await getSessionMemory(`mem-missing-${Date.now()}@example.com`);
  assert.equal(m, null);
});

test("saveSessionMemory keeps only last 5 takes when given 6", async () => {
  const email = `mem-six-${Date.now()}@example.com`;
  const takes = Array.from({ length: 6 }, (_, i) => ({
    sport: "nba",
    play: `play number ${i} with enough chars`,
    confidence: "Medium",
    date: "Apr 29",
  }));
  await saveSessionMemory(email, takes);
  const mem = await getSessionMemory(email);
  assert.ok(mem);
  assert.equal(mem.v, 2);
  assert.ok(mem.preferences);
  assert.ok(Array.isArray(mem.preferences.frequentPlayers));
  assert.ok(Number.isFinite(mem.updatedAt));
  assert.equal(mem.takes.length, 5);
  assert.match(mem.takes[0].play, /play number 0/);
  assert.match(mem.takes[4].play, /play number 4/);

  const emailDedupe = `mem-dedupe-${Date.now()}@example.com`;
  await saveSessionMemory(emailDedupe, [
    {
      v: 1,
      sport: "nba",
      play: "first take Alperen Sengun over 8.5 rebounds enough chars here",
      player: "Alperen Sengun",
      market: "rebounds",
      direction: "over",
      line: "8.5",
      anchor: "vacancy",
      confidence: "High",
      date: "Apr 29",
    },
  ]);
  await saveSessionMemory(emailDedupe, [
    {
      v: 1,
      sport: "nba",
      play: "second take newer text for same prop line enough chars",
      player: "Alperen Sengun",
      market: "rebounds",
      direction: "over",
      line: "9.5",
      anchor: "vol",
      confidence: "Medium",
      date: "Apr 30",
    },
  ]);
  const memD = await getSessionMemory(emailDedupe);
  assert.ok(memD);
  assert.equal(memD.takes.length, 1);
  assert.match(memD.takes[0].play, /second take/);
});

test("formatMemoryForPrompt returns empty string for null input", () => {
  assert.equal(formatMemoryForPrompt(null), "");
  assert.equal(formatMemoryForPrompt({}), "");
  assert.equal(formatMemoryForPrompt({ takes: [] }), "");
});

test("formatMemoryForPrompt formats takes correctly", () => {
  const legacy = formatMemoryForPrompt({
    takes: [
      {
        date: "Apr 29",
        sport: "nba",
        play: "Lean over on Brunson assists",
        confidence: "High",
      },
    ],
    updatedAt: 1,
  });
  assert.match(legacy, /\[PRIOR SESSION MEMORY\]/);
  assert.match(legacy, /Apr 29: nba — Lean over on Brunson assists \(High confidence\)/);

  const structured = formatMemoryForPrompt({
    v: 1,
    takes: [
      {
        v: 1,
        date: "Apr 29",
        sport: "nba",
        play: "fallback line",
        player: "Alperen Sengun",
        direction: "over",
        line: "8.5",
        market: "rebounds",
        anchor: "Adams vacancy",
        confidence: "High",
      },
    ],
    updatedAt: 1,
  });
  assert.match(structured, /Alperen Sengun over 8\.5 rebounds/);
  assert.match(structured, /Adams vacancy/);
  assert.match(structured, /High confidence/);
});
