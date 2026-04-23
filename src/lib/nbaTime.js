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

export function isNbaTimeMismatch(game) {
  if (!game || typeof game !== "object") return false;
  const state = String(game.state || "").toLowerCase();
  if (state !== "pre" && state !== "scheduled") return false;
  if (String(game.startTimeSource || "").toLowerCase() !== "bdl_start_time") return false;
  const raw = String(game.startTimeUtc || "").trim();
  if (!raw) return true;
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime());
}
