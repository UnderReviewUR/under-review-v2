import assert from "node:assert/strict";
import test from "node:test";
import {
  buildChatHistoryForApi,
  chatHistoryContentFromMessage,
  compactHistoryContentForAnthropic,
  sliceChatHistoryStructured,
} from "./urChatHistoryForApi.js";
import { extractWcRunnerUpFromHistory } from "./wcTakeRetentionQA.js";

test("chatHistoryContentFromMessage falls back to structured call when text is empty", () => {
  const content = chatHistoryContentFromMessage({
    role: "ai",
    text: "",
    structured: {
      call: "Group D most mispriced (#1); Group K runner-up",
      lean: "Lean: Group D — USA advancement misprice (+32.0pt sim vs market).",
    },
  });
  assert.match(content, /Group D most mispriced/i);
  assert.match(content, /runner-up/i);
});

test("buildChatHistoryForApi keeps assistant turn with structured runner-up fields", () => {
  const history = buildChatHistoryForApi([
    { role: "user", text: "Best group-stage value bet?" },
    {
      role: "ai",
      sport: "worldcup",
      text: "",
      structured: {
        call: "Group D most mispriced (#1); Group K runner-up",
        lean: "Lean: Group D — USA advancement misprice (+32.0pt sim vs market).",
        callType: "group_slate",
        groupLetter: "D",
        runnerUpGroupLetter: "K",
        runnerUpTeamAbbr: "COD",
        primaryMispriceGroupLetter: "D",
      },
    },
  ]);

  assert.equal(history.length, 2);
  assert.equal(history[1].role, "assistant");
  assert.equal(history[1].sport, "worldcup");
  assert.equal(history[1].structured?.runnerUpGroupLetter, "K");
  assert.equal(history[1].structured?.runnerUpTeamAbbr, "COD");
  assert.equal(history[1].structured?.groupLetter, "D");
  assert.match(history[1].content, /Group K runner-up/i);

  const resolved = extractWcRunnerUpFromHistory(history);
  assert.equal(resolved.group, "K");
  assert.equal(resolved.teamAbbr, "COD");
});

test("sliceChatHistoryStructured preserves WC binding fields", () => {
  const row = sliceChatHistoryStructured({
    call: "Group D most mispriced (#1); Group K runner-up",
    runnerUpGroupLetter: "K",
    runnerUpTeamAbbr: "COD",
    groupLetter: "D",
  });
  assert.equal(row?.runnerUpGroupLetter, "K");
  assert.equal(row?.groupLetter, "D");
});

test("compactHistoryContentForAnthropic — structured assistant turn stays under 520 chars", () => {
  const longWhy = "x".repeat(2000);
  const compact = compactHistoryContentForAnthropic({
    role: "assistant",
    content: "Lean: USA to advance in Group D at -750.\n\nTHE PLAY\n".padEnd(3500, " "),
    structured: {
      lean: "Lean: USA to advance in Group D at -750.",
      call: "Group D most mispriced (#1); Group K runner-up",
      whyNow: longWhy,
    },
  });
  assert.ok(compact.length <= 520);
  assert.match(compact, /Group D most mispriced/i);
  assert.match(compact, /Lean: USA/i);
});

test("compactHistoryContentForAnthropic — prose-only assistant extracts Lean line", () => {
  const compact = compactHistoryContentForAnthropic({
    role: "assistant",
    content:
      "Lean: Colombia at +4000 is the sharpest group-stage value.\n\nTHE PLAY\nColombia tournament winner at +4000.\n\nWHY MISPRICED\n".padEnd(
        2800,
        " ",
      ),
  });
  assert.ok(compact.length <= 520);
  assert.match(compact, /Lean: Colombia/i);
});

test("compactHistoryContentForAnthropic — user turn capped at 1000", () => {
  const compact = compactHistoryContentForAnthropic({
    role: "user",
    content: "q".repeat(2000),
  });
  assert.equal(compact.length, 1000);
});
