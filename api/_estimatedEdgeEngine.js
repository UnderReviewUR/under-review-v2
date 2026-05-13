/**
 * Cross-sport Estimated Edge Mode — UR-projected fair lines / playable thresholds
 * from verified non-Odds data only (no book quotes, no movement narratives).
 * Data quality gates: strong | usable | thin — thin never emits fake numeric precision.
 */

import { findFirstPlayerStatRowForQuestion, parseNbaRequestedMarket } from "./_nbaPropSanity.js";
import { isNbaRecentGameZeroStatDnpLike } from "../shared/nbaUrTakeSlim.js";

/** @typedef {"Speculative"|"Medium"} UrEstimatedConfidence */
/** @typedef {"strong"|"usable"|"thin"} UrEstimatedDataQuality */

const HALF = (x) => Math.round(Number(x) * 2) / 2;

/** Banned in UR-generated lean/threshold copy (Odds-off mode). Exported for tests. */
export const ESTIMATED_EDGE_BOOK_LANGUAGE_RE =
  /\b(posted|opening)\s+line\b|\bcurrent\s+line\b|\bthe\s+market\b|\bsharp\s+money\b|\bbooks?\s+(are\s+)?offer/i;

function normSport(s) {
  return String(s || "").trim().toLowerCase();
}

function nonEmptyStr(v) {
  return typeof v === "string" && String(v).trim().length > 0;
}

function assertCleanCopy(s) {
  if (ESTIMATED_EDGE_BOOK_LANGUAGE_RE.test(String(s || ""))) {
    return String(s || "").replace(ESTIMATED_EDGE_BOOK_LANGUAGE_RE, "UR structural read");
  }
  return String(s || "");
}

/**
 * @param {string} sportNorm
 * @param {object} overrides
 */
function emptyShape(sportNorm, overrides = {}) {
  return {
    source: "estimated_edge",
    sport: sportNorm,
    marketType: null,
    subject: null,
    projection: null,
    fairLine: null,
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
    passBand: null,
    confidence: /** @type {UrEstimatedConfidence} */ ("Speculative"),
    drivers: /** @type {string[]} */ ([]),
    warnings: /** @type {string[]} */ ([]),
    dataQuality: /** @type {UrEstimatedDataQuality} */ ("thin"),
    dataQualityReason: "",
    leanRead: /** @type {string|null} */ (null),
    ...overrides,
  };
}

function stripNumericPrecision(o) {
  return {
    ...o,
    projection: null,
    fairLine: null,
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
    passBand: null,
    confidence: "Speculative",
  };
}

function collectGolfVerifiedNames(golfContext) {
  const set = new Set();
  const lb = golfContext?.currentEvent?.leaderboard;
  if (Array.isArray(lb)) {
    for (const row of lb) {
      const n = String(row?.name || row?.player || "").trim();
      if (n) set.add(n);
    }
  }
  for (const r of golfContext?.rankings || []) {
    const n = String(r?.name || "").trim();
    if (n) set.add(n);
  }
  const oddsRows = golfContext?.odds?.outrights;
  if (Array.isArray(oddsRows)) {
    for (const row of oddsRows) {
      const n = String(row?.player || "").trim();
      if (n) set.add(n);
    }
  }
  return set;
}

function pickGolfSubject(question, golfContext) {
  const ql = String(question || "").toLowerCase();
  const names = [...collectGolfVerifiedNames(golfContext)].sort((a, b) => b.length - a.length);
  for (const n of names) {
    const ln = n.toLowerCase();
    if (ln.length >= 4 && ql.includes(ln)) return n;
    const last = ln.split(/\s+/).pop();
    if (last && last.length >= 4 && new RegExp(`\\b${last}\\b`, "i").test(ql)) return n;
  }
  return names[0] || null;
}

/** Verified form / leaderboard / ranking / course-fit signals for a golfer name. */
function golfSignalCount(golfContext, name) {
  if (!name) return 0;
  const nl = String(name).toLowerCase();
  let n = 0;
  const lb = golfContext?.currentEvent?.leaderboard;
  if (Array.isArray(lb)) {
    const row = lb.find((r) => String(r?.name || r?.player || "").toLowerCase() === nl);
    if (row) {
      if (row.position != null || row.score != null || row.total != null || row.thru != null) n++;
      if (["sg_ott", "sg_app", "sg_arg", "sg_putt", "strokesGainedTotal"].some((k) => row[k] != null)) n++;
      if (String(row?.notes || row?.course_fit || "").trim().length > 8) n++;
    }
  }
  for (const r of golfContext?.rankings || []) {
    if (String(r?.name || "").toLowerCase() === nl) {
      n++;
      if (r.rank != null || r.position != null) n++;
      break;
    }
  }
  return n;
}

function recentStatAvg(row, pick) {
  const rg = Array.isArray(row?.recentGames) ? row.recentGames : [];
  const vals = [];
  for (const g of rg.slice(0, 5)) {
    if (isNbaRecentGameZeroStatDnpLike(g)) continue;
    const v = pick(g);
    if (Number.isFinite(v)) vals.push(v);
  }
  if (!vals.length) return null;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}

function nbaMinutesFactor(row) {
  const m = row?.min;
  if (m == null) return 1;
  const s = String(m).trim();
  const colon = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (colon) {
    const mm = Number(colon[1]) + Number(colon[2]) / 60;
    if (Number.isFinite(mm) && mm > 0) return Math.min(1.12, mm / 32);
  }
  const n = Number(m);
  if (Number.isFinite(n) && n > 0) return Math.min(1.12, n / 32);
  return 1;
}

function nbaThinLean(reasonTags) {
  const lean = assertCleanCopy(
    `Lean: pass unless role and minutes confirmation improve. No numeric UR threshold from current verified context (${reasonTags.join("; ")}).`,
  );
  return {
    leanRead: lean,
    drivers: [
      "State the lean (pass / watch).",
      "State what would need to be true to make it playable (confirmed role, minutes, or a verified market anchor).",
      "Pass cleanly if those confirmations are not met.",
    ],
    warnings: ["No bet from current verified context without stronger anchors."],
  };
}

function buildNbaEdge(question, nbaContext) {
  const sport = "nba";
  const row = findFirstPlayerStatRowForQuestion(question, nbaContext?.playerStats || []);
  const rm = parseNbaRequestedMarket(question);
  const marketParsed = Boolean(rm?.market);

  if (!row) {
    const thin = nbaThinLean(["no confident player match"]);
    return emptyShape(sport, {
      marketType: "team_game",
      subject: null,
      dataQuality: "thin",
      dataQualityReason: "No playerStats row matched the question.",
      ...stripNumericPrecision({}),
      ...thin,
    });
  }

  if (!marketParsed) {
    const thin = nbaThinLean(["requested market not parsed from question"]);
    return emptyShape(sport, {
      marketType: "player_unknown_market",
      subject: String(row.name || "").trim(),
      dataQuality: "thin",
      dataQualityReason: "Player matched but prop market (points/rebounds/assists/PRA) not detected.",
      ...stripNumericPrecision({}),
      ...thin,
    });
  }

  const name = String(row.name || "").trim();
  const m = String(rm.market || "").toLowerCase();
  let marketType = "player_points";
  let seasonVal = null;
  let recentAvg = null;
  let unit = "points";

  if (m.includes("points rebounds assists")) {
    marketType = "player_pra";
    const ps = Number(row.pts);
    const rs = Number(row.reb);
    const as = Number(row.ast);
    if (Number.isFinite(row.praSeason)) seasonVal = Number(row.praSeason);
    else if (Number.isFinite(ps) && Number.isFinite(rs) && Number.isFinite(as)) seasonVal = ps + rs + as;
    recentAvg = recentStatAvg(row, (g) => {
      const p = Number(g?.pts);
      const r = Number(g?.reb);
      const a = Number(g?.ast);
      return Number.isFinite(p) && Number.isFinite(r) && Number.isFinite(a) ? p + r + a : NaN;
    });
    unit = "PRA";
  } else if (m.includes("rebound")) {
    marketType = "player_rebounds";
    seasonVal = Number(row.reb);
    recentAvg = recentStatAvg(row, (g) => Number(g?.reb));
    unit = "rebounds";
  } else if (m.includes("assist")) {
    marketType = "player_assists";
    seasonVal = Number(row.ast);
    recentAvg = recentStatAvg(row, (g) => Number(g?.ast));
    unit = "assists";
  } else {
    marketType = "player_points";
    seasonVal = Number(row.pts);
    recentAvg = recentStatAvg(row, (g) => Number(g?.pts));
    unit = "points";
  }

  const rg = Array.isArray(row.recentGames) ? row.recentGames : [];
  const usableRecent = rg.filter((g) => !isNbaRecentGameZeroStatDnpLike(g)).length;
  const hasMinutesSignal = row.min != null && String(row.min).trim() !== "";
  const hasReliableBaseline = Number.isFinite(seasonVal) && seasonVal > 0;

  if (!hasReliableBaseline) {
    const thin = nbaThinLean(["no reliable season baseline for requested stat"]);
    return emptyShape(sport, {
      marketType,
      subject: name,
      dataQuality: "thin",
      dataQualityReason: `Verified season ${unit} anchor missing for ${name}.`,
      ...stripNumericPrecision({}),
      ...thin,
    });
  }

  const hasRecentSignal = recentAvg != null && Number.isFinite(recentAvg);
  const strongRecent = hasRecentSignal || usableRecent >= 2;
  const strongMinutes = hasMinutesSignal || nbaMinutesFactor(row) !== 1;
  const dataQuality =
    strongRecent && (strongMinutes || usableRecent >= 3) ? "strong" : "usable";
  const dataQualityReason =
    dataQuality === "strong"
      ? "Matched player, parsed market, season baseline plus recent and/or minutes signal."
      : "Matched player and market with season baseline; recent sample or minutes signal is thin.";

  const blend = hasRecentSignal ? seasonVal * 0.65 + recentAvg * 0.35 : seasonVal;
  const paceAdj = nbaMinutesFactor(row);
  const rawProj = blend * paceAdj;
  const projectionNum = HALF(rawProj);
  const fair = HALF(projectionNum);
  const playableOver = HALF(projectionNum - 1.3);
  const playableUnder = HALF(projectionNum + 1.3);
  const passLo = HALF(projectionNum - 1);
  const passHi = HALF(projectionNum + 1);

  const confidence =
    dataQuality === "strong" &&
    usableRecent >= 3 &&
    row.recentGamesStale !== true &&
    paceAdj <= 1.08
      ? "Medium"
      : "Speculative";

  const numericBlock = {
    projection: assertCleanCopy(
      `UR projects ${projectionNum} ${unit} for ${name} (UR model from BDL season + recent form + minutes shape — not a book price).`,
    ),
    fairLine: String(fair),
    playableOverAtOrBelow: playableOver,
    playableUnderAtOrAbove: playableUnder,
    passBand: `${passLo}–${passHi}`,
    confidence,
  };

  const drivers = [
    assertCleanCopy(
      `Season ${unit} anchor ~${seasonVal.toFixed(1)}${hasRecentSignal ? `; recent blend ~${recentAvg.toFixed(1)}` : ""}.`,
    ),
    assertCleanCopy(`Minutes shape factor ×${paceAdj.toFixed(2)}.`),
  ];
  if (Array.isArray(nbaContext?.injuries) && nbaContext.injuries.length) {
    drivers.push("Injury slate in payload — adjust volatility if usage shifts.");
  }

  return emptyShape(sport, {
    marketType,
    subject: name,
    dataQuality,
    dataQualityReason,
    leanRead: null,
    drivers,
    warnings: [
      assertCleanCopy("UR projection only — not a book-reported price."),
      confidence === "Speculative"
        ? "Wide pass band — still no verified market anchor."
        : "Stable anchors — still cap at Medium without live odds.",
    ],
    ...numericBlock,
  });
}

function findMlbProbableStarters(games, question) {
  const ql = String(question || "").toLowerCase();
  for (const g of games || []) {
    const ps = g?.probableStarters;
    if (!ps) continue;
    for (const side of ["home", "away"]) {
      const p = ps[side];
      const nm = String(p?.name || "").trim();
      if (!nm) continue;
      const last = nm.split(/\s+/).pop()?.toLowerCase() || "";
      if (last.length >= 4 && ql.includes(last)) return { game: g, pitcher: p, side };
    }
  }
  return null;
}

function parseK9(pitcher) {
  const rawK = pitcher?.k9;
  let k9 =
    typeof rawK === "number" && Number.isFinite(rawK)
      ? rawK
      : parseFloat(String(rawK || "").replace(/[^\d.]/g, ""));
  return Number.isFinite(k9) && k9 > 0 ? k9 : null;
}

function buildMlbEdge(question, mlbContext) {
  const sport = "mlb";
  const games = Array.isArray(mlbContext?.games) ? mlbContext.games : [];
  const hit = findMlbProbableStarters(games, question);
  const qlow = String(question || "").toLowerCase();
  const wantsKs = /\bk\b|strikeout|punchies|ks\b/i.test(qlow);
  const opponentContext = Boolean(
    hit?.game &&
      (hit.game.parkFactor != null ||
        nonEmptyStr(hit.game?.awayTeam?.abbr) ||
        nonEmptyStr(hit.game?.homeTeam?.abbr)),
  );

  if (wantsKs && !hit) {
    const lean = assertCleanCopy(
      "Lean: pass on K volume until a probable starter is matched on the verified slate. Playable only if the matchup card confirms the SP and a strikeout baseline.",
    );
    return emptyShape(sport, {
      marketType: "pitcher_strikeouts",
      subject: null,
      dataQuality: "thin",
      dataQualityReason: "Strikeout prop angle requested but no probable starter matched.",
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: [
        "State the lean (pass).",
        "State what would need to be true (named probable starter + K/9 or recent K signal in payload).",
        "Pass if that is not met.",
      ],
      warnings: ["No bet from current verified context."],
    });
  }

  if (wantsKs && hit?.pitcher) {
    const k9 = parseK9(hit.pitcher);
    const dataQuality =
      k9 != null && opponentContext ? "strong" : k9 != null ? "usable" : "thin";
    const dataQualityReason =
      dataQuality === "strong"
        ? "Matched probable starter with K/9 and slate/park context."
        : k9 != null
          ? "Matched starter and K/9; opponent context is partial."
          : "Starter matched but no K/9 or recent strikeout baseline in payload — no numeric K projection.";

    if (dataQuality === "thin") {
      const lean = assertCleanCopy(
        `Lean: pass on ${hit.pitcher.name} K prop until K/9 or recent strikeout form appears in verified feeds. No numeric threshold from current context.`,
      );
      return emptyShape(sport, {
        marketType: "pitcher_strikeouts",
        subject: String(hit.pitcher.name || "").trim(),
        dataQuality: "thin",
        dataQualityReason,
        ...stripNumericPrecision({}),
        leanRead: lean,
        drivers: [
          "State the lean (pass / watch).",
          "State what would need to be true (K/9 or recent K baseline on card).",
          "Pass cleanly if not met.",
        ],
        warnings: ["No bet from current verified context."],
      });
    }

    const inn = 5.5;
    const proj = HALF((k9 / 9) * inn);
    const fair = HALF(proj);
    const playableOver = HALF(proj - 0.2);
    const playableUnder = HALF(proj + 1);
    const passLo = HALF(proj - 0.5);
    const passHi = HALF(proj + 0.5);
    const confidence = dataQuality === "strong" ? "Medium" : "Speculative";

    return emptyShape(sport, {
      marketType: "pitcher_strikeouts",
      subject: String(hit.pitcher.name || "").trim(),
      dataQuality,
      dataQualityReason,
      leanRead: null,
      projection: assertCleanCopy(
        `UR projects ~${proj} strikeouts over ~${inn} IP workload from K/9 ${k9} (UR sketch — not a posted prop).`,
      ),
      fairLine: String(fair),
      playableOverAtOrBelow: playableOver,
      playableUnderAtOrAbove: playableUnder,
      passBand: `${passLo}–${passHi}`,
      confidence,
      drivers: [
        assertCleanCopy(
          `Probable starter: ${hit.pitcher.name}${hit.pitcher.handedness ? ` (${hit.pitcher.handedness})` : ""}.`,
        ),
        hit.game?.parkFactor != null
          ? assertCleanCopy(`Park factor: ${hit.game.parkFactor}.`)
          : "Slate row present.",
      ],
      warnings: [
        assertCleanCopy("Confirm starter and bullpen plan before placing."),
        assertCleanCopy("UR K sketch — not a book-reported line."),
      ],
    });
  }

  const subject = hit?.pitcher?.name || null;
  const lean = assertCleanCopy(
    "Lean: pass unless the question narrows to a verified starter/market with baselines in payload. Broad slate read without K anchors — no numeric threshold.",
  );
  return emptyShape(sport, {
    marketType: "game_context",
    subject,
    dataQuality: "thin",
    dataQualityReason: "Question too broad or non-K without prop anchors in snapshot.",
    ...stripNumericPrecision({}),
    leanRead: lean,
    drivers: ["Directional slate read only.", "Requires verified prop or starter anchor for numbers."],
    warnings: ["No bet from current verified context without a tighter ask."],
  });
}

function buildGolfEdge(question, golfContext) {
  const sport = "golf";
  const subj = pickGolfSubject(question, golfContext);
  if (!subj) {
    const lean = assertCleanCopy(
      "Lean: pass — no verified golfer anchor in leaderboard/rankings. Playable only if the card lists a named player you are pricing.",
    );
    return emptyShape(sport, {
      marketType: "placement_read",
      subject: null,
      dataQuality: "thin",
      dataQualityReason: "No matched golfer from verified names.",
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: [
        "Prefer top-20 / make-cut / matchup leans over outright without a price you like.",
        "No fake finishing-position precision.",
      ],
      warnings: ["No bet from current verified context."],
    });
  }

  const sig = golfSignalCount(golfContext, subj);
  const dataQuality = sig >= 2 ? "strong" : sig >= 1 ? "usable" : "thin";
  const dataQualityReason =
    dataQuality === "strong"
      ? "Matched golfer with multiple verified form/leaderboard/ranking signals."
      : dataQuality === "usable"
        ? "Matched golfer with at least one verified list or stat signal."
        : "Matched name only — insufficient verified form or list rows for numeric placement precision.";

  if (dataQuality === "thin") {
    const lean = assertCleanCopy(
      `Lean: ${subj} — watch tier only for top-20 / make-cut until leaderboard or strokes profile enriches in payload. Outright pass unless your price clears your own hurdle. No numeric fair line.`,
    );
    return emptyShape(sport, {
      marketType: "placement_read",
      subject: subj,
      dataQuality: "thin",
      dataQualityReason,
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: [
        "Top-20 viable / make-cut lean framing only.",
        "Avoid fake projected finishing position.",
      ],
      warnings: ["No bet from thin verified context without stronger signals."],
    });
  }

  const placement =
    dataQuality === "strong"
      ? assertCleanCopy(
          `UR grades ${subj} as top-20 viable with multiple verified list signals; outright only if your price clears your own hurdle.`,
        )
      : assertCleanCopy(
          `UR grades ${subj} as top-20 lean on limited verified list data; outright pass unless price exists you like.`,
        );

  return emptyShape(sport, {
    marketType: "placement_read",
    subject: subj,
    dataQuality,
    dataQualityReason,
    leanRead: null,
    projection: placement,
    fairLine: dataQuality === "strong" ? assertCleanCopy("top-20 lean (UR placement band)") : null,
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
    passBand:
      dataQuality === "strong"
        ? assertCleanCopy("top-20 viable / outright price-dependent")
        : assertCleanCopy("top-20 watch / outright pass"),
    confidence: "Speculative",
    drivers: [
      assertCleanCopy("Verified leaderboard/rankings names only."),
      assertCleanCopy("No live board in this snapshot."),
    ],
    warnings: [
      assertCleanCopy("Placement read — not a posted price."),
      dataQuality === "usable" ? "Single signal only — avoid oversized stakes." : "",
    ].filter(Boolean),
  });
}

function eloOf(p) {
  const v =
    Number(p?.cElo) ||
    Number(p?.hElo) ||
    Number(p?.gElo) ||
    Number(p?.elo);
  return Number.isFinite(v) ? v : null;
}

function tennisProfileSignals(p) {
  if (!p) return 0;
  let s = 0;
  if (eloOf(p) != null) s++;
  const form = String(p?.form || p?.recent_form || p?.formString || "").trim();
  if (form.length > 6) s++;
  const notes = String(p?.surfaceNotes || p?.notes || "").trim();
  if (notes.length > 12) s++;
  if (p?.holdPct != null || p?.breakPct != null) s++;
  return s;
}

function buildTennisEdge(question, ctx) {
  const sport = "tennis";
  const players = ctx?.players || {};
  const matchup = ctx?.matchupContext?.raw || {};
  const h = String(matchup.home || "").trim();
  const a = String(matchup.away || "").trim();
  const pH = players?.atp?.[h] || players?.wta?.[h] || null;
  const pA = players?.atp?.[a] || players?.wta?.[a] || null;
  const eh = eloOf(pH);
  const ea = eloOf(pA);

  if (!h || !a) {
    const lean = assertCleanCopy(
      "Lean: pass on total-games thresholds until the matchup card lists both players in verified context.",
    );
    return emptyShape(sport, {
      marketType: "match_context",
      subject: null,
      dataQuality: "thin",
      dataQualityReason: "No verified H2H card (home/away) in context.",
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: ["Match-level read requires both names on card."],
      warnings: ["No bet from current verified context."],
    });
  }

  const onePlayerMissing = !pH || !pA;
  const profileSum = tennisProfileSignals(pH) + tennisProfileSignals(pA);
  const bothElo = eh != null && ea != null;

  let dataQuality = "thin";
  let dataQualityReason = "";
  if (onePlayerMissing || (!bothElo && profileSum === 0)) {
    dataQuality = "thin";
    dataQualityReason = onePlayerMissing
      ? "Only one player resolved in ATP/WTA snapshot — total-games threshold unsupported."
      : "No Elo/surface/form signal strong enough for total-games threshold.";
  } else if (bothElo && profileSum >= 2) {
    dataQuality = "strong";
    dataQualityReason = "Both players identified with Elo and enriched profile context.";
  } else if (bothElo || profileSum >= 1) {
    dataQuality = "usable";
    dataQualityReason = bothElo
      ? "Both Elo rows present; profile depth is moderate."
      : "Partial profile signal — directional games read only.";
  } else {
    dataQuality = "thin";
    dataQualityReason = "Insufficient profile data for total-games threshold.";
  }

  if (dataQuality === "thin") {
    const lean = assertCleanCopy(
      `Lean: ${h} vs ${a} — pass on tight total-games numbers; use winner/pressure read from whatever ranking or form strings exist. Playable only if the matchup card later confirms both profiles.`,
    );
    return emptyShape(sport, {
      marketType: "total_games",
      subject: `${h} vs ${a}`,
      dataQuality: "thin",
      dataQualityReason,
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: [
        "Avoid total-games thresholds without enough profile data.",
        "Winner lean may still be argued from thin Elo if one-sided.",
      ],
      warnings: ["No bet from current verified context for games totals."],
    });
  }

  const diff = bothElo ? Math.abs(eh - ea) : 40;
  const baseGames = 22.5;
  const bump = Math.min(6, diff / 35);
  const projGames = HALF(baseGames + bump);
  const fair = HALF(projGames);
  const playableOver = HALF(projGames - 1.2);
  const passLo = HALF(projGames - 1.5);
  const passHi = HALF(projGames + 1.5);
  const confidence = dataQuality === "strong" ? "Medium" : "Speculative";

  return emptyShape(sport, {
    marketType: "total_games",
    subject: `${h} vs ${a}`,
    dataQuality,
    dataQualityReason,
    leanRead: null,
    projection: assertCleanCopy(
      `UR projects a ~${projGames} game environment from verified Elo separation (${bothElo ? `Δ~${Math.round(Math.abs(eh - ea))}` : "partial Elo"} — not a posted total).`,
    ),
    fairLine: String(fair),
    playableOverAtOrBelow: playableOver,
    playableUnderAtOrAbove: HALF(projGames + 1.2),
    passBand: `${passLo}–${passHi}`,
    confidence,
    drivers: [
      assertCleanCopy("Surface / profile rows in payload only."),
      assertCleanCopy("Match card locks names."),
    ],
    warnings: [
      assertCleanCopy("UR games environment — not a book total."),
      assertCleanCopy("Over games only if your offered games line is at or below the playable threshold."),
    ],
  });
}

function buildTennisWtaProfileEdge() {
  const sport = "tennis_wta_profile";
  return emptyShape(sport, {
    marketType: "placement_read",
    subject: null,
    dataQuality: "usable",
    dataQualityReason: "WTA profile snapshot — placement read without live draw pricing.",
    leanRead: null,
    projection: assertCleanCopy(
      "UR profile mode: top-10/top-20 placement read from WTA snapshot rows — not a priced outright.",
    ),
    fairLine: null,
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
    passBand: assertCleanCopy("top-20 viability vs outright price"),
    confidence: "Speculative",
    drivers: [assertCleanCopy("WTA database snapshot — cite only printed profile stats.")],
    warnings: [assertCleanCopy("Confirm any number you bet yourself — UR does not see a book feed here.")],
  });
}

function f1ExtraContext(f1Context) {
  return Boolean(
    f1Context?.nextRace ||
      f1Context?.next_race ||
      f1Context?.racePreview ||
      f1Context?.circuit ||
      f1Context?.track ||
      f1Context?.session ||
      f1Context?.urTakeAssembly?.track ||
      f1Context?.urTakeAssembly?.session,
  );
}

function buildF1Edge(question, f1Context) {
  const sport = "f1";
  const rows = Array.isArray(f1Context?.standings) ? f1Context.standings : [];
  const ql = String(question || "").toLowerCase();
  let driver = null;
  for (const r of rows) {
    const n = String(r?.full_name || "").trim();
    if (!n) continue;
    const last = n.split(/\s+/).pop()?.toLowerCase() || "";
    if (last.length >= 4 && ql.includes(last)) {
      driver = r;
      break;
    }
  }

  const hasStandings = rows.length > 0;
  const constructorSignal = Boolean(
    driver &&
      (nonEmptyStr(driver.constructor_name) ||
        nonEmptyStr(driver.team) ||
        (nonEmptyStr(driver.constructor) && driver.constructor !== "Object")),
  );
  const sessionTrack = f1ExtraContext(f1Context);

  if (!driver || !hasStandings) {
    const lean = assertCleanCopy(
      "Lean: pass on podium/top-10 precision until a driver is matched in standings and constructor or session context is present. Finish-band words only.",
    );
    return emptyShape(sport, {
      marketType: "finish_band",
      subject: driver ? String(driver.full_name || "").trim() : "field",
      dataQuality: "thin",
      dataQualityReason: !hasStandings
        ? "No standings payload for F1 context."
        : "No driver name match in verified standings list.",
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: ["No fake podium/top-10 precision from thin data."],
      warnings: ["No bet from current verified context."],
    });
  }

  let dataQuality = "thin";
  if (constructorSignal && sessionTrack) dataQuality = "strong";
  else if (constructorSignal || sessionTrack) dataQuality = "usable";

  if (dataQuality === "thin") {
    const lean = assertCleanCopy(
      `Lean: ${driver.full_name} — pass on tight podium/top-10 labels until constructor or track/session context appears in payload. Finish-band words only; no fake precision.`,
    );
    return emptyShape(sport, {
      marketType: "finish_band",
      subject: String(driver.full_name || "").trim(),
      dataQuality: "thin",
      dataQualityReason:
        "Driver matched in standings but no constructor/team row and no track/session context in payload.",
      ...stripNumericPrecision({}),
      leanRead: lean,
      drivers: [
        "State the lean (pass / watch).",
        "State what would need to be true (constructor or session fields in JSON).",
        "Pass cleanly if not met.",
      ],
      warnings: ["No bet from current verified context."],
    });
  }

  const dataQualityReason =
    dataQuality === "strong"
      ? "Matched driver with constructor/team and track/session context."
      : "Matched driver with standings signal; constructor or session context is partial.";

  const pos = Number(driver.position);
  const top10 = Number.isFinite(pos) && pos <= 10;
  const top3 = Number.isFinite(pos) && pos <= 3;

  return emptyShape(sport, {
    marketType: "finish_band",
    subject: String(driver.full_name || "").trim(),
    dataQuality,
    dataQualityReason,
    leanRead: null,
    projection: assertCleanCopy(
      `UR grades ${driver.full_name} as ${top3 ? "podium price-dependent" : top10 ? "top-10 lean on standings" : "outside top-10 without a long price"} — UR finish-band read, not a book price.`,
    ),
    fairLine: top3 ? "podium/pass" : top10 ? "top-10 lean" : "pass/fade short",
    playableOverAtOrBelow: null,
    playableUnderAtOrAbove: null,
    passBand: top3 ? "podium only if long" : top10 ? "top-10 viable" : "pass unless price is long",
    confidence: "Speculative",
    drivers: [
      assertCleanCopy("Standings + constructor context from verified F1 payload only."),
      assertCleanCopy("Weather/tire claims require the same fields in JSON."),
    ],
    warnings: [assertCleanCopy("No podium/finish odds quoted — UR band only.")],
  });
}

/**
 * @param {{ sport: string, question: string, context?: object }} args
 * @returns {object|null}
 */
export function buildEstimatedEdge({ sport, question, context = {} }) {
  const sp = normSport(sport);
  const eligible = new Set(["nba", "mlb", "golf", "tennis", "tennis_wta_profile", "f1"]);
  if (!eligible.has(sp)) return null;

  if (sp === "nba") return buildNbaEdge(question, context.nbaContext);
  if (sp === "mlb") return buildMlbEdge(question, context.mlbContext);
  if (sp === "golf") return buildGolfEdge(question, context.golfContext);
  if (sp === "tennis") return buildTennisEdge(question, context);
  if (sp === "tennis_wta_profile") return buildTennisWtaProfileEdge();
  if (sp === "f1") return buildF1Edge(question, context.f1Context);
  return null;
}

/** User-turn injection (JSON the model must align with). */
export function formatEstimatedEdgeUserPromptBlock(edge) {
  if (!edge || edge.source !== "estimated_edge") return "";
  return `UR_ESTIMATED_EDGE_JSON (server — not from a book feed)
${JSON.stringify(edge, null, 2)}

DATA QUALITY (${edge.dataQuality}): ${edge.dataQualityReason}
When dataQuality is thin: use leanRead for THE CALL — no numeric fair line or threshold language.
When dataQuality is usable: prefer directional threshold language; avoid false decimal precision.
When dataQuality is strong: you may use projection / fair line / playable threshold / pass band from JSON as UR-modeled values only.`;
}

/** System appendix: vocabulary + guardrails when Estimated Edge Mode is active. */
export function buildEstimatedEdgeModelAppendix(edge) {
  if (!edge || edge.source !== "estimated_edge") return "";
  const dq = String(edge.dataQuality || "thin");
  const base = `ESTIMATED EDGE MODE (active — odds snapshot unavailable for this sport)
- dataQuality: ${dq} — ${String(edge.dataQualityReason || "").trim()}
- Forbidden vocabulary: "current line", "posted line", "the market", "steam", "sharp money", "books are offering".
- Confidence: never High without verified live odds; thin mode is Speculative only.`;

  if (dq === "thin") {
    return `${base}
- THIN MODE: Do **not** invent numeric fair lines or playable thresholds. Use **leanRead** plus drivers for THE CALL (lean / pass). No UR projection decimals.
- Required pattern: (1) state the lean, (2) state what would need to be true to make it playable, (3) pass cleanly if not met.`;
  }

  if (dq === "usable") {
    return `${base}
- USABLE MODE: Directional threshold language where JSON supports it; be clear about pass zones; avoid false decimal precision where signals are partial.
- You may reference fairLine / thresholds **only** when present in UR_ESTIMATED_EDGE_JSON; never describe them as book-reported.`;
  }

  return `${base}
- STRONG MODE: Use UR projection, fair line, playable threshold, and pass band from JSON as **UR-modeled** values — never as posted or market lines.
- End with THE CALL (mandatory).`;
}

const NBA_EE_NUMERIC_CLOSE = `- Close with THE CALL that explicitly uses the UR projection / fair line / playable threshold / pass band from UR_ESTIMATED_EDGE_JSON when dataQuality is strong or usable. These numbers are **UR-modeled thresholds**, not book-reported prices — never describe them as posted lines or line moves.`;

const NBA_EE_THIN_CLOSE = `- Close with THE CALL using **leanRead** from UR_ESTIMATED_EDGE_JSON (dataQuality thin). **No** numeric fair line or threshold language. Lean / pass only.`;

/** @param {object|null} edge */
export function buildNbaEstimatedEdgeClosingRule(edge) {
  if (!edge || edge.source !== "estimated_edge") return NBA_EE_NUMERIC_CLOSE;
  return edge.dataQuality === "thin" ? NBA_EE_THIN_CLOSE : NBA_EE_NUMERIC_CLOSE;
}

export const NBA_ESTIMATED_EDGE_CLOSING_RULE = NBA_EE_NUMERIC_CLOSE;
