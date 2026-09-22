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
 * Lean prose for married props boards — one play, the board, one kill.
 * @param {Record<string, unknown>|null|undefined} s
 */
export function formatNflMarriedBoardProse(s) {
  if (!s || typeof s !== "object") return "";
  const lean = String(s.lean || "").replace(/^Lean:\s*/i, "").trim();
  const conf = String(s.confidence || "").trim();
  const why = String(s.whyNow || "").trim();
  const caveats = Array.isArray(s.caveats)
    ? s.caveats.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const kill =
    caveats.find((c) => /number is a lot/i.test(c) && !why.toLowerCase().includes(c.toLowerCase().slice(0, 40))) ||
    caveats.find((c) => !/^early season/i.test(c) && !why.toLowerCase().includes(c.toLowerCase().slice(0, 48))) ||
    "";
  const lines = [];
  if (lean) lines.push(lean);
  if (conf) lines.push(conf);
  if (why) lines.push(why);
  if (kill) lines.push(`Kills it\n${kill}`);
  return lines.filter(Boolean).join("\n\n");
}
