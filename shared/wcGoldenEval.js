/**
 * World Cup golden eval — full handler-path scoring (fixture or live LLM).
 */

import { classifyWcQuestionIntent } from "./wcUrTakeIntent.js";
import { scoreWcCardContractCase } from "./wcCardContractScorer.js";
import { buildWcCompactStructured } from "./wcUrTakeCompactDelivery.js";

/**
 * @param {import("./wcGoldenEval.fixtures.js").WcGoldenEvalCase} row
 * @param {Record<string, unknown>} response
 */
export function scoreWcGoldenEvalResponse(row, response) {
  const question = String(row.question || "");
  const history = row.requiresHistory ? row.history || [] : [];
  const intentActual = classifyWcQuestionIntent(question, history);
  const intentOk = intentActual === row.expectedIntent;

  if (response?.fallback) {
    return {
      passed: false,
      issueCodes: ["handler_fallback", String(response.fallbackReason || "unknown")],
      intentOk,
      intentActual,
      structured: null,
    };
  }

  let structured = response?.structured;
  if (!structured && row.modelFixture?.summary) {
    structured = buildWcCompactStructured({
      question,
      wcIntent: intentActual,
      summary: row.modelFixture.summary,
      deep: row.modelFixture.deep || "",
    });
  }

  if (!structured || typeof structured !== "object") {
    return {
      passed: false,
      issueCodes: ["missing_structured"],
      intentOk,
      intentActual,
      structured: null,
    };
  }

  const responseText =
    String(response?.responseText || "").trim() ||
    (row.modelFixture
      ? `${row.modelFixture.summary}\n${row.modelFixture.deep || ""}`
      : "");

  const scored = scoreWcCardContractCase({
    question,
    expectedIntent: row.expectedIntent,
    structured,
    wcIntent: intentActual,
    outrightsAvailable: Boolean(row.outrightsAvailable),
    responseText,
  });

  /** @type {string[]} */
  const issueCodes = [...(scored.issueCodes || [])];
  if (!intentOk) issueCodes.unshift("intent_mismatch");

  if (row.expectIssueCodes?.length) {
    for (const code of row.expectIssueCodes) {
      if (!issueCodes.includes(code)) issueCodes.push(`missing_expected_issue:${code}`);
    }
  }
  if (row.forbidIssueCodes?.length) {
    for (const code of row.forbidIssueCodes) {
      if (issueCodes.includes(code)) issueCodes.push(`forbidden_issue:${code}`);
    }
  }

  if (row.expectRepairedPlay && structured?.lean) {
    if (/\bthat actually holds\b/i.test(structured.lean)) {
      issueCodes.push("play_not_repaired");
    }
  }

  if (row.expectMarketOutright && structured) {
    const marketLine = String(row.expectMarketOutright);
    const blob = [structured.line, structured.call, structured.lean, structured.whyNow]
      .filter(Boolean)
      .join("\n");
    if (!blob.includes(marketLine)) {
      issueCodes.push(`missing_market_outright:${marketLine}`);
    }
  }

  const unique = [...new Set(issueCodes)];
  const passed =
    intentOk &&
    unique.filter((c) => !c.startsWith("missing_expected_issue:")).length === 0 &&
    !unique.some((c) => c.startsWith("forbidden_issue:") || c === "play_not_repaired");

  return {
    passed,
    issueCodes: unique,
    intentOk,
    intentActual,
    structured,
    qaPassed: scored.qaPassed,
    voicePassed: scored.voicePassed,
  };
}

/**
 * Offline pipeline — model fixture → compact delivery → QA (no handler).
 * @param {import("./wcGoldenEval.fixtures.js").WcGoldenEvalCase} row
 */
export function runWcGoldenEvalOffline(row) {
  const question = String(row.question || "");
  const history = row.requiresHistory ? row.history || [] : [];
  const intentActual = classifyWcQuestionIntent(question, history);
  const fixture = row.modelFixture;
  if (!fixture?.summary) {
    return {
      passed: false,
      issueCodes: ["missing_model_fixture"],
      intentOk: intentActual === row.expectedIntent,
      intentActual,
      structured: null,
    };
  }

  const structured = buildWcCompactStructured({
    question,
    wcIntent: intentActual,
    summary: fixture.summary,
    deep: fixture.deep || "",
  });

  const scored = scoreWcCardContractCase({
    question,
    expectedIntent: row.expectedIntent,
    structured,
    wcIntent: intentActual,
    outrightsAvailable: Boolean(row.outrightsAvailable),
    responseText: `${fixture.summary}\n${fixture.deep || ""}`,
  });

  /** @type {string[]} */
  const issues = [...(scored.issueCodes || [])];

  if (row.expectRepairedPlay && /\bthat actually holds\b/i.test(fixture.deep || "")) {
    if (/\bthat actually holds\b/i.test(structured.lean || "")) {
      issues.push("play_not_repaired");
    }
  }

  if (row.expectIssueCodes?.length) {
    for (const code of row.expectIssueCodes) {
      if (!issues.includes(code)) issues.push(`missing_expected_issue:${code}`);
    }
  }

  let passed;
  if (row.expectFail) {
    const expectedOk = (row.expectIssueCodes || []).every((code) => issues.includes(code));
    passed =
      expectedOk &&
      !issues.some((c) => c.startsWith("forbidden_issue:")) &&
      !issues.includes("play_not_repaired");
  } else {
    passed =
      scored.passed &&
      issues.filter((c) => !c.startsWith("missing_expected_issue:")).length === 0 &&
      !issues.some((c) => c.startsWith("forbidden_issue:")) &&
      !issues.includes("play_not_repaired");
  }

  return {
    passed,
    issueCodes: issues,
    intentOk: scored.intentOk,
    intentActual: scored.intentActual,
    structured,
    qaPassed: scored.qaPassed,
    voicePassed: scored.voicePassed,
  };
}

/**
 * @param {import("./wcGoldenEval.fixtures.js").WcGoldenEvalCase[]} cases
 * @param {"offline"|"handler"} mode
 */
export function summarizeWcGoldenEvalResults(rows) {
  const pass = rows.filter((r) => r.passed).length;
  return { pass, total: rows.length, rows };
}
