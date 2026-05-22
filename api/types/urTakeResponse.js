/**
 * URTakeResponse Schema — Structured betting intelligence response
 * 
 * These fields are **in addition to** existing response/responseDeep/take.
 * They are NOT a replacement for the existing contract.
 * 
 * All fields required. Nullable fields explicitly marked.
 */

import { ensureLeanOnStructured } from '../../shared/urTakeLean.js';
import { sanitizeLeanBroTone } from '../_urTakeCoreVoice.js';

/** Strip model artifacts like leading `")` from user-facing strings. */
export function stripBrokenQuoteFragments(text) {
  return String(text || '')
    .replace(/^\s*["')]+[\s.]*/g, '')
    .replace(/(?:^|\n)\s*["')]+(?=\s)/gm, '')
    .trim();
}

export const UR_TAKE_STRUCTURED_SCHEMA = {
  // Headline: "Lean: [direction]. [why in 15 words max]" or "Lean: Pass." / "Lean: No play."
  lean: {
    type: 'string',
    minLength: 8,
    maxLength: 120,
  },

  // The specific play (e.g., "ROBINSON O7.5 REB")
  call: {
    type: 'string',
    minLength: 3,
    maxLength: 100,
  },

  // Confidence level — must match registry confidence tiers
  confidence: {
    type: 'enum',
    values: ['High', 'Medium', 'Speculative'],
  },

  // One-line reason this play is valuable RIGHT NOW
  whyNow: {
    type: 'string',
    minLength: 10,
    maxLength: 8000,
  },

  // Market inefficiency explanation (why mispriced, why now)
  edge: {
    type: 'string',
    minLength: 30,
    maxLength: 500,
  },

  // Type of play
  callType: {
    type: 'enum',
    values: ['prop', 'spread', 'moneyline', 'parlay'],
  },

  // Analysis object — all fields required
  analysis: {
    type: 'object',
    fields: {
      // Specific matchup breakdown
      matchupAnalysis: {
        type: 'string',
        minLength: 10,
        maxLength: 600,
      },
      // How injuries/availability affect this play. Use "No relevant injuries." if N/A
      injuryContext: {
        type: 'string',
        minLength: 10,
        maxLength: 400,
      },
      // How the market is pricing this
      marketContext: {
        type: 'string',
        minLength: 10,
        maxLength: 400,
      },
      // Line movement, sharp money. Use "Line stable; no sharp movement." if N/A
      lineMovement: {
        type: 'string',
        minLength: 10,
        maxLength: 400,
      },
      // Historical stats supporting play. Use "Limited sample size." if data unavailable
      statisticalEdge: {
        type: 'string',
        minLength: 10,
        maxLength: 400,
      },
    },
  },

  // Risk factors. Min 1, max 5. Always at least one caveat.
  caveats: {
    type: 'array',
    minItems: 1,
    maxItems: 5,
    itemType: 'string',
    itemMinLength: 10,
    itemMaxLength: 150,
  },

  // Parlay legs — null if callType !== 'parlay', array of 2-5 objects if parlay
  parlayLegs: {
    type: 'array | null',
    itemStructure: {
      play: {
        type: 'string',
        minLength: 3,
        maxLength: 50,
      },
      rationale: {
        type: 'string',
        minLength: 10,
        maxLength: 150,
      },
      // American odds (e.g., "-110", "+150") OR "TBD" if unknown
      odds: {
        type: 'string',
        pattern: '^([+-]?\\d+|TBD)$',
      },
    },
  },

  // Total parlay odds — null if callType !== 'parlay'
  parlayTotalOdds: {
    type: 'string | null',
    pattern: '^([+-]?\\d+|TBD)$',
  },

  // Sport (map from sportHint)
  sport: {
    type: 'enum',
    values: ['NBA', 'NFL', 'MLB', 'Tennis', 'Golf', 'F1'],
  },

  // ISO 8601 UTC timestamp (allow milliseconds: 2026-05-08T14:30:00.123Z)
  timestamp: {
    type: 'string',
    pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d+)?Z$',
  },
};

/**
 * Map sportHint (lowercase API param) to enum value
 */
export function mapSportHintToEnum(sportHint) {
  const map = {
    nba: 'NBA',
    nfl: 'NFL',
    mlb: 'MLB',
    tennis: 'Tennis',
    golf: 'Golf',
    f1: 'F1',
  };
  return map[sportHint?.toLowerCase?.()] || null;
}

const STRUCTURED_SPORT_ENUM = new Set(['NBA', 'NFL', 'MLB', 'Tennis', 'Golf', 'F1']);

/**
 * Coerce common model slips before schema validation (still runs full validate after).
 */
export function normalizeStructuredUrTakeResponse(response, sportHint) {
  if (!response || typeof response !== 'object' || Array.isArray(response)) {
    return response;
  }
  const out = { ...response };

  if (typeof out.confidence === 'string') {
    const lower = out.confidence.trim().toLowerCase();
    if (lower === 'high') out.confidence = 'High';
    else if (lower === 'medium') out.confidence = 'Medium';
    else if (lower === 'speculative') out.confidence = 'Speculative';
  }

  if (typeof out.callType === 'string') {
    const lower = out.callType.trim().toLowerCase();
    if (['prop', 'spread', 'moneyline', 'parlay'].includes(lower)) {
      out.callType = lower;
    }
  }

  if (out.callType !== 'parlay') {
    if (Array.isArray(out.parlayLegs) && out.parlayLegs.length === 0) {
      out.parlayLegs = null;
      out.parlayTotalOdds = null;
    }
  }

  if (typeof out.timestamp === 'string') {
    let t = out.timestamp.trim();
    if (t && !/Z$/i.test(t) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(t)) {
      t = `${t}Z`;
    }
    out.timestamp = t;
  }
  if (!out.timestamp || typeof out.timestamp !== 'string') {
    out.timestamp = new Date().toISOString();
  }

  if (!out.sport || typeof out.sport !== 'string' || !STRUCTURED_SPORT_ENUM.has(out.sport)) {
    const mapped = mapSportHintToEnum(sportHint);
    if (mapped) out.sport = mapped;
  }
  if (typeof out.sport === 'string') {
    const slug = out.sport.trim().toLowerCase();
    const synonyms = {
      basketball: 'NBA',
      football: 'NFL',
      baseball: 'MLB',
      tennis: 'Tennis',
      golf: 'Golf',
      'formula 1': 'F1',
      'formula1': 'F1',
      f1: 'F1',
      nba: 'NBA',
      nfl: 'NFL',
      mlb: 'MLB',
    };
    if (synonyms[slug] && STRUCTURED_SPORT_ENUM.has(synonyms[slug])) {
      out.sport = synonyms[slug];
    }
  }

  return out;
}

/** Prompt-aligned sentinels — minimum lengths satisfy validateStructuredURTakeResponse. */
const ANALYSIS_SENTINELS = {
  matchupAnalysis:
    'Matchup read from supplied verified context; re-check starters and minutes before locking.',
  injuryContext: 'No relevant injuries for this play.',
  marketContext:
    'Market pricing reflects posted lines in context; recreational flow may differ from sharp.',
  lineMovement: 'Line stable; no recent sharp movement.',
  statisticalEdge: 'Limited sample size or data unavailable outside supplied stats bundle.',
};

const DEFAULT_WHY_NOW =
  'Edge depends on current lines and availability—confirm both before tip-off.';
const DEFAULT_EDGE =
  'Pricing may not fully reflect late-breaking news; verify injury and rotation reports before betting.';
const DEFAULT_CAVEAT =
  'Late scratches, load management, or weather can change this read before lock.';

/**
 * Fill missing/undersized fields so strict validation passes while preserving model text when usable.
 * Downgrades invalid parlay payloads to non-parlay with null parlay fields.
 */
export function repairStructuredForDelivery(response, sportHint) {
  const base =
    response && typeof response === 'object' && !Array.isArray(response)
      ? normalizeStructuredUrTakeResponse({ ...response }, sportHint)
      : normalizeStructuredUrTakeResponse({}, sportHint);

  if (!base || typeof base !== 'object') return base;

  const clip = (s, max) => stripBrokenQuoteFragments(String(s || '')).slice(0, max);
  const padLen = (s, min, max, filler) => {
    let t = clip(s, max).trim();
    if (t.length >= min) return t;
    const add = ` ${filler}`;
    while (t.length < min && t.length + add.length <= max) t = (t + add).trim();
    if (t.length < min) t = clip(filler, max);
    return t.length >= min ? t.slice(0, max) : clip(filler + add, max);
  };

  if (typeof base.call !== 'string' || base.call.trim().length < 3) {
    base.call = 'PASS — confirm lines and availability';
  }
  base.call = clip(base.call, 100);

  const withLean = ensureLeanOnStructured(base);
  base.lean = clip(sanitizeLeanBroTone(String(withLean.lean || '')), 120);
  if (base.lean.length < 8) {
    base.lean = clip('Lean: Pass.', 120);
  }

  if (!['High', 'Medium', 'Speculative'].includes(base.confidence)) {
    base.confidence = 'Medium';
  }

  if (!['prop', 'spread', 'moneyline', 'parlay'].includes(base.callType)) {
    base.callType = 'prop';
  }

  {
    let w = String(base.whyNow ?? '').trim();
    if (w.length < 10) {
      w = `${w ? `${w} ` : ''}${DEFAULT_WHY_NOW}`.trim();
    }
    base.whyNow = w;
  }
  base.edge = padLen(base.edge, 30, 500, DEFAULT_EDGE);

  const analysis = base.analysis && typeof base.analysis === 'object' ? { ...base.analysis } : {};
  for (const key of Object.keys(ANALYSIS_SENTINELS)) {
    const v = analysis[key];
    const str = typeof v === 'string' ? v.trim() : '';
    const maxLen = key === 'matchupAnalysis' ? 600 : 400;
    if (str.length < 10) {
      analysis[key] = clip(ANALYSIS_SENTINELS[key], maxLen);
    } else {
      analysis[key] = clip(str, maxLen);
    }
  }
  base.analysis = analysis;

  let caveats = Array.isArray(base.caveats) ? [...base.caveats] : [];
  caveats = caveats
    .filter((c) => typeof c === 'string')
    .map((c) => padLen(c, 10, 150, DEFAULT_CAVEAT))
    .slice(0, 5);
  if (caveats.length === 0) caveats = [clip(DEFAULT_CAVEAT, 150)];
  base.caveats = caveats;

  if (base.callType === 'parlay') {
    const legs = Array.isArray(base.parlayLegs) ? base.parlayLegs : [];
    const legsOk =
      legs.length >= 2 &&
      legs.length <= 5 &&
      legs.every(
        (leg) =>
          leg &&
          typeof leg.play === 'string' &&
          leg.play.length >= 3 &&
          typeof leg.rationale === 'string' &&
          leg.rationale.length >= 10 &&
          typeof leg.odds === 'string' &&
          /^([+-]?\d+|TBD)$/.test(leg.odds),
      );
    const oddsOk =
      typeof base.parlayTotalOdds === 'string' &&
      /^([+-]?\d+|TBD)$/.test(base.parlayTotalOdds);
    if (!legsOk || !oddsOk) {
      base.callType = 'prop';
      base.parlayLegs = null;
      base.parlayTotalOdds = null;
    }
  } else {
    base.parlayLegs = null;
    base.parlayTotalOdds = null;
  }

  if (!base.sport || !STRUCTURED_SPORT_ENUM.has(base.sport)) {
    const mapped = mapSportHintToEnum(sportHint);
    if (mapped) base.sport = mapped;
    else if (String(sportHint || '').toLowerCase().includes('tennis')) base.sport = 'Tennis';
    else base.sport = 'NBA';
  }

  if (
    typeof base.timestamp !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(base.timestamp)
  ) {
    base.timestamp = new Date().toISOString();
  }

  return base;
}

/**
 * Validate structured response against schema
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
export function validateStructuredURTakeResponse(response) {
  const errors = [];

  // Required top-level fields
  const requiredFields = [
    'lean',
    'call',
    'confidence',
    'whyNow',
    'edge',
    'callType',
    'analysis',
    'caveats',
    'sport',
    'timestamp',
  ];

  for (const field of requiredFields) {
    if (!(field in response)) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Validate lean
  if (response.lean !== undefined) {
    if (typeof response.lean !== 'string') {
      errors.push(`lean: must be string, got ${typeof response.lean}`);
    } else if (response.lean.length < 8 || response.lean.length > 120) {
      errors.push(
        `lean: length must be 8-120, got ${response.lean.length}`
      );
    } else if (!/^Lean:\s*.+\./.test(response.lean.trim())) {
      errors.push(`lean: must match Lean: [direction]. [why] format`);
    }
  }

  // Validate call
  if (response.call !== undefined) {
    if (typeof response.call !== 'string') {
      errors.push(`call: must be string, got ${typeof response.call}`);
    } else if (response.call.length < 3 || response.call.length > 100) {
      errors.push(
        `call: length must be 3-100, got ${response.call.length}`
      );
    }
  }

  // Validate confidence
  if (response.confidence !== undefined) {
    if (!['High', 'Medium', 'Speculative'].includes(response.confidence)) {
      errors.push(
        `confidence: must be "High", "Medium", or "Speculative", got "${response.confidence}"`
      );
    }
  }

  // Validate whyNow
  if (response.whyNow !== undefined) {
    if (typeof response.whyNow !== 'string') {
      errors.push(`whyNow: must be string`);
    } else if (
      response.whyNow.length < 10 ||
      response.whyNow.length > 8000
    ) {
      errors.push(
        `whyNow: length must be 10-8000, got ${response.whyNow.length}`
      );
    }
  }

  // Validate edge
  if (response.edge !== undefined) {
    if (typeof response.edge !== 'string') {
      errors.push(`edge: must be string`);
    } else if (response.edge.length < 30 || response.edge.length > 500) {
      errors.push(
        `edge: length must be 30-500, got ${response.edge.length}`
      );
    }
  }

  // Validate callType
  if (response.callType !== undefined) {
    if (
      !['prop', 'spread', 'moneyline', 'parlay'].includes(
        response.callType
      )
    ) {
      errors.push(
        `callType: must be "prop", "spread", "moneyline", or "parlay", got "${response.callType}"`
      );
    }
  }

  // Validate analysis object
  if (response.analysis !== undefined) {
    if (typeof response.analysis !== 'object' || response.analysis === null) {
      errors.push(`analysis: must be object`);
    } else {
      const analysisFields = [
        'matchupAnalysis',
        'injuryContext',
        'marketContext',
        'lineMovement',
        'statisticalEdge',
      ];
      for (const field of analysisFields) {
        if (!(field in response.analysis)) {
          errors.push(`analysis.${field}: required`);
        } else if (typeof response.analysis[field] !== 'string') {
          errors.push(`analysis.${field}: must be string`);
        } else {
          const len = response.analysis[field].length;
          // Flexible length based on field
          const minLen = 10;
          const maxLen = field === 'matchupAnalysis' ? 600 : 400;
          if (len < minLen || len > maxLen) {
            errors.push(
              `analysis.${field}: length must be ${minLen}-${maxLen}, got ${len}`
            );
          }
        }
      }
    }
  }

  // Validate caveats
  if (response.caveats !== undefined) {
    if (!Array.isArray(response.caveats)) {
      errors.push(`caveats: must be array`);
    } else {
      if (
        response.caveats.length < 1 ||
        response.caveats.length > 5
      ) {
        errors.push(
          `caveats: must have 1-5 items, got ${response.caveats.length}`
        );
      }
      response.caveats.forEach((caveat, idx) => {
        if (typeof caveat !== 'string') {
          errors.push(`caveats[${idx}]: must be string`);
        } else if (
          caveat.length < 10 ||
          caveat.length > 150
        ) {
          errors.push(
            `caveats[${idx}]: length must be 10-150, got ${caveat.length}`
          );
        }
      });
    }
  }

  // Validate parlay fields (must align with callType)
  if (response.callType === 'parlay') {
    // Must have parlayLegs and parlayTotalOdds
    if (!response.parlayLegs || !Array.isArray(response.parlayLegs)) {
      errors.push(
        `parlayLegs: required when callType === "parlay", must be array`
      );
    } else {
      if (
        response.parlayLegs.length < 2 ||
        response.parlayLegs.length > 5
      ) {
        errors.push(
          `parlayLegs: must have 2-5 items, got ${response.parlayLegs.length}`
        );
      }
      response.parlayLegs.forEach((leg, idx) => {
        if (typeof leg.play !== 'string' || leg.play.length < 3) {
          errors.push(`parlayLegs[${idx}].play: must be string 3+ chars`);
        }
        if (
          typeof leg.rationale !== 'string' ||
          leg.rationale.length < 10
        ) {
          errors.push(
            `parlayLegs[${idx}].rationale: must be string 10+ chars`
          );
        }
        if (
          typeof leg.odds !== 'string' ||
          !/^([+-]?\d+|TBD)$/.test(leg.odds)
        ) {
          errors.push(
            `parlayLegs[${idx}].odds: must be "-110" or "TBD", got "${leg.odds}"`
          );
        }
      });
    }

    if (
      !response.parlayTotalOdds ||
      typeof response.parlayTotalOdds !== 'string' ||
      !/^([+-]?\d+|TBD)$/.test(response.parlayTotalOdds)
    ) {
      errors.push(
        `parlayTotalOdds: required when callType === "parlay", got "${response.parlayTotalOdds}"`
      );
    }
  } else {
    // Non-parlay: parlayLegs and parlayTotalOdds must be null
    if (response.parlayLegs !== null && response.parlayLegs !== undefined) {
      errors.push(`parlayLegs: must be null when callType !== "parlay"`);
    }
    if (
      response.parlayTotalOdds !== null &&
      response.parlayTotalOdds !== undefined
    ) {
      errors.push(
        `parlayTotalOdds: must be null when callType !== "parlay"`
      );
    }
  }

  // Validate sport
  if (response.sport !== undefined) {
    if (
      !['NBA', 'NFL', 'MLB', 'Tennis', 'Golf', 'F1'].includes(
        response.sport
      )
    ) {
      errors.push(
        `sport: must be one of [NBA, NFL, MLB, Tennis, Golf, F1], got "${response.sport}"`
      );
    }
  }

  // Validate timestamp
  if (response.timestamp !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(response.timestamp)) {
      errors.push(
        `timestamp: must be ISO 8601 UTC (e.g., "2026-05-08T14:30:00Z"), got "${response.timestamp}"`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
