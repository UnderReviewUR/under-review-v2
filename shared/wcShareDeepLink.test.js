import test from "node:test";
import assert from "node:assert/strict";

/** Mirrors App.jsx ?wc=1&q= decode for share/deep-link regression. */
function parseWcDeepLinkQuery(search) {
  const sp = new URLSearchParams(search);
  if (sp.get("wc") !== "1" && sp.get("wc") !== "true") return null;
  const raw = String(sp.get("q") || "").trim();
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

test("WC deep link — team question", () => {
  const q = parseWcDeepLinkQuery("?wc=1&q=Can+England+top+Group+L");
  assert.equal(q, "Can England top Group L");
});

test("WC deep link — structural question", () => {
  const q = parseWcDeepLinkQuery("?wc=1&q=Which+group+is+most+mispriced");
  assert.equal(q, "Which group is most mispriced");
});

test("WC deep link — rules question", () => {
  const q = parseWcDeepLinkQuery("?wc=1&q=Does+extra+time+count+towards+goals");
  assert.equal(q, "Does extra time count towards goals");
});
