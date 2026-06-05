/** @file World Cup rules prose delivery — extracted from handler.js */
import { stripRulesThreadBleed } from "../../../shared/wcUrTakeRules.js";
import {
  buildWcRulesStructuredFromProse,
  formatWcRulesResponseAsProse,
} from "../../../shared/wcUrTakeStructured.js";
import { tryParseJsonObject } from "../prompt/jsonParse.js";

export function coerceWcRulesModelText(text, responseDeep = null) {
  const raw = String(text || "").trim();
  const parsed = tryParseJsonObject(raw);
  if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
    return {
      text: parsed.summary.trim(),
      deep: typeof parsed.deep === "string" ? parsed.deep.trim() : responseDeep,
    };
  }
  if (
    parsed &&
    typeof parsed === "object" &&
    !parsed.summary &&
    (parsed.whyNow || parsed.lean || parsed.call)
  ) {
    const parts = [parsed.lean, parsed.whyNow, parsed.edge, parsed.call]
      .filter((v) => typeof v === "string" && v.trim())
      .map((v) => String(v).trim());
    const prose = parts.join("\n\n");
    return { text: prose || raw, deep: responseDeep };
  }
  return { text: raw, deep: responseDeep };
}

export function finalizeWcRulesDelivery({
  responseText,
  responseDeep,
  question,
  bleedForbidden,
  structuredResponse,
}) {
  const coerced = coerceWcRulesModelText(responseText, responseDeep);
  let text = stripRulesThreadBleed(coerced.text, bleedForbidden);
  let deep = coerced.deep ? stripRulesThreadBleed(String(coerced.deep), bleedForbidden) : null;

  const structured = buildWcRulesStructuredFromProse(
    text,
    deep,
    String(question || ""),
    bleedForbidden,
  );
  const formatted = formatWcRulesResponseAsProse(structured);
  if (formatted.trim()) text = formatted;

  return {
    responseText: text,
    responseDeep: deep,
    structuredResponse: structured,
  };
}

/** Dual-publish: turn validated structured JSON into prose so extractTakeFromResponse + UI still work. */
export function formatStructuredResponseAsUrTakeProse(s) {
  if (!s || typeof s !== "object") return "";
  const lean = String(s.lean || "").trim();
  const call = String(s.call || "").trim();
  const conf = String(s.confidence || "").trim();
  const lines = [];
  if (lean) lines.push(lean);
  if (call) lines.push(`THE PLAY: ${call}`);
  if (conf) lines.push(`CONFIDENCE\n${conf}`);
  if (s.whyNow) lines.push(String(s.whyNow).trim());
  if (s.edge) lines.push(String(s.edge).trim());
  const a = s.analysis;
  if (a && typeof a === "object") {
    if (a.matchupAnalysis) lines.push(`MATCH READ\n${String(a.matchupAnalysis).trim()}`);
    if (a.injuryContext) lines.push(`INJURY / AVAILABILITY\n${String(a.injuryContext).trim()}`);
    if (a.marketContext) lines.push(`MARKET\n${String(a.marketContext).trim()}`);
    if (a.lineMovement) lines.push(`LINE MOVEMENT\n${String(a.lineMovement).trim()}`);
    if (a.statisticalEdge) lines.push(`STAT EDGE\n${String(a.statisticalEdge).trim()}`);
  }
  if (Array.isArray(s.caveats) && s.caveats.length) {
    lines.push(`WHAT KILLS IT\n${s.caveats.map((c) => String(c).trim()).filter(Boolean).join("\n")}`);
  }
  return lines.filter(Boolean).join("\n\n");
}

// ── Intent + sport helpers ─────────────────────────────────────────────────
