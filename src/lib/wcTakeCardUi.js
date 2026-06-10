/**
 * World Cup UR Take card — section mapping + stat grid (Card Contract Option 1).
 */

/**
 * @param {string} lean
 */
function formatWcPlaySlot(lean) {
  const l = String(lean || "")
    .replace(/^lean:\s*/i, "")
    .trim();
  if (!l || l.length < 8) return "";
  const first = l.match(/[^.!?]+[.!?]+/)?.[0]?.trim();
  return first || l;
}

/**
 * WC card stat grid — never duplicate the headline in a truncated UR read cell.
 * @param {{ call?: string, line?: string, lean?: string, confidence?: string, callType?: string }} opts
 */
export function buildWcTakeStatGrid(opts = {}) {
  const conf = String(opts.confidence || "Medium").trim();
  const lineVal = String(opts.line || "").trim();
  const call = String(opts.call || "").trim();
  const ct = String(opts.callType || "single").toLowerCase();
  const play = formatWcPlaySlot(opts.lean);

  if (ct === "advancement" || ct === "group_slate") {
    const slotLine =
      lineVal ||
      formatWcPlaySlot(opts.call) ||
      formatWcPlaySlot(opts.lean) ||
      "See breakdown";
    return {
      mode: ct,
      slots: [
        { key: "ln", label: "Line", value: slotLine, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (ct === "predictions_roundup") {
    const slotLine = lineVal || "Tap breakdown for full board";
    return {
      mode: "predictions_roundup",
      slots: [
        { key: "ln", label: "Line", value: slotLine, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (ct.startsWith("player_market") || ct === "player_prop") {
    const slotLine = lineVal || play || "See breakdown";
    return {
      mode: ct,
      slots: [
        { key: "ln", label: "Line", value: slotLine, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (lineVal) {
    return {
      mode: "line",
      slots: [
        { key: "ln", label: "Line", value: lineVal, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  if (play && play.toLowerCase() !== call.toLowerCase()) {
    return {
      mode: "play",
      slots: [
        { key: "pl", label: "Play", value: play, highlight: true },
        { key: "c", label: "Confidence", value: conf, highlight: false },
      ],
    };
  }

  return {
    mode: "confidence_only",
    slots: [{ key: "c", label: "Confidence", value: conf, highlight: false }],
  };
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
  const lineSlot = String(opts.lineSlot || "").trim();
  const ct = String(opts.callType || "").toLowerCase();

  if (ct === "advancement" || ct === "group_slate") {
    if (lineSlot) return "";
    const play = formatWcPlaySlot(lean) || formatWcPlaySlot(call);
    if (play && normLine(play) !== normLine(headline)) return play;
    return "";
  }

  if (lean && lean !== "—" && normLine(lean) !== normLine(headline) && lean.length >= 8) {
    if (lineSlot && normLine(lean) === normLine(lineSlot)) return "";
    return lean;
  }
  if (call && call !== "—" && normLine(call) !== normLine(headline) && call.length > headline.length + 4) {
    if (lineSlot && normLine(call) === normLine(lineSlot)) return "";
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
