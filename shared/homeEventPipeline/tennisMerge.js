/**
 * Merge BDL + Odds tennis normalized events that describe the same real-world matchup
 * (sorted player names + calendar date). Prefer higher truth rank (BDL fixture > Odds fallback).
 */

function tennisTruthRank(ev) {
  const r = ev?.raw || {};
  const inner = r.raw && typeof r.raw === "object" ? r.raw : {};
  if (inner.bdl_match_id != null && String(inner.bdl_match_id).trim()) return 100;
  const tl = String(r.truth_layer || inner.truth_layer || "");
  if (tl === "bdl_fixture") return 90;
  if (inner.odds_event_id != null && String(inner.odds_event_id).trim()) return 50;
  return 10;
}

function tennisPairDedupeKey(ev) {
  const r = ev?.raw || {};
  const inner = r.raw && typeof r.raw === "object" ? r.raw : {};
  const h = String(r.home ?? inner.home_team ?? "").trim().toLowerCase();
  const a = String(r.away ?? inner.away_team ?? "").trim().toLowerCase();
  const d = String(r.event_date ?? inner.event_date ?? "").slice(0, 10);
  if (!h || !a || !d) return null;
  const [s, t] = [h, a].sort();
  return `${s}|${t}|${d}`;
}

/** Collapse Odds-only + BDL rows for the same matchup/day to a single normalized event. */
export function mergeTennisNormalizedByPairDate(tennisNormList) {
  const best = new Map();
  const singles = [];
  for (const ev of tennisNormList) {
    const pk = tennisPairDedupeKey(ev);
    if (!pk) {
      singles.push(ev);
      continue;
    }
    const cur = best.get(pk);
    if (!cur || tennisTruthRank(ev) > tennisTruthRank(cur)) best.set(pk, ev);
  }
  return [...best.values(), ...singles];
}
