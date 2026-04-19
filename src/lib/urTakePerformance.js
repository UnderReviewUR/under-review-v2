/**
 * Client-side helpers for UR Take ledger /api/performance snapshots.
 * Tier bucketing mirrors how users read CONFIDENCE lines (High / Medium / Speculative).
 */

export function normalizeConfidenceTier(confidenceLine) {
  const s = String(confidenceLine || "").trim().toLowerCase();
  if (s.startsWith("high")) return "High";
  if (s.startsWith("medium")) return "Medium";
  if (s.startsWith("speculative")) return "Speculative";
  return null;
}

function emptySummary() {
  return {
    wins: 0,
    losses: 0,
    pushes: 0,
    settled: 0,
    pending: 0,
    tracked: 0,
    roiUnits: 0,
    total: 0,
    winRate: 0,
    roiPct: 0,
  };
}

function addSummary(acc, s) {
  if (!s) return;
  acc.wins += s.wins || 0;
  acc.losses += s.losses || 0;
  acc.pushes += s.pushes || 0;
  acc.settled += s.settled || 0;
  acc.pending += s.pending || 0;
  acc.tracked += s.tracked || 0;
  acc.roiUnits += Number(s.roiUnits) || 0;
  acc.total += s.total || 0;
}

function finalizeSummary(acc) {
  const settled = acc.settled || 0;
  acc.winRate = settled ? acc.wins / settled : 0;
  acc.roiPct = settled ? (acc.roiUnits / settled) * 100 : 0;
}

/** Merge API `byConfidence` keys into High / Medium / Speculative buckets. */
export function mergeTierSnapshots(byConfidence) {
  const tiers = {
    High: emptySummary(),
    Medium: emptySummary(),
    Speculative: emptySummary(),
  };
  for (const [key, snap] of Object.entries(byConfidence || {})) {
    const t = normalizeConfidenceTier(key);
    if (t && tiers[t]) addSummary(tiers[t], snap);
  }
  for (const k of Object.keys(tiers)) finalizeSummary(tiers[k]);
  return tiers;
}

export function unitsFromOdds(result, oddsAmerican) {
  if (result === "push") return 0;
  if (result === "loss") return -1;
  if (result !== "win") return 0;
  const odds = Number(oddsAmerican);
  if (!Number.isFinite(odds)) return 1;
  if (odds > 0) return odds / 100;
  return 100 / Math.abs(odds);
}

/**
 * Settled takes only, same confidence tier, created in the last 30 days.
 */
export function last30DaysTierSnapshot(performanceData, tierLabel) {
  const recent = performanceData?.recent;
  if (!Array.isArray(recent) || !tierLabel) return null;
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const rows = recent.filter((t) => {
    if (t.status !== "settled") return false;
    const created = Date.parse(t.createdAt || 0);
    if (!Number.isFinite(created) || created < cutoff) return false;
    return normalizeConfidenceTier(t.confidence) === tierLabel;
  });
  if (rows.length === 0) {
    return { wins: 0, losses: 0, pushes: 0, settled: 0, roiUnits: 0, winRate: 0 };
  }
  let wins = 0;
  let losses = 0;
  let pushes = 0;
  let roiUnits = 0;
  for (const t of rows) {
    if (t.result === "win") wins += 1;
    else if (t.result === "loss") losses += 1;
    else if (t.result === "push") pushes += 1;
    roiUnits += unitsFromOdds(t.result, t?.parsedBet?.oddsAmerican);
  }
  const settled = rows.length;
  return {
    wins,
    losses,
    pushes,
    settled,
    roiUnits: Number(roiUnits.toFixed(2)),
    winRate: settled ? wins / settled : 0,
  };
}

export function formatRecordUnits(snap) {
  if (!snap || !snap.settled) return "0-0-0, 0.0u";
  const w = snap.wins || 0;
  const l = snap.losses || 0;
  const p = snap.pushes || 0;
  const u = Number(snap.roiUnits) || 0;
  const sign = u >= 0 ? "+" : "";
  return `${w}-${l}-${p}, ${sign}${u.toFixed(1)}u`;
}

export function displayConfidenceLabel(tier, confidenceLine) {
  if (tier) return tier;
  const raw = String(confidenceLine || "").trim();
  if (!raw) return "Recorded";
  const first = raw.split(/[\s\n—–-]/)[0];
  return first || "Recorded";
}

export function sportDisplayLabel(key) {
  const k = String(key || "").toLowerCase();
  const map = {
    nba: "NBA",
    nfl: "NFL",
    mlb: "MLB",
    f1: "F1",
    tennis: "Tennis",
    golf: "Golf",
    generic: "General",
    unknown: "Unknown",
  };
  if (map[k]) return map[k];
  if (!k) return "—";
  return k.charAt(0).toUpperCase() + k.slice(1);
}
