import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

const screenPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "WorldCupScreen.jsx");

function firstIndexAfter(source, needle, after = 0) {
  const pos = source.indexOf(needle, after);
  return pos < 0 ? Infinity : pos;
}

test("WorldCupScreen declares dock/chat flags before hooks reference them", () => {
  const src = readFileSync(screenPath, "utf8");
  const bodyStart = src.indexOf("export default function WorldCupScreen");
  assert.ok(bodyStart >= 0, "WorldCupScreen export missing");
  const body = src.slice(bodyStart);

  const urDockedDecl = firstIndexAfter(body, "const urDockedChat =");
  const wcTakeDecl = firstIndexAfter(body, "const wcTakeLoading =");
  assert.ok(Number.isFinite(urDockedDecl), "urDockedChat declaration missing");
  assert.ok(Number.isFinite(wcTakeDecl), "wcTakeLoading declaration missing");

  const highlightEffect = firstIndexAfter(body, "if (!highlightEventId || wcLoading || wcTakeLoading)");
  const dockedLayoutEffect = firstIndexAfter(body, "if (!urDockedChat) return;");

  assert.ok(highlightEffect > wcTakeDecl, "wcTakeLoading used in highlight effect before declaration");
  assert.ok(dockedLayoutEffect > urDockedDecl, "urDockedChat used in layout effect before declaration");
});
