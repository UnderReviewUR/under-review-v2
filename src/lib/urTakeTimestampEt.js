/**
 * Format API `timestamp` for Sharp Brief footer (America/New_York).
 * Boring and defensive: anything hostile to `Date` or `toLocaleString` returns null.
 */
export function formatUrTakeTimestampEt(ts) {
  if (ts == null || ts === "" || typeof ts === "symbol" || typeof ts === "function") {
    return null;
  }

  try {
    const d = new Date(ts);
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
