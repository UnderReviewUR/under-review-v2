import { polishHomePreviewField } from "../shared/nbaHomePreviewFilter.js";

/**
 * Server-side condensed preview for public daily take (no React/helpers.jsx).
 * Headline + first body chunk + closing line — mirrors card skim behavior loosely.
 */
function stripInlineMd(s) {
  return String(s || "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/^>>\s*/, "")
    .trim();
}

function firstLineIsGameRibbon(line) {
  const s = String(line || "").trim();
  if (!s || s.length > 120) return false;
  return /\b(Q[1-4]|OT|Live|Final)\b/i.test(s);
}

/**
 * @param {string} raw
 * @returns {{ headline: string, bodyChunk: string, closing: string }}
 */
export function condensedPreviewFromUrTakeResponse(raw) {
  const text = String(raw || "").trim();
  if (!text) return { headline: "", bodyChunk: "", closing: "" };

  const lines = text.split("\n");
  let bodyStart = 0;
  if (lines[0] && firstLineIsGameRibbon(lines[0])) bodyStart = 1;

  const body = lines.slice(bodyStart).join("\n").trim();
  const paras = body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const headline = polishHomePreviewField(stripInlineMd(paras[0]?.split("\n")[0] || ""), 280);

  let bodyChunk = "";
  if (paras.length > 1) {
    bodyChunk = polishHomePreviewField(stripInlineMd(paras[1]), 520);
  } else if (paras[0]) {
    const afterFirstLine = paras[0].split("\n").slice(1).join(" ").trim();
    if (afterFirstLine) bodyChunk = polishHomePreviewField(stripInlineMd(afterFirstLine), 520);
  }

  const lastLine = lines.length ? lines[lines.length - 1].trim() : "";
  const stripConfidenceBlock = lastLine.toLowerCase().startsWith("confidence:");
  const textForClosing = stripConfidenceBlock ? lines.slice(0, -1).join("\n") : body;

  const sentences = textForClosing.match(/[^.!?]+[.!?]+/g) || [];
  let closing = polishHomePreviewField(stripInlineMd(sentences[sentences.length - 1] || ""), 240);

  if (closing && headline && closing.replace(/\s+/g, " ") === headline.replace(/\s+/g, " ")) {
    closing = "";
  }

  return {
    headline,
    bodyChunk,
    closing,
  };
}
