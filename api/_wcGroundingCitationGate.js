/**
 * Phase 4 Slice 1 — validate Claude player-prop legId citations against grounding ladder.
 */

import { expandRawRowToPropLegs } from "./_wcGroundingPacket.js";
import {
  buildWcFixturePlayerPropsListStructured,
  buildWcNamedPlayerPropsStructured,
} from "../shared/wcPlayerMarketResolve.js";
import { isWcPlayerMarketIntent } from "../shared/wcUrTakePlayerMarket.js";
import { applyWcNamedLegOutputContract } from "../shared/wcNamedLegOutputContract.js";
import { formatStructuredResponseAsUrTakeProse } from "./ur-take/wc/rulesDelivery.js";

/** @typedef {import("../shared/wcGroundingPacket.types.js").WcGroundingPacket} WcGroundingPacket */

export const WC_GROUNDING_CITATION_GATE_SHAPES = new Set([
  "fixture_board",
  "named_legs",
  "slate",
]);

const LEG_ID_TEXT_RE =
  /\b(?:bdl:[A-Za-z0-9_-]+|player_[a-z_]+(?:\|[^|\s]+){3,})\b/gi;

const NEAREST_LINE_CAVEAT =
  "Nearest available posted line — prices verified against the BDL ladder.";

/**
 * @param {WcGroundingPacket | null | undefined} packet
 */
export function shouldRunWcGroundingCitationGate(packet) {
  if (!packet?.views?.validation?.allowedLegIds) return false;
  return WC_GROUNDING_CITATION_GATE_SHAPES.has(String(packet.ask?.shape || ""));
}

/**
 * @param {unknown} value
 * @param {string[]} out
 */
function collectLegIdsDeep(value, out) {
  if (value == null) return;
  if (typeof value === "string") {
    for (const m of value.matchAll(LEG_ID_TEXT_RE)) {
      out.push(m[0]);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectLegIdsDeep(item, out);
    return;
  }
  if (typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (k === "legId" && typeof v === "string" && v.trim()) {
        out.push(v.trim());
      } else {
        collectLegIdsDeep(v, out);
      }
    }
  }
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {string} [responseText]
 */
export function extractCitedLegIdsFromWcPropsResponse(structured, responseText = "") {
  /** @type {string[]} */
  const ids = [];
  collectLegIdsDeep(structured, ids);
  collectLegIdsDeep(responseText, ids);
  return [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
}

/**
 * @param {string[]} citedLegIds
 * @param {Set<string> | Iterable<string>} allowedLegIds
 */
export function validateWcCitedLegIds(citedLegIds, allowedLegIds) {
  const allowed =
    allowedLegIds instanceof Set ? allowedLegIds : new Set(allowedLegIds || []);
  const invalid = citedLegIds.filter((id) => !allowed.has(id));
  return {
    valid: invalid.length === 0,
    invalid,
    citedLegIds,
    allowedCount: allowed.size,
  };
}

/**
 * Named-leg asks must cite a matched ladder row when deterministic match exists.
 * @param {WcGroundingPacket} packet
 * @param {string[]} citedLegIds
 */
export function validateWcNamedLegCitationBinding(packet, citedLegIds) {
  if (packet.ask?.shape !== "named_legs") {
    return { valid: true, requiredLegIds: [], missingRequired: [] };
  }
  /** @type {string[]} */
  const requiredLegIds = [];
  for (const match of packet.namedLegMatches || []) {
    if (match.status !== "matched" && match.status !== "partial") continue;
    const legId = match.matched?.legId;
    if (legId) requiredLegIds.push(String(legId));
  }
  if (!requiredLegIds.length) {
    return { valid: citedLegIds.length > 0, requiredLegIds, missingRequired: [] };
  }
  const citesRequired = requiredLegIds.some((id) => citedLegIds.includes(id));
  const missingRequired = citesRequired
    ? []
    : requiredLegIds.filter((id) => !citedLegIds.includes(id));
  return {
    valid: citesRequired,
    requiredLegIds,
    missingRequired,
  };
}

/**
 * @param {WcGroundingPacket} packet
 * @param {object} opts
 */
export function buildWcCitationGateRetryUserPrompt(packet, opts = {}) {
  const invalidLegIds = Array.isArray(opts.invalidLegIds) ? opts.invalidLegIds : [];
  const missingRequired = Array.isArray(opts.missingRequired) ? opts.missingRequired : [];
  /** @type {Array<{ legId: string, player: string, line: string | null, odds: string }>} */
  const topLegs = [];
  for (const market of packet.views?.claude?.markets || []) {
    for (const leg of market.topLegs || []) {
      if (topLegs.length >= 5) break;
      topLegs.push({
        legId: leg.legId,
        player: leg.player,
        line: leg.line,
        odds: leg.odds,
      });
    }
    if (topLegs.length >= 5) break;
  }

  const problems = [
    ...invalidLegIds.map((id) => `invalid legId: ${id}`),
    ...missingRequired.map((id) => `missing required named-leg legId: ${id}`),
    ...(opts.missingLegIds ? ["no legId citations in structured output"] : []),
  ];

  return [
    "Your previous player-prop answer failed ladder validation.",
    `Problems: ${problems.join("; ") || "citation mismatch"}.`,
    "Re-answer using ONLY legIds from this posted ladder (or explain blockers if none apply):",
    JSON.stringify({ topLegsFromGroundingPacket: topLegs }, null, 2),
    "Return the same structured JSON schema. Cite legId on every priced leg.",
  ].join("\n");
}

/**
 * Drop structured rows / citations whose legIds are not on the ladder.
 * @param {Record<string, unknown>} structured
 * @param {Set<string>} allowedLegIds
 */
export function stripUnvalidatedLegIdsFromStructured(structured, allowedLegIds) {
  if (!structured || typeof structured !== "object") return structured;
  const out = { ...structured };

  if (Array.isArray(out.propBoardRows)) {
    out.propBoardRows = out.propBoardRows.filter((row) => {
      const legId = row?.legId ? String(row.legId) : "";
      return !legId || allowedLegIds.has(legId);
    });
  }

  if (Array.isArray(out.citations)) {
    out.citations = out.citations.filter((row) => {
      const legId = row?.legId ? String(row.legId) : "";
      return !legId || allowedLegIds.has(legId);
    });
  }

  return out;
}

/**
 * @param {object} params
 */
export function assessWcGroundingCitationGate(params) {
  const { structured, responseText = "", packet } = params;
  const allowedLegIds = packet.views.validation.allowedLegIds;
  const citedLegIds = extractCitedLegIdsFromWcPropsResponse(structured, responseText);
  const legIdCheck = validateWcCitedLegIds(citedLegIds, allowedLegIds);
  const namedCheck = validateWcNamedLegCitationBinding(packet, citedLegIds);

  const shape = packet.ask?.shape;
  const missingLegIds =
    shape === "named_legs" && citedLegIds.length === 0 && namedCheck.requiredLegIds.length > 0;

  const pass =
    legIdCheck.valid &&
    namedCheck.valid &&
    !(shape === "named_legs" && citedLegIds.length === 0 && namedCheck.requiredLegIds.length > 0);

  return {
    pass,
    citedLegIds,
    invalidLegIds: legIdCheck.invalid,
    missingRequiredLegIds: namedCheck.missingRequired,
    missingLegIds,
    requiredLegIds: namedCheck.requiredLegIds,
  };
}

/**
 * @param {object} params
 */
export function buildWcGroundingDeterministicFallback(params) {
  const {
    packet,
    question,
    wcIntent,
    wcContext,
    tier,
    kvBlocks,
    reason = "citation_gate",
  } = params;

  const tierResolved = tier || wcContext?.playerMarketTier || "market_only";
  const kv = kvBlocks || wcContext?.playerMarketKv || {};
  const shape = packet.ask?.shape;

  let structured = null;
  if (shape === "named_legs" && isWcPlayerMarketIntent(wcIntent)) {
    structured = buildWcNamedPlayerPropsStructured(
      String(question || ""),
      tierResolved,
      kv,
      wcContext,
    );
  } else if (shape === "fixture_board" || shape === "slate") {
    structured = buildWcFixturePlayerPropsListStructured(
      String(question || ""),
      tierResolved,
      kv,
      wcContext,
    );
  }

  if (!structured || typeof structured !== "object") return null;

  const existing = Array.isArray(structured.caveats)
    ? structured.caveats.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  if (!existing.includes(NEAREST_LINE_CAVEAT)) {
    structured.caveats = [...existing, NEAREST_LINE_CAVEAT];
  }

  structured.wcCitationGateFallback = true;
  structured.wcCitationGateReason = reason;

  return structured;
}

/**
 * Strip invalid legIds and attach named-leg output contract when applicable.
 * @param {Record<string, unknown>} structured
 * @param {WcGroundingPacket} packet
 * @param {object} opts
 */
function finalizeCitationGateStructured(structured, packet, opts = {}) {
  const allowedLegIds = packet.views.validation.allowedLegIds;
  let out = stripUnvalidatedLegIdsFromStructured(structured, allowedLegIds);
  if (packet.ask?.shape === "named_legs") {
    out = applyWcNamedLegOutputContract(out, packet, {
      citedLegIds: opts.citedLegIds || [],
      question: opts.question || "",
    });
  }
  return out;
}

/**
 * @param {object} params
 * @returns {Promise<{ structured: Record<string, unknown> | null, responseText: string | null, log: Record<string, unknown> }>}
 */
export async function enforceWcGroundingCitationGate(params) {
  const {
    structured,
    responseText = "",
    packet,
    question,
    wcIntent,
    wcContext,
    tier,
    kvBlocks,
    retryAnthropic,
  } = params;

  /** @type {Record<string, unknown>} */
  const log = {
    ran: true,
    shape: packet?.ask?.shape || null,
    outcome: "skipped",
  };

  if (!shouldRunWcGroundingCitationGate(packet) || !structured || typeof structured !== "object") {
    log.ran = false;
    return { structured, responseText, log };
  }

  let currentStructured = structured;
  let currentText = String(responseText || "");
  let assessment = assessWcGroundingCitationGate({
    structured: currentStructured,
    responseText: currentText,
    packet,
  });

  log.initial = assessment;

  if (assessment.pass) {
    log.outcome = "pass";
    const finalized = finalizeCitationGateStructured(currentStructured, packet, {
      citedLegIds: assessment.citedLegIds,
      question: String(question || ""),
    });
    return {
      structured: finalized,
      responseText: currentText,
      log,
    };
  }

  if (typeof retryAnthropic === "function") {
    const retryPrompt = buildWcCitationGateRetryUserPrompt(packet, {
      invalidLegIds: assessment.invalidLegIds,
      missingRequired: assessment.missingRequiredLegIds,
      missingLegIds: assessment.missingLegIds,
    });
    const retryResult = await retryAnthropic(retryPrompt, currentStructured);
    if (retryResult?.structured && typeof retryResult.structured === "object") {
      currentStructured = retryResult.structured;
      currentText = retryResult.responseText || currentText;
      assessment = assessWcGroundingCitationGate({
        structured: currentStructured,
        responseText: currentText,
        packet,
      });
      log.retry = assessment;
      if (assessment.pass) {
        log.outcome = "pass_after_retry";
        const finalized = finalizeCitationGateStructured(currentStructured, packet, {
          citedLegIds: assessment.citedLegIds,
          question: String(question || ""),
        });
        return {
          structured: finalized,
          responseText: currentText,
          log,
        };
      }
    } else {
      log.retry = { failed: true };
    }
  }

  const fallback = buildWcGroundingDeterministicFallback({
    packet,
    question,
    wcIntent,
    wcContext,
    tier,
    kvBlocks,
    reason: assessment.invalidLegIds.length
      ? "invalid_leg_ids"
      : assessment.missingRequiredLegIds.length
        ? "missing_named_leg"
        : "missing_leg_ids",
  });

  if (fallback) {
    log.outcome = "deterministic_fallback";
    log.fallbackReason = fallback.wcCitationGateReason;
    const withContract = finalizeCitationGateStructured(fallback, packet, {
      citedLegIds: extractCitedLegIdsFromWcPropsResponse(fallback),
      question: String(question || ""),
    });
    const fallbackText = formatStructuredResponseAsUrTakeProse(withContract);
    return {
      structured: withContract,
      responseText: fallbackText,
      log,
    };
  }

  log.outcome = "sanitized_claude";
  const sanitized = finalizeCitationGateStructured(currentStructured, packet, {
    citedLegIds: assessment.citedLegIds,
    question: String(question || ""),
  });
  return {
    structured: sanitized,
    responseText: currentText,
    log,
  };
}
