/**
 * Offline WC live checkpoint lookup — score + minute + market → direction + plausible drift.
 * Used by line-movement synthesis, Talk repair, and post-gen QA (not LLM guesses).
 */

import { parseAmericanOddsValue } from "./formatOddsAmerican.js";

/** @typedef {"early"|"mid"|"late"|"unknown"} WcCheckpointMinuteBucket */
/** @typedef {"ml_90min"|"to_advance"|"total_over"|"total_under"|"draw"} WcCheckpointMarketKind */

export const WC_CHECKPOINT_MINUTE = {
  EARLY: /** @type {const} */ ("early"),
  MID: /** @type {const} */ ("mid"),
  LATE: /** @type {const} */ ("late"),
  UNKNOWN: /** @type {const} */ ("unknown"),
};

export const WC_CHECKPOINT_MARKET = {
  ML_90MIN: /** @type {const} */ ("ml_90min"),
  TO_ADVANCE: /** @type {const} */ ("to_advance"),
  TOTAL_OVER: /** @type {const} */ ("total_over"),
  TOTAL_UNDER: /** @type {const} */ ("total_under"),
  DRAW: /** @type {const} */ ("draw"),
};

/** Drift multiplier on |american| for heavy favorites at 0-0 (scoreless). */
const ML_DRIFT_FACTOR_BY_BUCKET = {
  [WC_CHECKPOINT_MINUTE.EARLY]: 0.94,
  [WC_CHECKPOINT_MINUTE.MID]: 0.72,
  [WC_CHECKPOINT_MINUTE.LATE]: 0.58,
  [WC_CHECKPOINT_MINUTE.UNKNOWN]: 0.78,
};

const OVER_DRIFT_FACTOR_BY_BUCKET = {
  [WC_CHECKPOINT_MINUTE.EARLY]: 0.96,
  [WC_CHECKPOINT_MINUTE.MID]: 0.78,
  [WC_CHECKPOINT_MINUTE.LATE]: 0.62,
  [WC_CHECKPOINT_MINUTE.UNKNOWN]: 0.82,
};

/**
 * @param {string} question
 * @returns {WcCheckpointMinuteBucket}
 */
export function parseWcLiveCheckpointMinuteBucket(question) {
  const q = String(question || "");

  if (/\b(?:half[- ]?time|halftime)\b/i.test(q)) {
    return WC_CHECKPOINT_MINUTE.MID;
  }
  if (/\b(?:around|about)\s+(?:the\s+)?(?:30(?:th)?(?:\s*(?:minute|min(?:ute)?s?)?)?|half\s*hour)\b/i.test(q)) {
    return WC_CHECKPOINT_MINUTE.MID;
  }
  if (/\b(?:the\s+)?30(?:th)?\s*(?:minute|min(?:ute)?s?)\b/i.test(q)) {
    return WC_CHECKPOINT_MINUTE.MID;
  }
  if (/\bbefore\s+(?:the\s+)?(?:30\s*'?|30\s*minutes?)\b/i.test(q)) {
    return WC_CHECKPOINT_MINUTE.EARLY;
  }

  const minMatch =
    q.match(/\b(\d{1,2})\s*(?:'|′|mins?\b|minutes?\b)/i) ||
    q.match(/\b(?:at|around|about|~)\s*(\d{1,2})\s*(?:mins?|minutes?)\b/i) ||
    q.match(/\b(?:first|opening)\s+(\d{1,2})\s*mins?\b/i);
  if (minMatch) {
    const n = Number.parseInt(minMatch[1], 10);
    if (Number.isFinite(n)) {
      if (n <= 15) return WC_CHECKPOINT_MINUTE.EARLY;
      if (n <= 45) return WC_CHECKPOINT_MINUTE.MID;
      return WC_CHECKPOINT_MINUTE.LATE;
    }
  }
  if (/\b(?:half\s*hour|30\s*mins?|~30)\b/i.test(q)) return WC_CHECKPOINT_MINUTE.MID;
  if (/\b(?:5\s*mins?\s+in|opening\s+5|early\s+on|first\s+15)\b/i.test(q)) {
    return WC_CHECKPOINT_MINUTE.EARLY;
  }
  if (/\b(?:60\s*mins?|65\s*'|70\s*'|75\s*'|after\s+60|late\s+in\s+the\s+half)\b/i.test(q)) {
    return WC_CHECKPOINT_MINUTE.LATE;
  }
  return WC_CHECKPOINT_MINUTE.UNKNOWN;
}

/**
 * Minute label for copy — never collapse 60'+ into "30' checkpoint".
 * @param {WcCheckpointMinuteBucket} bucket
 */
export function wcCheckpointMinuteLabel(bucket) {
  if (bucket === WC_CHECKPOINT_MINUTE.EARLY) return "0-0 early (~5-15')";
  if (bucket === WC_CHECKPOINT_MINUTE.MID) return "0-0 ~30'";
  if (bucket === WC_CHECKPOINT_MINUTE.LATE) return "0-0 60'+";
  return "0-0 scoreless";
}

/**
 * Priority: to-advance → explicit moneyline/ML → to win → totals → draw → default ML.
 * @param {string} question
 * @returns {WcCheckpointMarketKind}
 */
export function resolveWcLineMovementMarketKind(question) {
  const q = String(question || "");
  if (/\bto advance\b/i.test(q)) return WC_CHECKPOINT_MARKET.TO_ADVANCE;
  if (/\b(?:money\s*line|moneyline|\bml\b)\b/i.test(q)) return WC_CHECKPOINT_MARKET.ML_90MIN;
  if (/\bto win\b/i.test(q) && !/\bto advance\b/i.test(q)) {
    return WC_CHECKPOINT_MARKET.ML_90MIN;
  }
  if (/\bover\s+\d+(?:\.\d+)?\s*(?:goals?|in regulation)?\b/i.test(q)) {
    return WC_CHECKPOINT_MARKET.TOTAL_OVER;
  }
  if (/\bunder\s+\d+(?:\.\d+)?\s*(?:goals?|in regulation)?\b/i.test(q)) {
    return WC_CHECKPOINT_MARKET.TOTAL_UNDER;
  }
  if (/\b(?:the )?draw\b/i.test(q)) return WC_CHECKPOINT_MARKET.DRAW;
  return WC_CHECKPOINT_MARKET.ML_90MIN;
}

/**
 * Human label — never conflate ML with to-advance.
 * @param {WcCheckpointMarketKind} kind
 */
export function wcCheckpointMarketLabel(kind) {
  switch (kind) {
    case WC_CHECKPOINT_MARKET.TO_ADVANCE:
      return "to advance (ET/pens included)";
    case WC_CHECKPOINT_MARKET.TOTAL_OVER:
      return "match total Over";
    case WC_CHECKPOINT_MARKET.TOTAL_UNDER:
      return "match total Under";
    case WC_CHECKPOINT_MARKET.DRAW:
      return "regulation Draw (1X2)";
    default:
      return "90-minute moneyline (regulation only)";
  }
}

/**
 * @param {number | string | null | undefined} american
 * @param {WcCheckpointMinuteBucket} [bucket]
 * @param {WcCheckpointMarketKind} [marketKind]
 * @returns {string | null}
 */
export function estimateCheckpointDriftAmerican(american, bucket = WC_CHECKPOINT_MINUTE.MID, marketKind = WC_CHECKPOINT_MARKET.ML_90MIN) {
  const n = parseAmericanOddsValue(american);
  if (n == null || n >= 0) return null;

  if (marketKind === WC_CHECKPOINT_MARKET.TO_ADVANCE) {
    return null;
  }

  const factor =
    marketKind === WC_CHECKPOINT_MARKET.TOTAL_OVER
      ? OVER_DRIFT_FACTOR_BY_BUCKET[bucket] ?? OVER_DRIFT_FACTOR_BY_BUCKET.unknown
      : ML_DRIFT_FACTOR_BY_BUCKET[bucket] ?? ML_DRIFT_FACTOR_BY_BUCKET.unknown;

  const drifted = Math.round(Math.abs(n) * factor);
  const floor = bucket === WC_CHECKPOINT_MINUTE.EARLY ? Math.abs(n) - 25 : Math.abs(n) - 40;
  const minJuice = bucket === WC_CHECKPOINT_MINUTE.EARLY ? Math.max(110, Math.abs(n) - 30) : 110;
  return `-${Math.max(minJuice, Math.min(drifted, Math.max(minJuice, floor)))}`;
}

/**
 * Build ML mid-checkpoint row drift target from factor table.
 * @param {number} openAmerican
 */
function mlMidDriftTarget(openAmerican) {
  return (
    estimateCheckpointDriftAmerican(openAmerican, WC_CHECKPOINT_MINUTE.MID, WC_CHECKPOINT_MARKET.ML_90MIN) ||
    String(openAmerican)
  );
}

/**
 * Curated scenarios — favorites from ~-200 through ~-700 at common checkpoints.
 * @type {Array<{ id: string, openAmerican: number, bucket: WcCheckpointMinuteBucket, market: WcCheckpointMarketKind, score: string, direction: string, driftTarget?: string, note: string }>}
 */
export const WC_CHECKPOINT_SCENARIO_TABLE = [
  {
    id: "ml_mid_200_0_0",
    openAmerican: -200,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: mlMidDriftTarget(-200),
    note: "Moderate favorite — smaller absolute drift at ~30'.",
  },
  {
    id: "ml_mid_350_0_0",
    openAmerican: -350,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: mlMidDriftTarget(-350),
    note: "Solid favorite lengthens at 0-0 ~30'.",
  },
  {
    id: "ml_mid_450_0_0",
    openAmerican: -450,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: mlMidDriftTarget(-450),
    note: "Heavy favorite — meaningful drift, still not -650+.",
  },
  {
    id: "fra_ml_early_0_0",
    openAmerican: -525,
    bucket: WC_CHECKPOINT_MINUTE.EARLY,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: "-494",
    note: "Small lengthening — most of the game left.",
  },
  {
    id: "fra_ml_mid_0_0",
    openAmerican: -525,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: "-378",
    note: "Moderate drift out — not -650+.",
  },
  {
    id: "fra_ml_late_0_0",
    openAmerican: -525,
    bucket: WC_CHECKPOINT_MINUTE.LATE,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: "-305",
    note: "Larger drift — clock pressure on the favorite.",
  },
  {
    id: "ml_mid_600_0_0",
    openAmerican: -600,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: mlMidDriftTarget(-600),
    note: "Knockout-tier juice — drifts out at checkpoint, never tightens to -650+ from -600 open.",
  },
  {
    id: "ml_mid_669_0_0",
    openAmerican: -669,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: mlMidDriftTarget(-669),
    note: "Germany-tier heavy favorite at ~30' scoreless.",
  },
  {
    id: "ml_mid_700_0_0",
    openAmerican: -700,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.ML_90MIN,
    score: "0-0",
    direction: "drift_out",
    driftTarget: mlMidDriftTarget(-700),
    note: "Extreme favorite — largest mid-checkpoint lengthening band.",
  },
  {
    id: "fra_advance_mid_0_0",
    openAmerican: -650,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.TO_ADVANCE,
    score: "0-0",
    direction: "shorten_or_hold",
    note: "To-advance often holds or shortens — ET/pens still expected.",
  },
  {
    id: "fra_o15_mid_0_0",
    openAmerican: -525,
    bucket: WC_CHECKPOINT_MINUTE.MID,
    market: WC_CHECKPOINT_MARKET.TOTAL_OVER,
    score: "0-0",
    direction: "drift_out",
    driftTarget: "-410",
    note: "Over drifts out at 0-0 — less time for goals.",
  },
];

/**
 * @param {{
 *   american?: number | string | null,
 *   bucket?: WcCheckpointMinuteBucket,
 *   marketKind?: WcCheckpointMarketKind,
 *   scoreState?: string,
 * }} input
 */
export function lookupWcCheckpointScenario(input = {}) {
  const american = parseAmericanOddsValue(input.american);
  const bucket = input.bucket || WC_CHECKPOINT_MINUTE.MID;
  const marketKind = input.marketKind || WC_CHECKPOINT_MARKET.ML_90MIN;
  const scoreState = String(input.scoreState || "0-0").trim();

  if (scoreState !== "0-0" && !/scoreless|nil/i.test(scoreState)) {
    return null;
  }

  let best = null;
  let bestDist = Infinity;
  for (const row of WC_CHECKPOINT_SCENARIO_TABLE) {
    if (row.market !== marketKind || row.bucket !== bucket) continue;
    if (american == null) {
      return row;
    }
    const dist = Math.abs(Math.abs(american) - Math.abs(row.openAmerican));
    if (dist < bestDist) {
      bestDist = dist;
      best = row;
    }
  }

  if (best && american != null && bestDist > 180) {
    return {
      ...best,
      driftTarget:
        estimateCheckpointDriftAmerican(american, bucket, marketKind) || best.driftTarget,
      note: best.note,
    };
  }

  return best;
}

/** @deprecated use estimateCheckpointDriftAmerican */
export function estimateFavoriteDriftOutAmerican(american, bucket = WC_CHECKPOINT_MINUTE.MID) {
  return estimateCheckpointDriftAmerican(american, bucket, WC_CHECKPOINT_MARKET.ML_90MIN);
}
