import test from "node:test";
import assert from "node:assert/strict";
import { extractBookEventIdsFromHtml, resolveWcBookEventId } from "./wcBookEventIdMap.js";

test("extractBookEventIdsFromHtml finds DraftKings event id", () => {
  const html =
    '<a href="https://sportsbook.draftkings.com/event/760416">Props</a>' +
    ' data-url="https://sportsbook.draftkings.com/event/760416"';
  const ids = extractBookEventIdsFromHtml(html, "draftkings");
  assert.deepEqual(ids, ["760416"]);
});

test("resolveWcBookEventId reads cached map", () => {
  const id = resolveWcBookEventId("401234", "draftkings", {
    byEspnEventId: { 401234: { draftkings: "760416" } },
  });
  assert.equal(id, "760416");
});
