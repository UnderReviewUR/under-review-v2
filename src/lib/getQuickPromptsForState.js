/**
 * Board-style event phase for quick-prompt chips (not necessarily 1:1 with API enums).
 * @typedef {"pre"|"live"|"final"|"mixed"|"unknown"|"futures"} BoardEventState
 */

/**
 * @param {Array<{ state?: string }> | null | undefined} games
 * @returns {BoardEventState}
 */
export function deriveDominantGameState(games) {
  if (!Array.isArray(games) || games.length === 0) return "unknown";

  let inC = 0;
  let postC = 0;
  let preC = 0;
  for (const g of games) {
    const s = String(g?.state || "").toLowerCase();
    if (s === "in") inC++;
    else if (s === "post") postC++;
    else if (s === "pre") preC++;
  }

  const n = games.length;
  if (inC > 0) {
    if (postC + preC > 0) return "mixed";
    return "live";
  }
  if (postC === n) return "final";
  if (preC === n) return "pre";
  if (postC > 0 && preC > 0) return postC >= preC ? "mixed" : "mixed";
  if (postC > 0) return "final";
  if (preC > 0) return "pre";
  return "unknown";
}

/**
 * @param {unknown} golfData
 * @returns {BoardEventState}
 */
export function deriveGolfEventState(golfData) {
  const s = String(golfData?.currentEvent?.state || "").toLowerCase();
  if (s === "post" || s === "final") return "final";
  if (s === "in") return "live";
  return "pre";
}

/**
 * @param {Array<{ raw?: { live?: string } }> | null | undefined} liveMatches
 * @returns {BoardEventState}
 */
export function deriveTennisBoardState(liveMatches) {
  if (!Array.isArray(liveMatches) || liveMatches.length === 0) return "unknown";
  let live = 0;
  for (const m of liveMatches) {
    if (String(m?.raw?.live || "0") === "1") live++;
  }
  if (live > 0 && live < liveMatches.length) return "mixed";
  if (live > 0) return "live";
  return "pre";
}

/**
 * @param {unknown} f1Data
 * @returns {BoardEventState}
 */
export function deriveF1EventState(f1Data) {
  const session = f1Data?.session;
  if (!session?.date_start) return "unknown";
  const start = new Date(session.date_start).getTime();
  const endRaw = session.date_end;
  const endMs = endRaw ? new Date(endRaw).getTime() : null;
  const now = Date.now();
  if (endMs != null && !Number.isNaN(endMs) && now > endMs) return "final";
  if (!Number.isNaN(start) && now >= start && (endMs == null || Number.isNaN(endMs) || now <= endMs)) {
    return "live";
  }
  if (!Number.isNaN(start) && now < start) return "pre";
  return "unknown";
}

/**
 * @param {"golf"|"mlb"|"nba"|"nfl"|"tennis"|"f1"} sport
 * @param {BoardEventState | boolean} eventState — NFL passes boolean season mode: true = in-season
 * @returns {string[]}
 */
export function getQuickPromptsForState(sport, eventState) {
  const st = typeof eventState === "boolean" ? (eventState ? "live" : "futures") : eventState;

  if (sport === "golf") {
    if (st === "final") {
      return ["Biggest surprise?", "Which props hit?", "Handicap lessons for next week?", "Best outright that cashed?"];
    }
    if (st === "live") {
      return ["Live top-5 angle?", "Cut line watch?", "Top underdog still in?", "Round leader angle?"];
    }
    if (st === "mixed") {
      return ["Best outright?", "Top-10 value?", "Course fit sleeper?", "Fade favorites?"];
    }
    return ["Best outright?", "Top-10 value?", "Course fit sleeper?", "Fade favorites?"];
  }

  if (sport === "mlb") {
    if (st === "live" || st === "mixed") {
      return ["Live game total?", "Still-open props?", "Best K prop in play?", "Bullpen / late angle?"];
    }
    if (st === "final") {
      return ["Which props hit?", "Biggest surprise?", "SP performance recap?", "Look ahead to tomorrow?"];
    }
    return ["Best K prop?", "Best HR prop?", "Best game total?", "YRFI / NRFI angle?"];
  }

  if (sport === "nba") {
    if (st === "live" || st === "mixed") {
      return [
        "Best playoff prop angle tonight?",
        "Live game total?",
        "Second-half prop angle?",
        "Still-open props?",
      ];
    }
    if (st === "final") {
      return ["Which props hit?", "Biggest surprise?", "Stat outliers tonight?", "Look ahead next slate?"];
    }
    return [
      "Best playoff prop angle tonight?",
      "Best prop on tonight's slate?",
      "Who has a usage spike?",
      "Best game total?",
    ];
  }

  if (sport === "nfl") {
    if (st === "live") {
      return ["Best WR props this week?", "Biggest usage jump?", "Best TD scorer angle?", "Which line is stale?"];
    }
    return ["Best WR future?", "Top TE by volume?", "Fade or take Kelce?", "Best RB rushing future?"];
  }

  if (sport === "tennis") {
    if (st === "live" || st === "mixed") {
      return ["Best live set angle?", "Ace / hold watch?", "Mispriced underdog?", "Total games lean?"];
    }
    if (st === "final") {
      return ["Biggest upset?", "Which side was right?", "Surface lesson?", "Next tournament value?"];
    }
    return ["Best mispriced match?", "Futures value on board?", "Surface specialist edge?", "Ace prop angle?"];
  }

  if (sport === "f1") {
    if (st === "live" || st === "mixed") {
      return ["Live race / session lean?", "SC restart angle?", "Points on offer?", "Team order play?"];
    }
    if (st === "final") {
      return ["Race recap — who delivered?", "Standings swing?", "Best post-race future?", "Next GP value?"];
    }
    return ["Who wins the next Grand Prix?", "Best qualifying value?", "Podium picks?", "Sprint weekend angle?"];
  }

  return [];
}
