/**
 * Phase 4 Slice 2 — named-leg structured output (player + legId + nearest-line note).
 */

import { extractWcNamedPlayerPropLegsFromQuestion } from "./wcUrTakePlayerMarket.js";

/** @typedef {import("./wcGroundingPacket.types.js").WcGroundingPacket} WcGroundingPacket */

/**
 * @typedef {object} WcNamedLegCitation
 * @property {string} playerName
 * @property {string} legId
 * @property {string} americanOdds
 * @property {string | null} line
 * @property {string | null} side
 * @property {string | null} market
 * @property {string | null} vendor
 * @property {string | null} note
 * @property {string | null} askedThreshold
 */

/**
 * @param {WcGroundingPacket} packet
 * @param {string[]} [citedLegIds]
 * @param {string} [question]
 * @returns {WcNamedLegCitation | null}
 */
export function resolveWcNamedLegCitation(packet, citedLegIds = [], question = "") {
  if (packet?.ask?.shape !== "named_legs") return null;

  const ladder = packet.views?.validation?.ladder?.byKey || {};
  const primaryMatch =
    (packet.namedLegMatches || []).find(
      (m) =>
        m.matched?.legId &&
        (m.status === "matched" || m.status === "partial"),
    ) || null;

  /** @type {import("./wcGroundingPacket.types.js").WcPropLeg | null} */
  let leg = primaryMatch?.matched || null;

  if (!leg && citedLegIds.length) {
    for (const id of citedLegIds) {
      if (ladder[id]) {
        leg = ladder[id];
        break;
      }
    }
  }

  if (!leg?.legId || !leg.playerName) return null;

  const askedLeg = extractWcNamedPlayerPropLegsFromQuestion(question)[0];
  const askedThreshold = askedLeg?.threshold || primaryMatch?.leg?.threshold || null;
  const posted = leg.line != null ? Number.parseFloat(String(leg.line)) : null;
  const asked =
    askedThreshold != null ? Number.parseFloat(String(askedThreshold)) : null;

  let note = primaryMatch?.fallbackNote || null;
  if (!note && asked != null && posted != null && Number.isFinite(asked) && posted !== asked) {
    note = `Nearest to your ${asked} ask (full-match ${asked} not posted; using ${leg.line} ${leg.side || "over"})`;
  } else if (!note && primaryMatch?.status === "partial") {
    note = `Nearest posted line (${leg.line} ${leg.side || "over"})`;
  }

  return {
    playerName: leg.playerName,
    legId: leg.legId,
    americanOdds: String(leg.americanOdds || ""),
    line: leg.line != null ? String(leg.line) : null,
    side: leg.side != null ? String(leg.side) : null,
    market: leg.market != null ? String(leg.market) : null,
    vendor: leg.vendor != null ? String(leg.vendor) : null,
    note,
    askedThreshold: askedThreshold != null ? String(askedThreshold) : null,
  };
}

/**
 * @param {WcNamedLegCitation | null | undefined} citation
 */
export function buildWcNamedLegCitationStripModel(citation) {
  if (!citation?.playerName || !citation?.legId) return null;
  const priceParts = [
    citation.side || "over",
    citation.line,
    citation.americanOdds ? `@ ${citation.americanOdds}` : "",
  ].filter(Boolean);
  return {
    playerLine: `${citation.playerName} · ${priceParts.join(" ")}`.trim(),
    legIdLine: `legId: ${citation.legId}`,
    noteLine: citation.note ? String(citation.note) : null,
  };
}

/**
 * Ensure call mentions the pinned player when we have a validated citation.
 * @param {Record<string, unknown>} structured
 * @param {WcNamedLegCitation} citation
 */
export function enrichWcNamedLegCallWithCitation(structured, citation) {
  const call = String(structured.call || "").trim();
  const player = String(citation.playerName || "").trim();
  if (!player) return structured;

  if (call && new RegExp(player.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i").test(call)) {
    return structured;
  }

  const priceBits = [
    citation.side || "over",
    citation.line,
    citation.americanOdds ? `@ ${citation.americanOdds}` : "",
  ].filter(Boolean);
  const pricePhrase = priceBits.length ? ` ${priceBits.join(" ")}` : "";
  const enrichedCall = call
    ? `${player}${pricePhrase} — ${call}`
    : `${player}${pricePhrase}`.trim();

  return { ...structured, call: enrichedCall.slice(0, 320) };
}

/**
 * Attach named-leg citation fields to structured output for card + audit.
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {WcGroundingPacket | null | undefined} packet
 * @param {object} [opts]
 */
export function applyWcNamedLegOutputContract(structured, packet, opts = {}) {
  if (!structured || typeof structured !== "object" || packet?.ask?.shape !== "named_legs") {
    return structured;
  }

  const citedLegIds = Array.isArray(opts.citedLegIds) ? opts.citedLegIds : [];
  const question = String(opts.question || packet.ask?.question || "");
  const citation = resolveWcNamedLegCitation(packet, citedLegIds, question);
  if (!citation) return structured;

  let out = {
    ...structured,
    namedLegCitation: citation,
    playerName: citation.playerName,
    legId: citation.legId,
    namedLegNote: citation.note,
  };

  out = enrichWcNamedLegCallWithCitation(out, citation);
  return out;
}
