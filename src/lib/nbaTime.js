/** Hour 0–23 in America/New_York for UI copy (empty slate, trust notes). */
export function getEtHour24() {
  return parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10,
  );
}

export function formatNbaTipoffLocal(startTimeUtc) {
  const raw = String(startTimeUtc || "").trim();
  if (!raw) return "TBD";
  const dt = new Date(raw);
  if (Number.isNaN(dt.getTime())) return "TBD";
  return dt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Pre/scheduled games must never render with a missing or unparseable start instant.
 * When true, consumers should bust-cache refetch NBA board data (see useNbaData).
 */
export function isNbaTimeMismatch(game) {
  if (!game || typeof game !== "object") return false;
  const state = String(game.state || "").toLowerCase();
  if (state !== "pre" && state !== "scheduled") return false;
  const raw = String(game.startTimeUtc || "").trim();
  if (!raw) return true;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime());
}
