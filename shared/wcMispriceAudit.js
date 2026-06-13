/**
 * Tucked audit line for misprice cards — breakdown panel only, not card face.
 */

import { calculateOddsFreshness, WC_OUTRIGHTS_MAX_AGE_MS } from "./wcOddsFreshness.js";
import { WC_ADVANCEMENT_MARKET, wcAdvancementMarketMeta } from "./wcAdvancementMarket.js";
import { WC_ADVANCEMENT_TO_BDL_MARKET } from "./wcBdlFutures.js";

/**
 * @param {number} ms
 */
function formatAuditStamp(ms) {
  const d = Number(ms);
  if (!Number.isFinite(d) || d <= 0) return "";
  return new Date(d).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  });
}

/**
 * @param {string} vendor
 */
function formatVendor(vendor) {
  const v = String(vendor || "").trim().toLowerCase();
  if (v === "draftkings") return "DraftKings";
  if (v === "fanduel") return "FanDuel";
  if (!v) return "book";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

/**
 * @param {{ byMarketType?: Record<string, Record<string, { vendor?: string }>> } | undefined} bdlFutures
 * @param {string} marketType
 * @param {string | undefined} teamAbbr
 */
function pickBdlVendorLabel(bdlFutures, marketType, teamAbbr) {
  const abbr = String(teamAbbr || "").trim().toUpperCase();
  const row = abbr ? bdlFutures?.byMarketType?.[marketType]?.[abbr] : null;
  if (row?.vendor) return formatVendor(row.vendor);
  const rows = Object.values(bdlFutures?.byMarketType?.[marketType] || {});
  const dk = rows.find((r) => String(r?.vendor || "").toLowerCase() === "draftkings");
  if (dk?.vendor) return formatVendor(dk.vendor);
  if (rows[0]?.vendor) return formatVendor(rows[0].vendor);
  return "DraftKings";
}

/**
 * One muted footnote for the More detail panel.
 * @param {{
 *   simCount?: number,
 *   simLastUpdated?: number | null,
 *   eloMatchesApplied?: number,
 *   strengthMatchesApplied?: number,
 *   xgMatchesApplied?: number,
 *   bdlFutures?: { byMarketType?: Record<string, Record<string, { vendor?: string }>>, lastUpdated?: number, source?: string },
 *   bdlMarketType?: string,
 *   teamAbbr?: string,
 *   nowMs?: number,
 * }} [opts]
 */
export function buildWcMispriceAuditFootnote(opts = {}) {
  const simCount = Number(opts.simCount) || 10000;
  const simMs = Number(opts.simLastUpdated);
  const eloApplied = Number(opts.eloMatchesApplied) || 0;
  const strengthApplied = Number(opts.strengthMatchesApplied) || 0;
  const xgApplied = Number(opts.xgMatchesApplied) || 0;
  const bdl = opts.bdlFutures;
  const bdlMs = Number(bdl?.lastUpdated);
  const marketType = String(opts.bdlMarketType || "qualify_from_group");
  const nowMs = opts.nowMs ?? Date.now();
  const advancementKey =
    Object.entries(WC_ADVANCEMENT_TO_BDL_MARKET).find(([, v]) => v === marketType)?.[0] ||
    WC_ADVANCEMENT_MARKET.GROUP_ESCAPE;
  const meta = wcAdvancementMarketMeta(advancementKey);

  /** @type {string[]} */
  const parts = [`${simCount.toLocaleString("en-US")} Elo/Poisson sims`];
  if (eloApplied > 0) {
    parts.push(`Elo refreshed from ${eloApplied} FT result${eloApplied === 1 ? "" : "s"}`);
  }
  if (xgApplied > 0) {
    parts.push(`xG/form from ${xgApplied} BDL match${xgApplied === 1 ? "" : "es"}`);
  } else if (strengthApplied > 0) {
    parts.push(`form from ${strengthApplied} FT sample${strengthApplied === 1 ? "" : "s"}`);
  }
  if (Number.isFinite(simMs) && simMs > 0) {
    parts.push(`updated ${formatAuditStamp(simMs)}`);
  }

  if (Number.isFinite(bdlMs) && bdlMs > 0) {
    const fresh = calculateOddsFreshness(bdlMs, WC_OUTRIGHTS_MAX_AGE_MS, nowMs);
    const vendor = pickBdlVendorLabel(bdl, marketType, opts.teamAbbr);
    const stale = fresh.isStale ? " · stale" : "";
    parts.push(`${meta.shortLabel || "Advance"} lines ${vendor} via BDL · ${formatAuditStamp(bdlMs)}${stale}`);
  } else if (bdl?.source && bdl.source !== "balldontlie_live") {
    parts.push("lines from reference snapshot");
  }

  if (parts.length < 2) return "";
  return `Sources: ${parts.join(" · ")}.`;
}

/**
 * @param {Record<string, unknown> | null | undefined} structured
 * @param {Parameters<typeof buildWcMispriceAuditFootnote>[0]} auditOpts
 */
export function attachWcMispriceAuditFootnote(structured, auditOpts = {}) {
  if (!structured || typeof structured !== "object") return structured;
  const footnote = buildWcMispriceAuditFootnote(auditOpts);
  if (!footnote) return structured;
  return { ...structured, auditFootnote: footnote };
}
