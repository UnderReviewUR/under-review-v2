import assert from "node:assert/strict";
import test from "node:test";
import {
  formatWcMatchFieldText,
  formatWcMatchGroupLetter,
  formatWcMatchVenueLine,
} from "./wcMatchFieldDisplay.js";

test("formatWcMatchGroupLetter — BDL group object with letter", () => {
  assert.equal(formatWcMatchGroupLetter({ letter: "f" }), "F");
});

test("formatWcMatchGroupLetter — rejects object stringification", () => {
  assert.equal(formatWcMatchGroupLetter("[object Object]"), "");
  assert.equal(formatWcMatchGroupLetter({ id: 9 }), "");
});

test("formatWcMatchVenueLine — stadium object", () => {
  assert.equal(
    formatWcMatchVenueLine({ name: "Gillette Stadium", city: "Foxborough" }),
    "Gillette Stadium, Foxborough",
  );
});

test("formatWcMatchFieldText — plain string", () => {
  assert.equal(formatWcMatchFieldText("Seattle"), "Seattle");
});
