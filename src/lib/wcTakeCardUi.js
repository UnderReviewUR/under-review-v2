/**
 * World Cup UR Take card — headline cap + labeled section mapping (Card Contract v1).
 */

/**
 * @param {string} text
 * @param {number} [maxWords]
 */
export function capWcHeadlineWords(text, maxWords = 12) {
  const words = String(text || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return "";
  if (words.length <= maxWords) return words.join(" ");

  let capped = words.slice(0, maxWords).join(" ");
  capped = capped.replace(/[,;:\-–—]+$/u, "").trim();
  const dashIdx = capped.lastIndexOf(" — ");
  if (dashIdx > capped.length * 0.35) {
    capped = capped.slice(0, dashIdx).trim();
  }
  return capped ? `${capped}…` : "…";
}

/**
 * @param {string} a
 * @param {string} b
 */
function normLine(a, b) {
  return String(a || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/**
 * @param {{ lean?: string, call?: string, headline?: string }} opts
 */
export function pickWcThePlayLine(opts = {}) {
  const headline = String(opts.headline || "").trim();
  const lean = String(opts.lean || "").trim();
  const call = String(opts.call || "").trim();
  if (lean && lean !== "—" && normLine(lean) !== normLine(headline) && lean.length >= 8) {
    return lean;
  }
  if (call && call !== "—" && normLine(call) !== normLine(headline) && call.length > headline.length + 4) {
    return call;
  }
  return "";
}

/**
 * @param {string} text
 */
export function wcCardSectionText(text) {
  const t = String(text || "").trim();
  if (!t || t === "—") return "";
  return t;
}
