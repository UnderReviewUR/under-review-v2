/**
 * World Cup match cards — Starting XI trust chip labels (list views).
 */

/** @typedef {"confirmed" | "pending" | "unavailable"} WcXiStatus */

export const WC_XI_STATUS_LABEL = {
  confirmed: "Starting XI confirmed",
  pending: "XI pending",
  unavailable: "Lineup data pending",
};

export const WC_XI_STATUS_ICON = {
  confirmed: "✓",
  pending: "◷",
  unavailable: "—",
};

/**
 * Prefer API xiStatus; fall back to lineupConfirmed / lastUpdated.
 * @param {{ xiStatus?: string, lineupConfirmed?: boolean, lastUpdated?: number | null } | null | undefined} match
 * @returns {WcXiStatus}
 */
export function resolveWcXiStatus(match) {
  const raw = String(match?.xiStatus || "").toLowerCase();
  if (raw === "confirmed" || raw === "pending" || raw === "unavailable") return raw;
  if (match?.lineupConfirmed === true) return "confirmed";
  if (match?.lastUpdated != null && Number(match.lastUpdated) > 0) return "pending";
  return "unavailable";
}

/**
 * @param {WcXiStatus | string | null | undefined} status
 */
export function wcXiStatusChipLabel(status) {
  const key = resolveWcXiStatus({ xiStatus: status });
  return WC_XI_STATUS_LABEL[key] || WC_XI_STATUS_LABEL.unavailable;
}

/**
 * @param {number | string | null | undefined} lastUpdatedMs
 * @returns {string | null}
 */
export function formatWcDetailAsOfEt(lastUpdatedMs) {
  const n = Number(lastUpdatedMs);
  if (!Number.isFinite(n) || n <= 0) return null;
  try {
    const d = new Date(n);
    if (Number.isNaN(d.getTime())) return null;
    const base = d
      .toLocaleString("en-US", {
        timeZone: "America/New_York",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " ·");
    return `${base} ET`;
  } catch {
    return null;
  }
}
