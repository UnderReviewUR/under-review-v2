import { buildGolfCourseOverview } from "./golfCourseProfile.js";

export function shortGolfName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : String(fullName || "").trim();
}

export function parseGolfScore(score) {
  const raw = String(score ?? "").trim();
  if (!raw || raw === "—" || raw === "-") return null;
  if (raw === "E") return 0;
  if (/^[+-]/.test(raw)) {
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseGolfPosition(pos) {
  const s = String(pos || "").trim().toUpperCase();
  if (!s || s === "CUT" || s === "WD" || s === "DQ") return 999;
  const m = s.match(/T?(\d+)/);
  return m ? Number(m[1]) : 999;
}

function dedupeByName(rows, limit) {
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    const key = String(row?.name || "").trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * @param {object | null | undefined} golfData
 * @param {number} [limit]
 */
export function buildGolfStandingsRows(golfData, limit = 15) {
  const lb = Array.isArray(golfData?.currentEvent?.leaderboard)
    ? golfData.currentEvent.leaderboard
    : [];
  return lb.slice(0, limit).map((p, i) => ({
    position: p?.position || i + 1,
    name: String(p?.name || p?.player || "").trim(),
    shortName: shortGolfName(p?.name || p?.player),
    score: String(p?.score ?? "—").trim() || "—",
    today: String(p?.today ?? "").trim(),
    thru: String(p?.thru ?? "").trim(),
    country: String(p?.country ?? "").trim(),
  }));
}

/**
 * Heuristic daily tips, sleepers, and faders from board data only.
 * @param {object | null | undefined} golfData
 */
export function buildGolfDailyAngles(golfData) {
  const overview = buildGolfCourseOverview(golfData);
  const lb = Array.isArray(golfData?.currentEvent?.leaderboard)
    ? golfData.currentEvent.leaderboard
    : [];
  const odds = Array.isArray(golfData?.odds?.outrights) ? golfData.odds.outrights : [];
  const rankings = Array.isArray(golfData?.rankings) ? golfData.rankings : [];
  const round = String(golfData?.currentEvent?.round || "").toLowerCase();

  const tips = [];
  if (overview.styleBlurb) tips.push(overview.styleBlurb);
  if (overview.statsBlurb) tips.push(overview.statsBlurb);
  if (overview.weatherLine) tips.push(overview.weatherLine);

  if (/round\s*2|r2/.test(round)) {
    tips.push("Moving day — players outside the top 10 with a clean card often carry live placement value.");
  } else if (/round\s*3|r3/.test(round)) {
    tips.push("Weekend focus: ball-strikers with a scoring floor beat volatile chasers near the cut.");
  } else if (/round\s*4|r4|final/.test(round)) {
    tips.push("Sunday volatility spikes — placement and matchup reads over thin-margin outright longshots.");
  } else if (lb.length > 0) {
    tips.push("Attack course-fit vs market chalk before the next leaderboard move.");
  }

  const rankByLast = new Map();
  for (const r of rankings) {
    const name = String(r?.name || "").trim();
    const last = name.split(/\s+/).pop()?.toLowerCase();
    if (last && r?.rank != null) rankByLast.set(last, Number(r.rank));
  }

  const sleepers = [];
  const faders = [];

  for (const p of lb) {
    const name = String(p?.name || p?.player || "").trim();
    if (!name) continue;
    const pos = parseGolfPosition(p.position);
    const score = parseGolfScore(p.score);
    const today = parseGolfScore(p.today);
    const sg = Number(p.sg_total);

    if (sleepers.length < 4 && pos >= 12 && pos <= 50 && score != null && score < 0) {
      sleepers.push({
        name,
        reason:
          today != null && today < 0
            ? `T${pos} at ${p.score} with ${p.today} today — live add/placement angle.`
            : `T${pos} at ${p.score} — still in range if ball-striking holds.`,
      });
    }

    if (sleepers.length < 4 && pos > 15 && Number.isFinite(sg) && sg >= 0.4) {
      sleepers.push({
        name,
        reason: `T${pos} but season SG (${sg.toFixed(1)}) profiles better than the board.`,
      });
    }

    if (faders.length < 4 && pos <= 5 && score != null && score > 0) {
      faders.push({
        name,
        reason: `T${pos} at +${score} — leader box without red numbers; fade outright/placement.`,
      });
    } else if (faders.length < 4 && pos <= 8 && today != null && today >= 2) {
      faders.push({
        name,
        reason: `T${pos} with ${p.today} today — volatility without a scoring floor.`,
      });
    }
  }

  if (sleepers.length < 2 && lb.length < 8) {
    for (const o of odds) {
      const american = Number(o?.odds);
      if (!Number.isFinite(american) || american < 2500) continue;
      const name = String(o?.player || "").trim();
      if (!name) continue;
      const last = name.split(/\s+/).pop()?.toLowerCase();
      const wr = last ? rankByLast.get(last) : null;
      if (wr && wr <= 60) {
        sleepers.push({
          name,
          reason: `World rank ${wr} at +${american} — longshot with a real profile.`,
        });
        if (sleepers.length >= 3) break;
      }
    }
  }

  for (const o of odds.slice(0, 12)) {
    const american = Number(o?.odds);
    const name = String(o?.player || "").trim();
    if (!name || !Number.isFinite(american) || american > 1800) continue;
    const row = lb.find((p) => String(p?.name || "").toLowerCase() === name.toLowerCase());
    if (!row) continue;
    const pos = parseGolfPosition(row.position);
    const score = parseGolfScore(row.score);
    if (faders.length < 4 && pos <= 12 && score != null && score >= 0) {
      faders.push({
        name,
        reason: `Chalk (+${american}) at ${row.score} — thin margin for error this week.`,
      });
    }
  }

  return {
    overview,
    tips: tips.filter(Boolean).slice(0, 4),
    sleepers: dedupeByName(sleepers, 3),
    faders: dedupeByName(faders, 3),
  };
}
