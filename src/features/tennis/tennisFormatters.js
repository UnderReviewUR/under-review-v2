export function formatTennisScore(rawScore) {
  if (!rawScore || rawScore === "-") return "";
  const s = String(rawScore).trim();
  const sets = s.split(/[\s,]+/).filter(Boolean);
  if (sets.length === 0) return "";
  return sets.join(", ");
}

export function buildTennisMatchupSubline(m) {
  const parts = [];
  const round = m.raw?.round ? String(m.raw.round).trim() : "";
  const surface = String(m.raw?.bdl_tournament_surface || "").trim();
  if (round) parts.push(round);
  if (surface) parts.push(surface);
  return parts.join(" · ");
}
