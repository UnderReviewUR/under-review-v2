/**
 * Married NFL props takes: keep the ticket loud, kill form-letter section spam.
 */

/**
 * Drop boilerplate analysis blocks so UI / prose don't repeat the board 3×.
 * @param {Record<string, unknown>|null|undefined} structured
 */
export function slimNflMarriedStructuredForDelivery(structured) {
  if (!structured || typeof structured !== "object") return structured;
  const next = { ...structured };
  const prev =
    next.analysis && typeof next.analysis === "object"
      ? /** @type {Record<string, unknown>} */ (next.analysis)
      : {};
  const injury = String(prev.injuryContext || "").trim();
  const realInjury =
    injury &&
    !/^n\/?a$/i.test(injury) &&
    !/^check inactives/i.test(injury);

  next.analysis = {
    matchupAnalysis: "",
    injuryContext: realInjury ? injury : "",
    marketContext: "",
    lineMovement: "",
    statisticalEdge: "",
  };

  const caveats = Array.isArray(next.caveats)
    ? next.caveats.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  /** @type {string[]} */
  const slimCaveats = [];
  for (const c of caveats) {
    if (slimCaveats.some((x) => x.toLowerCase() === c.toLowerCase())) continue;
    // Drop pure duplicates of opener line already in whyNow/edge.
    if (/^early season/i.test(c) && slimCaveats.length >= 1) continue;
    slimCaveats.push(c);
    if (slimCaveats.length >= 2) break;
  }
  next.caveats = slimCaveats;
  return next;
}

/**
 * Lean prose for married props boards — no MATCH READ / MARKET echo chamber.
 * @param {Record<string, unknown>|null|undefined} s
 */
export function formatNflMarriedBoardProse(s) {
  if (!s || typeof s !== "object") return "";
  const lean = String(s.lean || "").trim();
  const call = String(s.call || "").trim();
  const conf = String(s.confidence || "").trim();
  const why = String(s.whyNow || "").trim();
  const edge = String(s.edge || "").trim();
  const injury = String(s.analysis?.injuryContext || "").trim();
  const lines = [];
  if (lean) lines.push(lean);
  if (call) lines.push(`THE PLAY: ${call}`);
  if (conf) lines.push(`CONFIDENCE\n${conf}`);
  if (why) lines.push(why);
  if (edge) lines.push(edge);
  if (injury) lines.push(`INJURY / AVAILABILITY\n${injury}`);
  if (Array.isArray(s.caveats) && s.caveats.length) {
    lines.push(
      `WHAT KILLS IT\n${s.caveats.map((c) => String(c).trim()).filter(Boolean).join("\n")}`,
    );
  }
  return lines.filter(Boolean).join("\n\n");
}
