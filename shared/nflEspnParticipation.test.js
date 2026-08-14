import assert from "node:assert/strict";
import test from "node:test";
import { classifyNflParticipationComment } from "./nflEspnParticipation.js";

test("classifies scheduled to play vs not expected to play", () => {
  assert.equal(
    classifyNflParticipationComment(
      "Burrow and other starters are scheduled to play in Thursday's preseason opener against Detroit",
    ),
    "play",
  );
  assert.equal(
    classifyNflParticipationComment(
      "Stroud is among the Texans' starters not expected to play in Thursday's preseason opener",
    ),
    "sit",
  );
  assert.equal(
    classifyNflParticipationComment(
      "Vrabel said that he doesn't expect Maye to play in Thursday's preseason opener",
    ),
    "sit",
  );
  assert.equal(
    classifyNflParticipationComment("Richardson will start Thursday's preseason opener against the Patriots"),
    "play",
  );
  assert.equal(
    classifyNflParticipationComment("first-team offense will play one or two drives Thursday"),
    "limited",
  );
  assert.equal(classifyNflParticipationComment("sharp in training camp"), "unknown");
});
