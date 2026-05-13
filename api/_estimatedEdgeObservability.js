/**
 * Estimated Edge (EE) observability: durable ledger meta, log-friendly fields, dashboard aggregates.
 */

/** @param {unknown} v */
function firstFiniteNumberInString(v) {
  const m = String(v ?? "").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = Number(m[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {number|null|undefined} fairLineNumeric
 * @param {number|null|undefined} actualLine
 * @returns {number|null}
 */
export function computeMissDistance(fairLineNumeric, actualLine) {
  if (fairLineNumeric == null || actualLine == null) return null;
  const f = Number(fairLineNumeric);
  const a = Number(actualLine);
  if (!Number.isFinite(f) || !Number.isFinite(a)) return null;
  return Math.abs(a - f);
}

/**
 * Snapshot of EE fields stored on each ledger row (`estimatedEdgeMeta`).
 * @param {object|null|undefined} estimatedEdge
 */
export function buildEstimatedEdgeLedgerMeta(estimatedEdge) {
  if (!estimatedEdge || estimatedEdge.source !== "estimated_edge") return null;

  const projection = estimatedEdge.projection;
  const fairLine = estimatedEdge.fairLine;
  const leanRead = estimatedEdge.leanRead;

  const projectionStr = projection != null ? String(projection).trim() : "";
  const fairLineStr = fairLine != null ? String(fairLine).trim() : "";
  const leanStr = leanRead != null ? String(leanRead).trim() : "";

  const projectionPresent = Boolean(projectionStr);
  const fairLinePresent = Boolean(fairLineStr);
  const leanReadPresent = Boolean(leanStr);

  return {
    v: 1,
    sport: String(estimatedEdge.sport || "").toLowerCase() || null,
    marketType: estimatedEdge.marketType ?? null,
    subject: estimatedEdge.subject ?? null,
    dataQuality: estimatedEdge.dataQuality ?? null,
    dataQualityReason: String(estimatedEdge.dataQualityReason || "").slice(0, 500),
    confidence: estimatedEdge.confidence ?? null,
    projectionPresent,
    fairLinePresent,
    leanReadPresent,
    leanReadExcerpt: leanStr ? leanStr.slice(0, 280) : null,
    fairLineNumeric: fairLinePresent ? firstFiniteNumberInString(fairLineStr) : null,
    projectionNumeric: projectionPresent ? firstFiniteNumberInString(projectionStr) : null,
    /** @type {"yes"|"no"|null} */
    userBetSignal: null,
    outcome: null,
  };
}

/**
 * @param {object|null|undefined} takeRecord
 * @param {object|null|undefined} estimatedEdge
 */
export function attachEstimatedEdgeLedgerMeta(takeRecord, estimatedEdge) {
  const meta = buildEstimatedEdgeLedgerMeta(estimatedEdge);
  if (!takeRecord || !meta) return takeRecord;
  return { ...takeRecord, estimatedEdgeMeta: meta };
}

function deriveUserBetSignal(t) {
  const m = t?.estimatedEdgeMeta;
  if (m?.userBetSignal === "yes" || m?.userBetSignal === "no") return m.userBetSignal;
  if (t?.betSignal && typeof t.betSignal === "object" && "betYes" in t.betSignal) {
    return t.betSignal.betYes ? "yes" : "no";
  }
  return null;
}

/** Thin takes where copy reads as a pass / no-play (heuristic for "mostly passes"). */
export function isThinPassLikeHeuristic(take, meta) {
  if (!take || !meta || meta.dataQuality !== "thin") return false;
  const play = String(take.playLine || "").toLowerCase();
  if (/\bpass\b|no play|no bet|sit out|sit this|fade\b/.test(play)) return true;
  const ex = String(meta.leanReadExcerpt || "").toLowerCase();
  if (ex && /\bpass\b|no play|no bet/.test(ex)) return true;
  const oc = meta.outcome;
  if (oc && String(oc.result || "").toLowerCase() === "pass") return true;
  return false;
}

function emptyDqBucket() {
  return {
    takes: 0,
    betYes: 0,
    betNo: 0,
    betUnknown: 0,
    graded: 0,
    win: 0,
    loss: 0,
    push: 0,
    pass: 0,
    missSum: 0,
    missCount: 0,
    missSumWithProjection: 0,
    missCountWithProjection: 0,
  };
}

function finalizeDqBucket(b) {
  const answered = b.betYes + b.betNo;
  const settledSport = b.win + b.loss + b.push;
  return {
    ...b,
    betYesRateAmongAnswered: answered ? Number((b.betYes / answered).toFixed(4)) : null,
    gradeRateAmongTakes: b.takes ? Number((b.graded / b.takes).toFixed(4)) : null,
    winRateAmongGradedSportResults:
      settledSport > 0 ? Number((b.win / settledSport).toFixed(4)) : null,
    avgMissDistanceWhenPresent:
      b.missCount > 0 ? Number((b.missSum / b.missCount).toFixed(4)) : null,
    avgMissDistanceWhenProjectionPresent:
      b.missCountWithProjection > 0
        ? Number((b.missSumWithProjection / b.missCountWithProjection).toFixed(4))
        : null,
  };
}

/**
 * Dashboard-ready counters from ledger rows (Pro performance snapshot).
 * @param {object[]} takes
 */
export function computeEstimatedEdgeDashboardStats(takes) {
  const rows = Array.isArray(takes) ? takes : [];
  const eeTakes = rows.filter((t) => t && t.estimatedEdgeMeta && typeof t.estimatedEdgeMeta === "object");

  const bySport = {};
  const byDataQuality = {};

  let thinTakes = 0;
  let thinPassLike = 0;

  for (const t of eeTakes) {
    const m = t.estimatedEdgeMeta;
    const sport = m.sport || "unknown";
    const dqRaw = m.dataQuality != null ? String(m.dataQuality) : "unknown";
    const dq = ["strong", "usable", "thin"].includes(dqRaw) ? dqRaw : "unknown";

    bySport[sport] = (bySport[sport] || 0) + 1;

    if (!byDataQuality[dq]) byDataQuality[dq] = emptyDqBucket();
    const b = byDataQuality[dq];
    b.takes += 1;

    const sig = deriveUserBetSignal(t);
    if (sig === "yes") b.betYes += 1;
    else if (sig === "no") b.betNo += 1;
    else b.betUnknown += 1;

    const oc = m.outcome;
    if (oc && oc.result) {
      b.graded += 1;
      const r = String(oc.result).toLowerCase();
      if (r === "win") b.win += 1;
      else if (r === "loss") b.loss += 1;
      else if (r === "push") b.push += 1;
      else if (r === "pass") b.pass += 1;

      const md = oc.missDistance;
      if (typeof md === "number" && Number.isFinite(md)) {
        b.missSum += md;
        b.missCount += 1;
        if (m.projectionPresent) {
          b.missSumWithProjection += md;
          b.missCountWithProjection += 1;
        }
      }
    }

    if (dq === "thin") {
      thinTakes += 1;
      if (isThinPassLikeHeuristic(t, m)) thinPassLike += 1;
    }
  }

  const answeredAll = eeTakes.reduce(
    (acc, t) => {
      const s = deriveUserBetSignal(t);
      if (s === "yes") acc.yes += 1;
      else if (s === "no") acc.no += 1;
      else acc.unk += 1;
      return acc;
    },
    { yes: 0, no: 0, unk: 0 },
  );
  const denom = answeredAll.yes + answeredAll.no;

  return {
    eeTakeCount: eeTakes.length,
    bySport,
    byDataQuality: Object.fromEntries(
      Object.entries(byDataQuality).map(([k, v]) => [k, finalizeDqBucket(v)]),
    ),
    overallBetYesRateAmongAnswered: denom ? Number((answeredAll.yes / denom).toFixed(4)) : null,
    thinHeuristic: {
      thinTakes,
      thinPassLikeCount: thinPassLike,
      thinPassLikeRate: thinTakes ? Number((thinPassLike / thinTakes).toFixed(4)) : null,
    },
  };
}
