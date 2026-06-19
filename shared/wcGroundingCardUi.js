/**
 * WC grounding strip — display formatting for pin banner + inventory (Phase 1).
 */

/**
 * @param {{ headline?: string, homeAbbr?: string, awayAbbr?: string } | null | undefined} pinBanner
 */
export function formatWcGroundingPinnedLine(pinBanner) {
  if (!pinBanner) return null;
  const headline = String(pinBanner.headline || "").trim();
  const home = String(pinBanner.homeAbbr || "").trim().toUpperCase();
  const away = String(pinBanner.awayAbbr || "").trim().toUpperCase();
  if (!headline) return null;
  const abbrPair = home && away ? ` (${home}–${away})` : "";
  return `PINNED · ${headline}${abbrPair}`;
}

/**
 * @param {{ subline?: string } | null | undefined} pinBanner
 * @param {{ freshnessLabel?: string } | null | undefined} inventoryStrip
 */
export function formatWcGroundingStatusLine(pinBanner, inventoryStrip) {
  const parts = [];
  const subline = String(pinBanner?.subline || "").trim();
  let freshness = String(inventoryStrip?.freshnessLabel || "").trim();
  freshness = freshness
    .replace(/\s+via\s+balldontlie\s*$/i, "")
    .replace(/\s+via\s+bdl\s*$/i, "")
    .replace(/\s*\(BDL\)\s*$/i, "")
    .trim();
  if (subline) parts.push(subline);
  if (freshness) parts.push(freshness);
  return parts.length ? parts.join(" · ") : null;
}

/**
 * @param {string[]} labels
 */
function joinInventoryLabels(labels) {
  return (Array.isArray(labels) ? labels : [])
    .map((l) => String(l || "").trim())
    .filter(Boolean)
    .join(" · ");
}

/**
 * @param {{ posted?: string[], notPosted?: string[] } | null | undefined} inventoryStrip
 */
export function formatWcGroundingInventoryLines(inventoryStrip) {
  if (!inventoryStrip) return { postedLine: null, notPostedLine: null };
  const posted = joinInventoryLabels(inventoryStrip.posted);
  const notPosted = joinInventoryLabels(inventoryStrip.notPosted);
  return {
    postedLine: posted ? `Posted: ${posted}` : null,
    notPostedLine: notPosted ? `Not posted: ${notPosted}` : null,
  };
}

/**
 * @param {{ pinBanner?: object, inventoryStrip?: object } | null | undefined} grounding
 */
export function buildWcGroundingStripModel(grounding) {
  if (!grounding?.pinBanner && !grounding?.inventoryStrip) return null;
  const pinnedLine = formatWcGroundingPinnedLine(grounding.pinBanner);
  const statusLine = formatWcGroundingStatusLine(grounding.pinBanner, grounding.inventoryStrip);
  const { postedLine, notPostedLine } = formatWcGroundingInventoryLines(grounding.inventoryStrip);
  if (!pinnedLine && !statusLine && !postedLine && !notPostedLine) return null;
  return { pinnedLine, statusLine, postedLine, notPostedLine };
}
