import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseGoldenBootRowsFromJson } from "./_wcBookScrapeCommon.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("parseGoldenBootRowsFromJson — book fixture", () => {
  const raw = fs.readFileSync(
    path.join(__dirname, "fixtures/wc-golden-boot-book-sample.json"),
    "utf8",
  );
  const rows = parseGoldenBootRowsFromJson(JSON.parse(raw));
  assert.ok(rows.length >= 5);
  assert.ok(rows.some((r) => r.name.includes("Mbapp")));
  assert.ok(!rows.some((r) => r.name === "France"));
});
