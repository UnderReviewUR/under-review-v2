/**
 * World Cup golden eval — offline delivery/QA, handler intercept, optional live LLM.
 *
 *   node scripts/run-wc-golden-eval.mjs --offline
 *   node scripts/run-wc-golden-eval.mjs --handler
 *   node scripts/run-wc-golden-eval.mjs --live --case roundup-complete
 *   node scripts/run-wc-golden-eval.mjs --check-prompts [baseRef]
 */
import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env") });

const args = new Set(process.argv.slice(2));
const modeOffline = args.has("--offline") || (!args.has("--handler") && !args.has("--live"));
const modeHandler = args.has("--handler");
const modeLive = args.has("--live");
const checkPrompts = args.has("--check-prompts");
const caseFilter = (() => {
  const idx = process.argv.indexOf("--case");
  return idx >= 0 ? String(process.argv[idx + 1] || "").trim() : "";
})();

if (checkPrompts) {
  const baseRef = process.argv[process.argv.indexOf("--check-prompts") + 1] || "HEAD~1";
  const r = spawnSync(process.execPath, ["scripts/detect-wc-prompt-change.mjs", baseRef], {
    cwd: root,
    stdio: "inherit",
  });
  process.exit(r.status ?? 1);
}

process.env.UR_TAKE_REQUIRE_AUTH = "false";

const {
  runWcGoldenEvalOffline,
  scoreWcGoldenEvalResponse,
  summarizeWcGoldenEvalResults,
} = await import("../shared/wcGoldenEval.js");
const {
  wcGoldenEvalOfflineCases,
  wcGoldenEvalHandlerCases,
  WC_GOLDEN_EVAL_CASES,
} = await import("../shared/wcGoldenEval.fixtures.js");

/**
 * @param {import("../shared/wcGoldenEval.fixtures.js").WcGoldenEvalCase[]} cases
 */
async function runOffline(cases) {
  return cases.map((row) => ({
    id: row.id,
    mode: "offline",
    ...runWcGoldenEvalOffline(row),
  }));
}

/**
 * @param {import("../shared/wcGoldenEval.fixtures.js").WcGoldenEvalCase[]} cases
 */
async function runHandler(cases) {
  process.env.UR_TAKE_GOLDEN_EVAL = "1";
  process.env.ANTHROPIC_API_KEY = "golden-eval-fixture";

  const handler = (await import("../api/ur-take.js")).default;
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];

  for (const row of cases) {
    if (!row.anthropicPayload) {
      rows.push({
        id: row.id,
        mode: "handler",
        passed: false,
        issueCodes: ["missing_anthropic_fixture"],
        skipped: true,
      });
      continue;
    }

    /** @type {Record<string, unknown>} */
    let body = null;
    const req = {
      method: "POST",
      headers: { "content-length": "0" },
      body: {
        question: row.question,
        sportHint: "worldcup",
        history: row.requiresHistory ? row.history || [] : [],
        goldenEvalCaseId: row.id,
      },
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {},
      json(payload) {
        body = payload;
      },
      end() {},
    };

    process.env.UR_TAKE_GOLDEN_EVAL_CASE = row.id;
    await handler(req, res);
    delete process.env.UR_TAKE_GOLDEN_EVAL_CASE;
    const handlerText = `${body?.response || ""}\n${body?.responseDeep || ""}`.trim();
    const scored = scoreWcGoldenEvalResponse(row, {
      fallback: body?.fallback,
      fallbackReason: body?.fallbackReason,
      structured: body?.structured,
      wcIntent: body?.wcIntent,
      responseText:
        row.expectFail && row.modelFixture
          ? `${row.modelFixture.summary}\n${row.modelFixture.deep || ""}`
          : handlerText,
    });

    if (row.expectFail) {
      const expectedOk = (row.expectIssueCodes || []).every((code) =>
        scored.issueCodes.includes(code),
      );
      scored.passed = expectedOk && !scored.issueCodes.includes("play_not_repaired");
    }

    rows.push({
      id: row.id,
      mode: "handler",
      status: res.statusCode,
      ...scored,
    });
  }

  return rows;
}

/**
 * @param {import("../shared/wcGoldenEval.fixtures.js").WcGoldenEvalCase[]} cases
 */
async function runLive(cases) {
  delete process.env.UR_TAKE_GOLDEN_EVAL;
  delete process.env.UR_TAKE_GOLDEN_EVAL_CASE;
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey || apiKey === "golden-eval-fixture") {
    console.error(
      "ANTHROPIC_API_KEY required for --live (set in .env or shell; must not be golden-eval-fixture)",
    );
    process.exit(1);
  }

  const handler = (await import("../api/ur-take.js")).default;
  /** @type {Array<Record<string, unknown>>} */
  const rows = [];

  for (const row of cases) {
    let body = null;
    const req = {
      method: "POST",
      headers: { "content-length": "0" },
      body: {
        question: row.question,
        sportHint: "worldcup",
        history: row.requiresHistory ? row.history || [] : [],
      },
    };
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code;
        return this;
      },
      setHeader() {},
      json(payload) {
        body = payload;
      },
      end() {},
    };

    await handler(req, res);
    const scored = scoreWcGoldenEvalResponse(row, {
      fallback: body?.fallback,
      fallbackReason: body?.fallbackReason,
      structured: body?.structured,
      wcIntent: body?.wcIntent,
      responseText: `${body?.response || ""}\n${body?.responseDeep || ""}`.trim(),
    });
    rows.push({
      id: row.id,
      mode: "live",
      status: res.statusCode,
      marketLine: row.expectMarketOutright || null,
      ...scored,
    });
  }

  return rows;
}

let cases = WC_GOLDEN_EVAL_CASES;
if (caseFilter) {
  cases = cases.filter((row) => row.id === caseFilter);
  if (!cases.length) {
    console.error(`No golden case: ${caseFilter}`);
    process.exit(1);
  }
}

/** @type {Array<Record<string, unknown>>} */
let results = [];

if (modeOffline) {
  const offlineCases = wcGoldenEvalOfflineCases().filter((row) =>
    caseFilter ? row.id === caseFilter : true,
  );
  results = await runOffline(offlineCases);
} else if (modeHandler) {
  const handlerCases = wcGoldenEvalHandlerCases().filter((row) =>
    caseFilter ? row.id === caseFilter : true,
  );
  results = await runHandler(handlerCases);
} else if (modeLive) {
  results = await runLive(cases);
}

const summary = summarizeWcGoldenEvalResults(results);
const failed = results.filter((r) => !r.passed);

console.log(
  JSON.stringify(
    {
      mode: modeOffline ? "offline" : modeHandler ? "handler" : "live",
      pass: summary.pass,
      total: summary.total,
      failed: failed.map((r) => ({
        id: r.id,
        issueCodes: r.issueCodes,
        intentActual: r.intentActual,
      })),
    },
    null,
    2,
  ),
);

process.exit(failed.length ? 1 : 0);
