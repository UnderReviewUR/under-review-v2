import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_LOCAL_API_BASE,
  enforceProdApiGuard,
  isProdApiBase,
  resolveScriptApiBase,
} from "./_prodApiGuard.mjs";

test("isProdApiBase detects under-review.app and vercel previews", () => {
  assert.equal(isProdApiBase("https://under-review.app"), true);
  assert.equal(isProdApiBase("https://www.under-review.app/api"), true);
  assert.equal(isProdApiBase("https://under-review-v2.vercel.app"), true);
  assert.equal(isProdApiBase(DEFAULT_LOCAL_API_BASE), false);
});

test("enforceProdApiGuard exits without --allow-prod on production base", () => {
  let code = 0;
  const orig = process.exit;
  process.exit = (c) => {
    code = c;
    throw new Error("exit");
  };
  try {
    enforceProdApiGuard("https://under-review.app", {
      argv: ["node", "audit"],
      scriptName: "test",
    });
    assert.fail("expected exit");
  } catch (e) {
    assert.equal(e.message, "exit");
    assert.equal(code, 1);
  } finally {
    process.exit = orig;
  }
});

test("enforceProdApiGuard allows production with --allow-prod", () => {
  const base = enforceProdApiGuard("https://under-review.app", {
    argv: ["node", "audit", "--allow-prod"],
    scriptName: "test",
  });
  assert.equal(base, "https://under-review.app");
});

test("resolveScriptApiBase prefers --base flag", () => {
  assert.equal(
    resolveScriptApiBase({ argv: ["node", "x", "--base", "http://127.0.0.1:3001"] }),
    "http://127.0.0.1:3001",
  );
});
