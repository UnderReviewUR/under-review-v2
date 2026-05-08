/**
 * URTakeResponse Schema — Structured betting intelligence response
 * 
 * These fields are **in addition to** existing response/responseDeep/take.
 * They are NOT a replacement for the existing contract.
 * 
 * All fields required. Nullable fields explicitly marked.
 */

export const UR_TAKE_STRUCTURED_SCHEMA = {
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
    maxLength: 150,
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

/**
 * Validate structured response against schema
 * Returns { valid: true } or { valid: false, errors: [...] }
 */
export function validateStructuredURTakeResponse(response) {
  const errors = [];

  // Required top-level fields
  const requiredFields = [
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
      response.whyNow.length > 150
    ) {
      errors.push(
        `whyNow: length must be 10-150, got ${response.whyNow.length}`
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
