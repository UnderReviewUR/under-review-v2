/** Align with api/_golfProviders merge + ESPN `state` (e.g. post = complete). */
export function isGolfEventFinished(golfData) {
  const s = String(golfData?.currentEvent?.state || "").toLowerCase();
  return s === "post" || s === "final";
}
