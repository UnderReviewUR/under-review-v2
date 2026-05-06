import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { verifyNbaBoardWarmupAuth } from "./nba.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

test("verifyNbaBoardWarmupAuth allows when CRON_SECRET unset", () => {
  const prev = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    assert.equal(
      verifyNbaBoardWarmupAuth({
        headers: {},
      }),
      true,
    );
  } finally {
    if (prev !== undefined) process.env.CRON_SECRET = prev;
  }
});

test("verifyNbaBoardWarmupAuth rejects wrong bearer when CRON_SECRET set", () => {
  process.env.CRON_SECRET = "secret-for-test";
  try {
    assert.equal(
      verifyNbaBoardWarmupAuth({
        headers: { authorization: "Bearer wrong" },
      }),
      false,
    );
  } finally {
    delete process.env.CRON_SECRET;
  }
});

test("verifyNbaBoardWarmupAuth accepts matching Bearer token", () => {
  process.env.CRON_SECRET = "cron-test-token";
  try {
    assert.equal(
      verifyNbaBoardWarmupAuth({
        headers: { authorization: "Bearer cron-test-token" },
      }),
      true,
    );
  } finally {
    delete process.env.CRON_SECRET;
  }
});

test("vercel.json defines NBA board warmup cron", () => {
  const raw = readFileSync(join(__dirname, "../vercel.json"), "utf8");
  const vercel = JSON.parse(raw);
  const paths = (vercel.crons || []).map((c) => c.path);
  assert.ok(
    paths.some((p) => String(p).includes("/api/nba") && String(p).includes("warmup=1")),
    "expected cron path /api/nba with warmup=1",
  );
});
