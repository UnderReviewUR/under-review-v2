export const config = { api: { bodyParser: { sizeLimit: "2mb" } } };

import { applyCors } from "./_cors.js";
import { ACCESS_TOKEN_SECRET_MISSING_MESSAGE, getEnv } from "./_env.js";
import { shouldRequireUrTakeAuth, verifyBearerForUrTake } from "./_urTakeAuth.js";
import { sanitizeUrTakeBody } from "./_sanitizeUrTakeBody.js";
import {
  allowRateLimit,
  emailLimit,
  getClientIp,
  ipLimit,
} from "./_rateLimitUrTake.js";
import { fetchAnthropicMessages } from "./_anthropicRetry.js";
import { appendTakeForUser, extractTakeFromResponse } from "./_takeLedger.js";
import { buildCanonicalNflContext } from "./_nflContext.js";
import {
  buildTeamDraftFocusBlock,
  getActiveDraftBundle,
  getNflTeamAbbrFromName,
  getNflDraftPhase,
  getNflTeamNameFromAbbr,
  resolveNflTeamFromQuestion,
} from "./nfl-draft-season.js";
import { simulateDraftRounds } from "./nfl-draft-engine.js";
import { detectNflTeamHint } from "../src/lib/detectSportFromQuestion.js";
import {
  buildNbaUrTakeBoard,
  buildNbaNewsImpact,
  extractNbaTeamAbbrevsFromQuestion,
  classifyNbaBoardGamePhase,
  nbaGameHasVerifiedBoxScore,
} from "./nba.js";
import { augmentNbaRosterGroundingWithUi } from "../src/lib/nbaUiSurface.js";
import {
  buildCoreFrameworkPrompt,
  buildTakeTrustUiMetadata,
  composeRegisteredUrTakeSystemPrompt,
  resolveEvidenceSparsityProfile,
} from "./_urTakeSystemPromptRegistry.js";

export { buildNbaUrTakeDecisionModeSpine } from "./_urTakeSystemPromptRegistry.js";

/** Single closing rule for NBA when posted lines are missing — keeps ODDS-UNAVAILABLE + FALLBACK aligned. */
const NBA_UNIFIED_MARKET_CLOSING_RULE = `- Close with a specific conditional trigger tied to a player name and stat threshold. Format: "If [player] line opens at [number] or lower, lean [direction]." This is a forward trigger — not a dismissal. Never say "when markets post" or "come back when lines are up" or any variant that sends the user away.`;

/** Injected when oddsAvailable is false (including NBA follow-up turns after compact prompt merge). */
const NBA_ODDS_UNAVAILABLE_MODE_BLOCK = `ODDS-UNAVAILABLE MODE (mandatory when oddsAvailable is false)
- Never reference a specific line, spread, total, or implied probability as if posted now.
- Never say "odds unavailable," "lines not posted," "I don't have the line," or any variation.
- Do not apologize or explain missing odds data.
- Lead with the structural edge from matchup, pace, rotation, usage, and game script.
- Name specific players from grounded context whenever available; use real player names from the authorized roster list in context, not positional abstractions like "primary initiator" or "lead guard."
- When citing angles, anchor to available season-average style context for named players when present (e.g., points/assists/rebounds tendencies from playerStats).

SEASON-AVERAGE PROP ESTIMATES (mandatory when oddsAvailable is false and playerStats exist in context):
When a user asks for specific prop recommendations and live lines are unavailable, generate estimated prop thresholds from season average data in playerStats. Format these as:
- "Based on his season average, look for [Player] to go over [season_avg_stat - small_buffer] [stat category]."
- Example: if Cade Cunningham averages 23.9 PPG, a reasonable threshold is 22.5 — say "Look for Cunningham over 22.5 points based on his season average and elimination-game usage spike."
Apply matchup context to adjust the threshold up or down. Never present these as live odds — present them as data-grounded estimates. This is not fabrication — this is analysis from confirmed season data.
Never say "I cannot generate lines" when playerStats data exists in context. That data IS the basis for a recommendation.

${NBA_UNIFIED_MARKET_CLOSING_RULE}
- Response must read complete and sharp, never like a partial answer.`;

// ── TODAY string — injected into every prompt ──────────────────────────────
function getTodayStr() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/New_York",
  });
}

// ── Helper: extract text from Anthropic response ───────────────────────────
function extractAnthropicText(data) {
  if (!data || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block?.type === "text" && block?.text)
    .map((block) => block.text)
    .join("\n")
    .trim();
}

// ── Intent + sport helpers ─────────────────────────────────────────────────
function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
}

function pickSurfaceKey(context) {
  const s = normalizeText(context?.currentTournament?.surface || "");
  if (s.includes("clay")) return "clay";
  if (s.includes("grass")) return "grass";
  return "hard";
}

function getPlayerSurfaceScore(player, surfaceKey) {
  const surfaceMap = {
    hard: ["hElo", "hardElo", "elo"],
    clay: ["cElo", "clayElo", "elo"],
    grass: ["gElo", "grassElo", "elo"],
  };
  const keys = surfaceMap[surfaceKey] || ["elo"];
  for (const key of keys) {
    const v = Number(player?.[key]);
    if (Number.isFinite(v)) return v;
  }
  return Number.NEGATIVE_INFINITY;
}

function buildTourShortlist(playersByTour, surfaceKey, limit = 8) {
  const entries = Object.entries(playersByTour || {});
  const ranked = entries
    .map(([name, p]) => ({
      name,
      score: getPlayerSurfaceScore(p, surfaceKey),
      hold: p?.serveStats?.holdPct ?? null,
      brk: p?.returnStats?.breakPct ?? null,
      dr: p?.overallStats?.dominanceRatio ?? null,
      style: p?.style || null,
    }))
    .filter((x) => Number.isFinite(x.score))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  return ranked;
}

/** Best single Elo label for snapshot (thin rows may lack surface-specific fields). */
function snapshotEloLabel(p, surfaceKey) {
  const pick = (v, label) =>
    Number.isFinite(Number(v)) ? `${label} ${Number(v)}` : null;
  if (surfaceKey === "clay") {
    const c = pick(p?.cElo, "cElo");
    if (c) return c;
  } else if (surfaceKey === "hard") {
    const h = pick(p?.hElo, "hElo");
    if (h) return h;
  } else if (surfaceKey === "grass") {
    const g = pick(p?.gElo, "gElo");
    if (g) return g;
  }
  return (
    pick(p?.cElo, "cElo") ||
    pick(p?.hElo, "hElo") ||
    pick(p?.gElo, "gElo") ||
    pick(p?.elo, "Elo") ||
    pick(p?.yElo2026, "yElo")
  );
}

function snapshotHoldHint(p) {
  if (typeof p?.serveStats === "string" && p.serveStats.trim()) {
    return p.serveStats.split(",")[0]?.trim() || null;
  }
  if (p?.serveStats?.holdPct != null) {
    return `${p.serveStats.holdPct}% hold`;
  }
  if (typeof p?.returnStats === "string" && p.returnStats.trim()) {
    return p.returnStats.split(",")[0]?.trim().slice(0, 72) || null;
  }
  return null;
}

function snapshotDrHint(p) {
  if (typeof p?.overallStats === "string") {
    const m = p.overallStats.match(/Dominance Ratio\s+([\d.]+)/i);
    if (m) return `DR ${m[1]}`;
    const loose = p.overallStats.match(/\bDR\s+([\d.]+)\b/i);
    if (loose) return `DR ${loose[1]}`;
  }
  if (p?.overallStats?.dominanceRatio != null) {
    return `DR ${p.overallStats.dominanceRatio}`;
  }
  const note = String(p?.fullNote || "");
  const fromNote = note.match(/(?:Dominance Ratio|DR)\s+([\d.]+)/i);
  if (fromNote) return `DR ${fromNote[1]}`;
  return null;
}

/** Ranked snapshot lines for prompt injection (surface-weighted). Safe on sparse rows. */
function buildTennisPlayerSnapshot(playerDb, surfaceKey, limit = 30) {
  const ranked = buildTourShortlist(playerDb, surfaceKey, limit);
  return ranked
    .map(({ name }) => {
      try {
        const p = playerDb?.[name];
        if (!p || typeof p !== "object") return `${name} | (no row in DB)`;

        const eloTag = snapshotEloLabel(p, surfaceKey);
        const hold = snapshotHoldHint(p);
        const dr = snapshotDrHint(p);

        const surf =
          p.surfaceNote?.[surfaceKey] ||
          (surfaceKey === "clay" ? p.surfaceNote?.clay : null) ||
          (surfaceKey === "hard" ? p.surfaceNote?.hard : null) ||
          (surfaceKey === "grass" ? p.surfaceNote?.grass : null);

        const surfaces = surf
          ? `${surfaceKey}: ${String(surf).slice(0, 140)}`
          : [
              p.surfaceNote?.clay ? `clay: ${String(p.surfaceNote.clay).slice(0, 90)}` : null,
              p.surfaceNote?.hard ? `hard: ${String(p.surfaceNote.hard).slice(0, 90)}` : null,
            ]
              .filter(Boolean)
              .join(", ");

        const form =
          p.record2026 ||
          p.surfaceRecord2026 ||
          p.record ||
          p.miamiNote ||
          "";

        const note = p.fullNote ? String(p.fullNote).slice(0, 120) : "";

        const signals = [eloTag, hold, dr].filter(Boolean).join(" · ");
        const thin =
          !eloTag && !hold && !dr && !surfaces && !String(form).trim() && !note;

        const bits = [
          `${name}`,
          p.style ? String(p.style) : "",
          signals || (thin ? "partial row — cite cautiously from notes only" : ""),
          surfaces || "",
          form ? String(form).slice(0, 80) : "",
          note ? note : "",
        ].filter(Boolean);

        return bits.join(" | ");
      } catch {
        return `${name} | (snapshot parse skipped — row present but malformed)`;
      }
    })
    .join("\n");
}

function findPlayerRowLoose(name, tourObj) {
  if (!name || !tourObj || typeof tourObj !== "object") return null;
  const n = normalizeText(name);
  if (!n) return null;
  if (tourObj[name]) return tourObj[name];
  for (const [k, v] of Object.entries(tourObj)) {
    const kn = normalizeText(k);
    if (kn === n || kn.includes(n) || n.includes(kn)) return v;
  }
  return null;
}

function buildMatchupTennisDigest(homeName, awayName, players, surfaceKey) {
  const rowH =
    findPlayerRowLoose(homeName, players?.atp) ||
    findPlayerRowLoose(homeName, players?.wta);
  const rowA =
    findPlayerRowLoose(awayName, players?.atp) ||
    findPlayerRowLoose(awayName, players?.wta);

  const one = (label, row) => {
    if (!row || typeof row !== "object") {
      return `${label}: (no dedicated UR profile row for this name — do not invent stats; use matchup + tour context only.)`;
    }
    const eloTag = snapshotEloLabel(row, surfaceKey);
    const hold = snapshotHoldHint(row);
    const dr = snapshotDrHint(row);
    const surf =
      surfaceKey === "clay"
        ? row.surfaceNote?.clay
        : surfaceKey === "grass"
          ? row.surfaceNote?.grass
          : row.surfaceNote?.hard;
    const surfaces = surf ? `${surfaceKey}: ${String(surf).slice(0, 130)}` : "";

    const form =
      row.record2026 ||
      row.surfaceRecord2026 ||
      row.record ||
      row.miamiNote ||
      "";
    const note = row.fullNote ? String(row.fullNote).slice(0, 110) : "";

    const signals = [eloTag, hold, dr].filter(Boolean).join(" · ");
    const bits = [
      `${label}`,
      row.style ? String(row.style) : "",
      signals || "partial signals — cite cautiously",
      surfaces || "",
      form ? String(form).slice(0, 72) : "",
      note ? note : "",
    ].filter(Boolean);

    return bits.join(" | ");
  };

  return `${one(String(homeName || "").trim() || "Player A", rowH)}
${one(String(awayName || "").trim() || "Player B", rowA)}`;
}

/**
 * Ace prop lines aligned with the app Prop Guide (TennisScreen).
 * Clay events foreground avg_aces_clay, then ace_rate, then hard proxy — same contract as UI.
 */
function buildAcePropsDigest(aceProps, tournamentSurface) {
  if (!aceProps || typeof aceProps !== "object") return "Not available";
  const keys = Object.keys(aceProps);
  if (keys.length === 0) return "Not available";
  const surf = normalizeText(tournamentSurface);
  const clayEvent = surf.includes("clay");
  const lines = [];
  for (const [key, row] of Object.entries(aceProps)) {
    if (!row || typeof row !== "object") continue;
    const name = String(key || "").trim() || "unknown";
    const acePct = row.ace_rate != null ? String(row.ace_rate) : "—";
    const hard = row.avg_aces_hard;
    const clay = row.avg_aces_clay;
    if (clayEvent && clay != null && clay !== "" && Number.isFinite(Number(clay))) {
      lines.push(
        `${name}: ${clay} clay aces/gm · ${acePct} tour ace% · ${hard} hard aces/gm (proxy — matches app Prop Guide on clay)`,
      );
    } else {
      lines.push(`${name}: ${hard} aces/gm (hard proxy) · ${acePct} tour ace% (app Prop Guide line)`);
    }
  }
  return lines.join("\n");
}

function extractNflPlayersFromContext(nflContext) {
  const text =
    typeof nflContext === "string"
      ? nflContext
      : JSON.stringify(nflContext || {}, null, 2);

  const names = [];
  const regex = /^([^\n|]{2,})\s+\|\s+(RB|WR|TE|QB)\s+\|/gm;
  let match;
  while ((match = regex.exec(text))) {
    const name = String(match[1] || "").trim();
    if (name) names.push(name);
  }
  return names;
}

function extractNflQuestionSubject(question) {
  const q = normalizeText(question).replace(/[^a-z0-9'\s.-]/g, " ");

  const willPattern =
    /\bwill\s+([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})\s+(throw|pass|rush|run|score|catch|record|have)\b/;
  const overUnderPattern =
    /\b([a-z][a-z'-]*(?:\s+[a-z][a-z'-]*){0,2})\s+(over|under)\s+\d/;

  const willMatch = q.match(willPattern);
  if (willMatch) return String(willMatch[1] || "").trim();

  const ouMatch = q.match(overUnderPattern);
  if (ouMatch) return String(ouMatch[1] || "").trim();

  return "";
}

function findNflPlayerMatch(questionSubject, playerNames) {
  if (!questionSubject || !Array.isArray(playerNames) || playerNames.length === 0) {
    return null;
  }

  const subject = normalizeText(questionSubject);
  const subjectTokens = subject.split(/\s+/).filter(Boolean);
  if (subjectTokens.length === 0) return null;

  for (const playerName of playerNames) {
    const playerNorm = normalizeText(playerName);
    const playerTokens = playerNorm.split(/\s+/).filter(Boolean);

    if (playerNorm.includes(subject) || subject.includes(playerNorm)) {
      return playerName;
    }

    const overlap = subjectTokens.filter((t) => playerTokens.includes(t));
    if (overlap.length > 0) {
      return playerName;
    }
  }

  return null;
}

function shouldApplyNflUnsupportedGuard(question) {
  const q = normalizeText(question);
  return (
    q.includes(" over ") ||
    q.includes(" under ") ||
    q.includes("yards") ||
    q.includes("passing") ||
    q.includes("rushing") ||
    q.includes("receiving") ||
    q.includes("td") ||
    q.includes("touchdown")
  );
}

/** Draft / GM / capital questions — different guardrails than in-season prop board. */
function isNflDraftAngleQuestion(question) {
  const q = normalizeText(question);
  const needles = [
    "draft",
    "nfl draft",
    "first round",
    "round 1",
    "round one",
    "combine",
    "mock draft",
    "war room",
    "general manager",
    "front office",
    "trade up",
    "trade back",
    "on the clock",
    "pittsburgh",
    "overall pick",
    "top pick",
    "prospect",
    "draft capital",
    "comp pick",
    "compensatory",
    "draft order",
    "draft slot",
    "draft board",
    "kiper",
    "mcshay",
    "predict",
    "prediction",
    "pick by pick",
    "pick-by-pick",
    "each pick",
    "every pick",
    "every round",
    "all seven",
    "seven round",
    "seven rounds",
    "full mock",
    "who will we pick",
    "who we pick",
    "who we take",
    "our picks",
    "my picks",
  ];
  if (
    /\bgm\b/.test(q) &&
    (q.includes("draft") || q.includes("war room") || q.includes("front office"))
  ) {
    return true;
  }
  return needles.some((n) => q.includes(n));
}

/**
 * Routes draft questions so league-wide and prospect-profile asks are not forced into team simulation.
 * @returns {"TYPE_A"|"TYPE_B"|"TYPE_C"}
 */
function getNflDraftQuestionRoute(question, focusTeamAbbr) {
  const lower = String(question || "").toLowerCase();
  const hasTeam = !!focusTeamAbbr;

  const leagueWide =
    /\bsleeper|\bsleepers\b|biggest sleeper|best value picks?|who falls|who rises|\bwhole class\b|league[- ]wide|across the (draft|class|league)|who goes top|\btop\s*5\b|wins the draft|which team wins|\bwin the draft\b|best players available|most interesting (draft )?situation|best prospect at\b|\bbest (edge|quarterback|qb|receiver|wr|running back|rb|tackle|corner|corners|te|tight end|safety|safeties|idl|iol|guard|center|linebacker|lb)\b.*\b(in this class|this year|the class)\b/i.test(
      lower,
    ) || /\bwho (has|have) the (most|best) interesting\b/i.test(lower);

  if (leagueWide) return "TYPE_B";

  const profile =
    /\bgrade on\b|\b(valuation|value) on\b|\bdraft stock\b|\bprojected range\b|\bpositional rank\b/i.test(lower) ||
    /\bwhere (does|will)\b[\s\S]{0,120}\b(go|land|come off the board)\b/i.test(lower);

  if (profile) return "TYPE_C";

  const teamSim =
    /\bsimulate\b|\bmock draft\b|\bfull mock\b|\b(my|our) team'?s\b|\bwar room\b|\brounds?\s*1\s*[-–]\s*3\b|\bpick[\s-]by[\s-]pick\b|\beach pick\b|\bevery round\b|\ball seven\b|\bseven round/i.test(lower) ||
    (hasTeam &&
      /\bdraft\b|\bmock\b|\bpicks?\b|\bneeds?\b|\bcapital\b|\bwho will\b|\bwhat will\b|\bwho (does|do)\b/i.test(lower));

  if (teamSim) return "TYPE_A";

  return "TYPE_B";
}

function isSettledFactQuestion(question) {
  const q = String(question || "").toLowerCase();
  const patterns = [
    /who won/i,
    /what was the score/i,
    /did .+ (beat|lose|win)/i,
    /final score/i,
    /how did .+ do/i,
    /who (is|plays for|plays on)/i,
    /what team (does|is)/i,
    /when (did|does)/i,
    /current standings/i,
    /who leads/i,
  ];
  return patterns.some((p) => p.test(q));
}

function detectLiveGameSignals(question, hasImage) {
  const q = normalizeText(question);
  const liveKeywords = [
    "left in",
    "minutes left",
    "seconds left",
    "time left",
    "right now",
    "currently",
    "just happened",
    "live",
    "this quarter",
    "this inning",
    "this half",
    "this set",
    "bottom of",
    "top of",
    "end of",
    "q1",
    "q2",
    "q3",
    "q4",
    "1st half",
    "2nd half",
    "overtime",
    "ot",
    "needs",
    "has to",
    "on pace",
  ];
  const hasLiveKeyword = liveKeywords.some((kw) => q.includes(kw));
  return {
    isLive: hasImage || hasLiveKeyword,
    hasImage,
    hasLiveKeyword,
  };
}

function hasRecentLiveScreenshotContext(history) {
  if (!Array.isArray(history) || history.length === 0) return false;
  const recent = history.slice(-6);
  const livePattern =
    /\b(live|q[1-4]|quarter|halftime|1st q|2nd q|3rd q|4th q|clock|odds|draftkings|fanduel|scoreboard|@\s*[A-Z]{2,4}|\b\d{1,3}\s*[-:]\s*\d{1,3}\b)\b/i;
  return recent.some((msg) => livePattern.test(String(msg?.content ?? msg?.text ?? "")));
}

function isShortMarketFollowUp(question) {
  const q = normalizeText(question);
  const compact = q.replace(/\s+/g, " ").trim();
  if (!compact) return false;
  if (compact.length > 40) return false;
  return (
    /^(total|total over under|over|under|side|best bet)\??$/.test(compact) ||
    /^(over under|o\/u|ou)\??$/.test(compact) ||
    /^(over\??|under\??|side\??|best bet\??)$/.test(compact)
  );
}

function detectIntent(question, hasImage) {
  const q = normalizeText(question);

  const hasExplicitSlipLanguage =
    q.includes("slip") ||
    q.includes("parlay") ||
    q.includes("entry") ||
    q.includes("ticket") ||
    q.includes("pick em") ||
    q.includes("pick'em") ||
    q.includes("bet slip") ||
    q.includes("my slip") ||
    q.includes("my ticket");

  if (hasImage && hasExplicitSlipLanguage) {
    return "slip_review";
  }

  if (q.includes("fade")) return "fade";
  if (q.includes("sleeper")) return "sleeper";
  if (q.includes("outright")) return "outright";
  if (
    q.includes("best props") ||
    q.includes("what props") ||
    q.includes("prop for") ||
    q.includes("aces") ||
    q.includes("double faults") ||
    q.includes("games played") ||
    q.includes("scoreline") ||
    q.includes("predict") ||
    q.includes("projection") ||
    q.includes("what will") ||
    q.includes("how many")
  ) {
    return "prop_projection";
  }
  if (q.includes("prop")) return "prop";

  return "general";
}

/** Sport inferred only from question text, matchup league, or slip image league — not client tab. */
function inferSportFromQuestionText(question, matchupContext, hasImage) {
  const q = normalizeText(question);

  if (matchupContext?.league) {
    const league = normalizeText(matchupContext.league);
    if (league.includes("golf") || league.includes("pga")) return "golf";
    if (league.includes("nba")) return "nba";
    if (league.includes("mlb")) return "mlb";
    if (league.includes("nfl")) return "nfl";
    if (league.includes("f1") || league.includes("formula 1")) return "f1";
    if (league.includes("tennis")) return "tennis";
  }

  if (
    q.includes("golf") ||
    q.includes("outright") ||
    q.includes("harbour town") ||
    q.includes("rbc heritage") ||
    q.includes("masters") ||
    q.includes("pga")
  ) {
    return "golf";
  }

  if (q.includes("nba") || q.includes("points") || q.includes("pra")) return "nba";
  if (
    q.includes("mlb") ||
    q.includes("strikeout") ||
    q.includes("home run") ||
    q.includes("k prop") ||
    (q.includes("pitcher") && q.includes("prop"))
  ) {
    return "mlb";
  }
  if (q.includes("nfl") || q.includes("receiving") || q.includes("rushing")) return "nfl";
  if (q.includes("f1") || q.includes("grand prix")) return "f1";
  if (q.includes("tennis")) return "tennis";

  if (hasImage && matchupContext?.league) {
    const league = normalizeText(matchupContext.league);
    if (league.includes("nba")) return "nba";
    if (league.includes("nfl")) return "nfl";
    if (league.includes("mlb")) return "mlb";
    if (league.includes("golf")) return "golf";
    if (league.includes("f1")) return "f1";
  }

  return null;
}

function resolveSportHint({ incomingSportHint, question, matchupContext, hasImage, golfContext }) {
  const textualSport = inferSportFromQuestionText(question, matchupContext, hasImage);
  const h =
    typeof incomingSportHint === "string" && incomingSportHint.trim()
      ? incomingSportHint.trim()
      : "";

  if (
    textualSport &&
    h &&
    textualSport !== h &&
    h !== "generic" &&
    h !== "image_review"
  ) {
    return textualSport;
  }

  if (h) return h;

  if (
    golfContext &&
    (golfContext.currentEvent?.name ||
      (Array.isArray(golfContext.currentEvent?.leaderboard) &&
        golfContext.currentEvent.leaderboard.length > 0))
  ) {
    return "golf";
  }

  if (textualSport) return textualSport;

  if (hasImage) return "generic";

  return "generic";
}

function normalizeAvailabilityStatusClass(value) {
  const s = String(value || "").toLowerCase();
  if (!s) return "";
  if (s.includes("questionable") || s.includes("gtd")) return "questionable";
  if (s.includes("doubtful")) return "doubtful";
  if (s.includes("out") || s.includes("inactive")) return "out";
  return "";
}

function getNbaSeriesGameNumberForGame(game, playoffSeries) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !Array.isArray(playoffSeries)) return 0;
  const row = playoffSeries.find((s) => {
    const sa = String(s?.away || "").toUpperCase();
    const sh = String(s?.home || "").toUpperCase();
    return (sa === away && sh === home) || (sa === home && sh === away);
  });
  if (!row) return 0;
  const sa = String(row?.away || "").toUpperCase();
  const sh = String(row?.home || "").toUpperCase();
  const awayWins = sa === away && sh === home ? Number(row?.awayWins || 0) : Number(row?.homeWins || 0);
  const homeWins = sa === away && sh === home ? Number(row?.homeWins || 0) : Number(row?.awayWins || 0);
  const played = (Number.isFinite(awayWins) ? awayWins : 0) + (Number.isFinite(homeWins) ? homeWins : 0);
  return played + 1;
}

/**
 * Explicit series snapshot for the Haiku JSON payload when the question anchors a matchup.
 * playoffSeries rows are ESPN-shaped: { away, home, awayWins, homeWins, round, status }.
 * awayF/homeF follow resolveNbaMatchupFromQuestion board order (@ away at home).
 */
function buildFocusedPlayoffSeriesSnapshot(awayF, homeF, playoffSeriesRows, todaysGames) {
  const af = String(awayF || "").toUpperCase();
  const hf = String(homeF || "").toUpperCase();
  const game = (todaysGames || []).find((g) => {
    const a = String(g?.awayTeam?.abbr || "").toUpperCase();
    const h = String(g?.homeTeam?.abbr || "").toUpperCase();
    return (a === af && h === hf) || (a === hf && h === af);
  });
  if (!af || !hf) return null;
  const hasPlayoffRows = Array.isArray(playoffSeriesRows) && playoffSeriesRows.length > 0;
  const row = hasPlayoffRows
    ? (playoffSeriesRows.find((s) => {
        const sa = String(s?.away || "").toUpperCase();
        const sh = String(s?.home || "").toUpperCase();
        return (sa === af && sh === hf) || (sa === hf && sh === af);
      }) || null)
    : null;

  const gameSeriesSummary = String(game?.seriesSummary || "").trim();
  const gameSeriesLeader = String(game?.seriesLeader || "").toUpperCase();
  const gameSeriesWins = Number(game?.seriesWins);
  const gameSeriesDeficit = Number(game?.seriesDeficit);
  const hasGameSeries =
    gameSeriesSummary &&
    Number.isFinite(gameSeriesWins) &&
    Number.isFinite(gameSeriesDeficit) &&
    gameSeriesWins >= 0 &&
    gameSeriesDeficit >= 0;
  if (!hasGameSeries && !row) return null;

  const nextGameNum = hasGameSeries
    ? gameSeriesWins + gameSeriesDeficit + 1
    : getNbaSeriesGameNumberForGame(
        game || { awayTeam: { abbr: af }, homeTeam: { abbr: hf } },
        playoffSeriesRows,
      );

  let winsAwayF = 0;
  let winsHomeF = 0;
  if (hasGameSeries && (gameSeriesLeader === af || gameSeriesLeader === hf)) {
    if (gameSeriesLeader === af) {
      winsAwayF = gameSeriesWins;
      winsHomeF = gameSeriesDeficit;
    } else {
      winsAwayF = gameSeriesDeficit;
      winsHomeF = gameSeriesWins;
    }
  } else if (row) {
    const sa = String(row?.away || "").toUpperCase();
    const sh = String(row?.home || "").toUpperCase();
    if (sa === af && sh === hf) {
      winsAwayF = Number(row?.awayWins) || 0;
      winsHomeF = Number(row?.homeWins) || 0;
    } else if (sa === hf && sh === af) {
      winsAwayF = Number(row?.homeWins) || 0;
      winsHomeF = Number(row?.awayWins) || 0;
    }
  }

  const leader =
    winsAwayF > winsHomeF ? af : winsHomeF > winsAwayF ? hf : "tied";
  const serverSummaryOneLiner =
    leader === "tied"
      ? `${af} and ${hf} are tied ${winsAwayF}-${winsHomeF}${nextGameNum > 0 ? ` — Game ${nextGameNum} tonight` : ""}.`
      : `${leader} leads ${Math.max(winsAwayF, winsHomeF)}-${Math.min(winsAwayF, winsHomeF)}${nextGameNum > 0 ? ` — Game ${nextGameNum} tonight` : ""}.`;

  const priorFinals = Array.isArray(row?.completedGamesCombinedPoints) ? row.completedGamesCombinedPoints : [];
  const avgCombined = row?.completedGamesCombinedPointsAverage;
  let summaryWithAvg = serverSummaryOneLiner;
  if (priorFinals.length > 0 && Number.isFinite(avgCombined)) {
    summaryWithAvg += ` Completed finals in fetch window (${priorFinals.length}): combined avg ${avgCombined} pts/game.`;
  }

  return {
    awayAbbr: af,
    homeAbbr: hf,
    awayWinsInQuestionOrder: winsAwayF,
    homeWinsInQuestionOrder: winsHomeF,
    leaderAbbr: leader === "tied" ? null : leader,
    nextGameNumber: nextGameNum > 0 ? nextGameNum : null,
    round: row?.round || null,
    statusText: row?.status || gameSeriesSummary || null,
    completedGamesCombinedPoints: priorFinals,
    completedGamesCombinedPointsAverage: Number.isFinite(avgCombined) ? avgCombined : null,
    serverSummaryOneLiner: summaryWithAvg,
  };
}

function getNbaAvailabilityImpactCountForGame(game, bdlAvailability) {
  const away = String(game?.awayTeam?.abbr || "").toUpperCase();
  const home = String(game?.homeTeam?.abbr || "").toUpperCase();
  if (!away || !home || !bdlAvailability || typeof bdlAvailability !== "object") return 0;
  let count = 0;
  for (const meta of Object.values(bdlAvailability)) {
    const team = String(meta?.team || "").toUpperCase();
    if (team !== away && team !== home) continue;
    const cls = normalizeAvailabilityStatusClass(meta?.statusClass || meta?.status || meta?.availability);
    if (cls) count += 1;
  }
  return count;
}

function selectTopNbaSlateGameForGuarantee(nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (games.length === 0) return null;
  const playable = games.filter((g) => !["post", "final"].includes(String(g?.state || "").toLowerCase()));
  const candidates = playable.length > 0 ? playable : games;
  const bdlAvailability = nbaContext?.bdlAvailability || nbaContext?.bdlGrounding?.bdlAvailability || {};
  const playoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
  const scored = candidates.map((g, idx) => ({
    game: g,
    idx,
    injuryImpactCount: getNbaAvailabilityImpactCountForGame(g, bdlAvailability),
    seriesGameNumber: getNbaSeriesGameNumberForGame(g, playoffSeries),
  }));
  const maxInjury = Math.max(0, ...scored.map((s) => s.injuryImpactCount));
  if (maxInjury > 0) {
    return scored
      .filter((s) => s.injuryImpactCount === maxInjury)
      .sort((a, b) => b.seriesGameNumber - a.seriesGameNumber || a.idx - b.idx)[0];
  }
  const maxSeries = Math.max(0, ...scored.map((s) => s.seriesGameNumber));
  if (maxSeries > 0) {
    return scored
      .filter((s) => s.seriesGameNumber === maxSeries)
      .sort((a, b) => a.idx - b.idx)[0];
  }
  return scored[0];
}

function buildFirstSessionGuaranteeInjection(feature) {
  if (!feature?.game) return "";
  const g = feature.game;
  const away = String(g?.awayTeam?.abbr || g?.awayTeam?.name || "Away");
  const home = String(g?.homeTeam?.abbr || g?.homeTeam?.name || "Home");
  const seriesLine =
    feature.seriesGameNumber > 0
      ? `Series leverage: Game ${feature.seriesGameNumber} (from playoffSeries context).`
      : "Series leverage: no playoff game number present in context.";
  const injuryLine =
    feature.injuryImpactCount > 0
      ? `Injury status: ${feature.injuryImpactCount} availability flags tied to this matchup in bdlAvailability.`
      : "Injury status: no high-impact bdlAvailability flags on this matchup.";
  return `FIRST-SESSION GUARANTEE — AUTO-SURFACE TOP SLATE GAME (DO NOT REVEAL THIS INTERNAL ROUTING)
User asked a broad opener with no prior conversation. Treat this as: "here's the sharpest angle on tonight's slate."
Primary matchup to anchor: ${away} @ ${home}.
${seriesLine}
${injuryLine}
Use matchup context + injury status + series pressure to deliver one decisive angle as the opener.`;
}

function getContextQuality({
  sportHint,
  players,
  context,
  liveMatches,
  golfContext,
  nbaContext,
  mlbContext,
  nflContext,
  f1Context,
  matchupContext,
}) {
  if (matchupContext) return "high";

  if (
    sportHint === "tennis_wta_profile" &&
    players?.wta &&
    Object.keys(players.wta).length > 0
  )
    return "medium";

  if (sportHint === "tennis" && (context?.currentTournament || (liveMatches || []).length || players)) return "high";
  if (sportHint === "golf" && golfContext?.currentEvent) return "high";
  if (sportHint === "nba" && (nbaContext?.todaysGames?.length || nbaContext?.playerStats?.length)) return "high";
  if (sportHint === "mlb" && (mlbContext?.games?.length || mlbContext?.propLines?.length)) return "high";
  if (sportHint === "nfl" && nflContext) return "medium";
  if (sportHint === "f1" && (f1Context?.standings?.length || f1Context?.schedule?.races?.length)) return "high";

  return "low";
}

function deriveConfidenceLabel({
  intent,
  sportHint,
  hasImage,
  matchupContext,
  question,
  contextQuality = "medium",
  isLive = false,
}) {
  const q = normalizeText(question);
  let score = 0;

  if (sportHint && sportHint !== "generic" && sportHint !== "image_review") score += 2;
  if (intent === "slip_review") score += 2;
  if (hasImage) score += 1;
  if (matchupContext) score += 1;
  if (contextQuality === "high") score += 2;
  if (contextQuality === "medium") score += 1;

  if (
    q.includes("best") ||
    q.includes("sharpest") ||
    q.includes("safest") ||
    q.includes("highest confidence")
  ) {
    score += 1;
  }

  let label;
  if (score >= 6) label = "High";
  else if (score >= 3) label = "Medium";
  else label = "Low";

  if (isLive && label === "High") return "Medium";
  return label;
}

function buildSlipReviewPrompt({
  question,
  sportHint,
  nbaContext,
  nflContext,
  mlbContext,
  golfContext,
  f1Context,
  derivedConfidence,
  priorTakesSummary,
}) {
  let relevantContext = "";

  if (sportHint === "nba") {
    relevantContext = `NBA context:
${JSON.stringify({
  seasonContext: nbaContext?.seasonContext || null,
  todaysGames: nbaContext?.todaysGames || [],
  playoffSeries: nbaContext?.playoffSeries || [],
  propLines: (nbaContext?.propLines || []).slice(0, 80),
  injuries: nbaContext?.injuries || [],
  recentForm: nbaContext?.recentForm || "",
  gameTotals: nbaContext?.gameTotals || {},
  playerStats: (nbaContext?.playerStats || []).slice(0, 60),
  rosterGrounding: nbaContext?.rosterGrounding || null,
  todaysGamesSlateMeta: nbaContext?.todaysGamesSlateMeta || null,
  todaysGamesSlateNote: nbaContext?.todaysGamesSlateNote || null,
}, null, 2)}`;
  } else if (sportHint === "nfl") {
    relevantContext = `NFL context:
${typeof nflContext === "string" ? nflContext : JSON.stringify(nflContext || {}, null, 2)}`;
  } else if (sportHint === "mlb") {
    relevantContext = `MLB context:
${JSON.stringify(mlbContext || {}, null, 2)}`;
  } else if (sportHint === "golf") {
    relevantContext = `Golf context:
${JSON.stringify(golfContext || {}, null, 2)}`;
  } else if (sportHint === "f1") {
    relevantContext = `F1 context:
${JSON.stringify(f1Context || {}, null, 2)}`;
  }

  return `You are reviewing a betting slip or pick entry.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}User request:
${question}

Sport:
${sportHint || "unknown"}

${relevantContext}

Critical rules:
- Prioritize the image/slip content first.
- Only mention players, teams, games, props, injuries, pricing, matchup edges, or market timing if they are visible in the image or supported by the provided context.
- Do NOT invent matchup analysis that is not supported by the image or context.
- Do NOT claim line shopping, stale pricing, or market movement unless the context clearly supports it.
- If the slip is repetitive, say that directly.
- Use "repetitive construction" or "same-stat fragility" instead of "correlation" unless the legs are truly linked.
- If details are partially unreadable, say what you can confirm and stop there.
- Be sharp, concise, and product-quality.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Do not call something High unless the image and context clearly justify it.

Required response format:

OPENING TAKE
[one sharp sentence]

SLIP VERDICT
[Keep / Trim / Fade / Rebuild]

BIGGEST STRENGTH
[one to two lines]

BIGGEST RISK
[one to two lines]

BEST KEEP
[one line]

FIRST CUT
[one line]

CONFIDENCE
[High / Medium / Low]

TIMING
[one line]`;
}

function hasObjectKeys(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0);
}

function resolveOddsAvailabilityForSport({
  sportHint,
  nbaContext,
  mlbContext,
  golfContext,
  f1Context,
  nflContext,
  liveMatches,
  context,
}) {
  if (sportHint === "nba") {
    return Array.isArray(nbaContext?.propLines) && nbaContext.propLines.length > 0;
  }
  if (sportHint === "mlb") {
    const hasProps = Array.isArray(mlbContext?.propLines) && mlbContext.propLines.length > 0;
    const hasTotals = hasObjectKeys(mlbContext?.gameTotals);
    return hasProps || hasTotals;
  }
  if (sportHint === "golf") {
    return Array.isArray(golfContext?.odds?.outrights) && golfContext.odds.outrights.length > 0;
  }
  if (sportHint === "f1") {
    return Boolean(
      hasObjectKeys(f1Context?.odds) ||
        Array.isArray(f1Context?.markets) ||
        Array.isArray(f1Context?.outrights),
    );
  }
  if (sportHint === "tennis" || sportHint === "tennis_wta_profile") {
    const rows = Array.isArray(liveMatches) ? liveMatches : [];
    const fromRows = rows.some((m) => m?.odd_1 != null || m?.odd_2 != null);
    const fromContext = Boolean(
      context?.odds ||
        (Array.isArray(context?.matches) &&
          context.matches.some((m) => m?.odd_1 != null || m?.odd_2 != null)),
    );
    return fromRows || fromContext;
  }
  if (sportHint === "nfl") {
    if (typeof nflContext === "string") {
      return /\bodds\b|\bline\b|\bspread\b|\btotal\b/i.test(nflContext);
    }
    return Boolean(
      nflContext?.odds ||
        nflContext?.markets ||
        nflContext?.lines ||
        nflContext?.spreads ||
        nflContext?.totals,
    );
  }
  return true;
}

// ── Anthropic call wrapper (429 retries via fetchAnthropicMessages) ──────────
async function callAnthropic({
  apiKey,
  model,
  system,
  messages,
  temperature = 0.45,
  max_tokens = 800,
}) {
  /** Allow slow Claude completions when the host permits long functions (see vercel.json maxDuration). */
  return fetchAnthropicMessages({
    apiKey,
    model,
    max_tokens,
    temperature,
    system,
    messages,
    timeoutMs: 52000,
    maxRetries: 3,
  });
}

function summarizePriorTakes(history) {
  if (!Array.isArray(history) || history.length === 0) return "";

  const assistantTurns = history.filter((h) => h.role === "assistant" || h.role === "ai");
  if (assistantTurns.length === 0) return "";

  const priorTakes = [];
  for (const turn of assistantTurns) {
    const text = String(turn.content || turn.text || "");

    // Extract THE PLAY line
    const playMatch = text.match(/THE PLAY\s*\n([^\n]+)/i);
    const confidenceMatch = text.match(/CONFIDENCE\s*\n([^\n]+)/i);
    const liveCallMatch = text.match(/LIVE CALL\s*\n([^\n]+)/i);

    const play = playMatch?.[1]?.trim() || liveCallMatch?.[1]?.trim();
    const confidence = confidenceMatch?.[1]?.trim() || "";

    if (play) {
      priorTakes.push({
        play: play.slice(0, 160),
        confidence,
      });
    }
  }

  if (priorTakes.length === 0) return "";

  const lines = priorTakes
    .slice(-5) // last 5 takes in session
    .map((t, i) => `${i + 1}. ${t.play}${t.confidence ? ` (${t.confidence})` : ""}`)
    .join("\n");

  return `PRIOR TAKES THIS SESSION (most recent last)
${lines}

When the current question relates to any of these — same player, same team,
same game, same market, or a correlated bet — reference the prior take
explicitly. Examples:
"Related to my Cade under call — if he's under 22.5, Pistons team total
likely under 108 too."
"Same game as the Cade take above. If you're already on Cade, the Pistons
ML adds correlated risk — size accordingly."
"This is the third time you've asked about this player tonight."

Never silently contradict a prior take. If you're changing your read,
acknowledge it explicitly. If the new question is unrelated, ignore the
prior takes — don't force a connection.`;
}

function detectChaseSignals(question, history) {
  const q = normalizeText(question);

  // Explicit chase language
  const chasePhrases = [
    "i need this",
    "need this to hit",
    "have to win",
    "already bet",
    "i already took",
    "just tell me",
    "are you sure",
    "promise me",
    "guarantee",
    "can't lose this one",
    "please say",
    "tell me yes",
    "tell me it's",
    "this has to",
  ];
  const hasChaseLanguage = chasePhrases.some((p) => q.includes(p));

  // Repeated subject detection — pull last 5 user turns
  const priorUserTurns = Array.isArray(history)
    ? history
        .filter((h) => h.role === "user")
        .slice(-5)
        .map((h) => normalizeText(h.content || h.text || ""))
    : [];

  // Extract nouns/names roughly — look for capitalized-ish tokens in current question
  const currentTokens = q.split(/\s+/).filter((t) => t.length >= 4);
  const repeatedTokens = currentTokens.filter((token) =>
    priorUserTurns.some((priorQ) => priorQ.includes(token)),
  );

  // If >= 3 substantive tokens overlap with prior turns, likely same topic
  const sameTopicCount = priorUserTurns.filter((priorQ) => {
    const overlap = currentTokens.filter((t) => priorQ.includes(t));
    return overlap.length >= 3;
  }).length;

  const hasHedgingPanicLanguage =
    (q.includes("already bet") || q.includes("already took")) &&
    (q.includes("other side") ||
      /\bover\b/.test(q) ||
      /\bunder\b/.test(q) ||
      q.includes("is this safe") ||
      q.includes("is it safe"));

  return {
    hasChaseLanguage,
    sameTopicCount,
    hasHedgingPanicLanguage,
    repeatedTokenOverlap: repeatedTokens.length,
    isChase: hasChaseLanguage || sameTopicCount >= 2 || hasHedgingPanicLanguage,
  };
}

function normalizeIncomingChatHistory(raw, { maxMessages = 6 } = {}) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const h of raw) {
    const role =
      h.role === "assistant" || h.role === "ai"
        ? "assistant"
        : h.role === "user"
          ? "user"
          : null;
    const content = String(h.content ?? h.text ?? "").trim();
    if (!role || !content || /^ANALYZING/i.test(content)) continue;
    out.push({ role, content: content.slice(0, 4000) });
  }
  const merged = [];
  for (const m of out) {
    if (!merged.length && m.role === "assistant") continue;
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) {
      last.content += `\n\n${m.content}`;
      continue;
    }
    merged.push({ role: m.role, content: m.content });
  }
  return merged.slice(-maxMessages);
}

function tryParseJsonObject(text) {
  const raw = String(text || "").trim();
  const parse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };
  let o = parse(raw);
  if (o) return o;
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    o = parse(fence[1].trim());
    if (o) return o;
  }
  const m = raw.match(/\{[\s\S]*\}\s*$/);
  if (m) return parse(m[0]);
  return null;
}

function tryExtractSummaryDeepFromLooseText(text) {
  const raw = String(text || "").trim();
  const start = raw.indexOf('{"summary"');
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const candidate = JSON.parse(raw.slice(start, end + 1));
      if (candidate && typeof candidate.summary === "string") return candidate;
    } catch {
      // fall through
    }
  }

  const block = raw.match(/"summary"\s*:\s*"([\s\S]*?)"\s*,\s*"deep"\s*:\s*"([\s\S]*?)"/);
  if (block) {
    const unescape = (s) =>
      String(s || "")
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    return { summary: unescape(block[1]), deep: unescape(block[2]) };
  }
  return null;
}

function normalizeSummaryDeepPayload(summary, deep) {
  let outSummary = String(summary || "").trim();
  let outDeep = typeof deep === "string" ? deep.trim() : null;

  const nested = tryParseJsonObject(outSummary) || tryExtractSummaryDeepFromLooseText(outSummary);
  if (nested && typeof nested.summary === "string" && nested.summary.trim()) {
    outSummary = nested.summary.trim();
    outDeep =
      typeof nested.deep === "string" && nested.deep.trim()
        ? nested.deep.trim()
        : outDeep;
  }

  return {
    summary: outSummary,
    deep: outDeep,
  };
}

/** Removes internal routing labels the model sometimes echoes into user-facing text. */
function stripBannedInternalLeakStrings(text) {
  let s = String(text || "");
  s = s.replace(/\bFOLLOW-UP\s+GATE\s+VIOLATION\b\s*:?\s*/gi, "");
  return s.replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Global opener sanitizer: remove lead-in paragraphs that describe missing data
 * instead of giving analysis. Keeps the rest of the answer intact.
 */
function stripBannedDataAvailabilityOpener(text) {
  let s = stripBannedInternalLeakStrings(String(text || "").trim());
  if (!s) return s;
  const bannedLead =
    /^(?:no edge(?: here)?\.?|no\s+(?:player\s+)?prop\s+markets?\s+(?:posted|available)\b|i don't have\b|i can'?t\b|without\b|the context provided\b|the data provided\b|come back when\b|when (?:markets?|prices?) post\b|props?\s+(?:aren'?t|are not)\s+(?:fully\s+)?available\b)/i;
  for (let i = 0; i < 4; i += 1) {
    const paras = s.split(/\n\n+/);
    if (!paras.length) break;
    const head = String(paras[0] || "").trim();
    if (!head) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    if (bannedLead.test(head)) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    break;
  }
  return s.trim();
}

/**
 * Global body sanitizer: remove legacy performance-tracker strings from any line
 * in the model output (summary or deep), not just the opener.
 */
function stripBannedPerformanceTrackerLines(text) {
  let s = stripBannedInternalLeakStrings(String(text || ""));
  if (!s.trim()) return s.trim();
  const bannedLineMatchers = [
    /historical record/i,
    /\b0-0-0\b/i,
    /\b0\.0u\b/i,
    /last 30 days on this confidence tier/i,
    /tier historical record/i,
  ];
  const kept = s
    .split(/\r?\n/)
    .filter((line) => !bannedLineMatchers.some((re) => re.test(line)));
  return stripBannedInternalLeakStrings(kept.join("\n").replace(/\n{3,}/g, "\n\n").trim());
}

/**
 * BDL grounding leak — model hallucinations of internal grounding notes.
 * Pattern is intentionally broad so variants (different verbs, different surrounding text,
 * different BallDontLie phrasings) all collapse to the same strip.
 */
const NBA_BDL_LEAK_PATTERN =
  /\bBDL\s+grounding\b|\bBallDontLie\s+(?:grounding|roster|slate|data)\b|\b(?:could|cannot|couldn't|can't|did\s+not|didn't)\s+cleanly\s+match\b/i;

/** Drops leading roster/data-disclosure paragraphs models still emit despite prompt bans. */
export function stripNbaLeadInDisclosure(text) {
  let s = String(text || "").trim();
  if (!s) return s;
  const bannedLead =
    /\b(?:I don't have tonight's confirmed roster|beyond the verified names in the system|Working from partial roster data|working from partial roster data|verified names in the system|partial roster data|roster data is still loading|combined API \+ product UI|clientUiAugmented)\b/i;
  const cantConfirm =
    /^I can't confirm[^\n]*(roster|lineup|availability|names|data)[^\n]*$/im;
  for (let i = 0; i < 4; i += 1) {
    const paras = s.split(/\n\n+/);
    if (!paras.length) break;
    const head = paras[0].trim();
    if (!head) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    if (bannedLead.test(head) || cantConfirm.test(head) || NBA_BDL_LEAK_PATTERN.test(head)) {
      s = paras.slice(1).join("\n\n").trim();
      continue;
    }
    break;
  }
  // Body sweep — drop any paragraph anywhere that mentions BDL grounding leak phrasing.
  s = s
    .split(/\n\n+/)
    .filter((p) => !NBA_BDL_LEAK_PATTERN.test(p))
    .join("\n\n")
    .trim();
  return s.trim();
}

/**
 * Post-gen confidence vocabulary normalizer — runs on every NBA response.
 * Maps any legacy Tier 1/2/3 + STRONG EDGE/LEAN/WATCH labels the model still produces
 * back into the canonical High / Medium / Speculative vocabulary.
 */
export function normalizeConfidenceVocabularyInText(text) {
  let s = String(text || "");
  if (!s) return s;
  const tierMap = { 1: "High", 2: "Medium", 3: "Speculative" };
  // "Tier N" with optional "- STRONG EDGE / LEAN / WATCH" suffix → canonical label.
  s = s.replace(
    /\bTier\s*([1-3])(?:\s*[-—:]\s*(?:STRONG\s*EDGE|Strong\s*Edge|strong\s*edge|LEAN|Lean|lean|WATCH|Watch|watch))?\b/g,
    (_m, n) => tierMap[Number(n)] || _m,
  );
  // CONFIDENCE label lines that still emit STRONG EDGE / LEAN / WATCH.
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)STRONG\s+EDGE\b/gi, "$1High");
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)LEAN\b/gi, "$1Medium");
  s = s.replace(/(\bCONFIDENCE\b\s*[:\n]+\s*)WATCH\b/gi, "$1Speculative");
  // Bare uppercase compound STRONG EDGE anywhere is unambiguously the legacy label.
  s = s.replace(/\bSTRONG\s+EDGE\b/g, "High");
  return s;
}

function isTruthyFlag(v) {
  const s = String(v || "").trim().toLowerCase();
  return s === "1" || s === "true" || s === "yes" || s === "on";
}

function buildNbaObservabilityMeta({
  decisionMode,
  sport,
  matchupGroundingApplied,
  postValidationChecked,
  postValidationTriggered,
  fallbackOrRepairUsed,
}) {
  return {
    decisionMode: String(decisionMode || "none"),
    sport: String(sport || "nba"),
    matchupGroundingApplied: Boolean(matchupGroundingApplied),
    postValidationChecked: Boolean(postValidationChecked),
    postValidationTriggered: Boolean(postValidationTriggered),
    fallbackOrRepairUsed: Boolean(fallbackOrRepairUsed),
  };
}

function logNbaObservability(meta) {
  console.log(
    JSON.stringify({
      event: "ur_take_nba_observability",
      ...meta,
    }),
  );
}

/** Removes internal control markers from user-visible prose. */
function stripNbaInternalControlLabels(text) {
  const s = String(text || "");
  if (!s.trim()) return s.trim();
  return s
    .split(/\r?\n/)
    .filter((line) => {
      const l = String(line || "").trim();
      if (!l) return true;
      if (/^DECISION MODE:\s*/i.test(l)) return false;
      if (/NBA SERVER DECISION MODE/i.test(l)) return false;
      if (/CONDITIONAL_WAIT MODE/i.test(l)) return false;
      if (/^NBA GAME-STATE AUTHORITY\b/i.test(l)) return false;
      return true;
    })
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function findFocusedNbaGameFromBoard(nbaContext, matchup) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (!games.length) return null;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    const aa = String(matchup.awayAbbr).toUpperCase();
    const ha = String(matchup.homeAbbr).toUpperCase();
    const hit = games.find(
      (g) =>
        String(g?.awayTeam?.abbr || "").toUpperCase() === aa &&
        String(g?.homeTeam?.abbr || "").toUpperCase() === ha,
    );
    if (hit) return hit;
  }
  if (games.length === 1) return games[0];
  return null;
}

function buildNbaGameStateGateSnapshot(nbaContext, matchup) {
  const focusedGame = findFocusedNbaGameFromBoard(nbaContext, matchup);
  const phase = classifyNbaBoardGamePhase(focusedGame);
  const verifiedBoxScore = nbaGameHasVerifiedBoxScore(focusedGame);
  const allowsLiveNarrative =
    verifiedBoxScore && (phase === "live" || phase === "halftime" || phase === "final");
  return { focusedGame, phase, verifiedBoxScore, allowsLiveNarrative };
}

function buildNbaGameStateAuthorityBlock(gate) {
  if (!gate || typeof gate !== "object") return "";
  const { phase, verifiedBoxScore, allowsLiveNarrative } = gate;
  const phaseLabel = String(phase || "unknown");

  let rules =
    "- Phase comes ONLY from `todaysGames[]` rows (state, status, scores, period, clock). Never infer score or quarter from user wording alone.\n";
  if (!allowsLiveNarrative) {
    rules +=
      "- STRICT: Do not state or imply current in-game score, quarter, clock, halftime, live momentum, or pace math from invented game state.\n";
    rules += `- Board-classified phase for this matchup: **${phaseLabel}**. Use pregame-safe reasoning from injuries, matchup structure, series context, and listed markets only; do not explain missing live data to the user.\n`;
  } else {
    rules +=
      "- Live/halftime/final numbers may appear ONLY when copied from JSON for this game (scores/status). Never invent clocks or quarters.\n";
  }

  return `NBA GAME-STATE AUTHORITY (SERVER — obey; never quote this header)
Focused matchup phase (board-derived): ${phaseLabel}. Verified box scores on focused row: ${verifiedBoxScore ? "yes" : "no"}.
${rules}`;
}

function buildNbaLiveNoPropSystemPromptBlock(gate, nbaContext) {
  const phase = String(gate?.phase || "").toLowerCase();
  const isLiveGame = phase === "live" || phase === "halftime";
  const props = Array.isArray(nbaContext?.propLines) ? nbaContext.propLines : [];
  const focusedGame = gate?.focusedGame || null;
  const relevantPropCount = focusedGame
    ? props.filter((pl) => gameRowMatchesPropGame(pl?.game, focusedGame)).length
    : props.length;
  if (!gate?.allowsLiveNarrative || !isLiveGame || relevantPropCount > 0) return "";

  return `NBA LIVE GAME RULE — PROP MARKETS UNAVAILABLE (SERVER — obey; never quote this header)
Never surface technical errors, variable names, array names, HTTP status codes, or API details to users. Ever. No exceptions.
When prop lines are unavailable, do not mention it. Do not apologize. Do not explain. Pivot to the strongest angle from live game state: minutes played, pace, foul trouble, rotation patterns, early stat lines, and matchup dynamics.
The opener is governed by Step 1 of the framework — state the trigger condition (live minute, foul count, rotation shift); do not open with what you don't have.
When analyzing a live game, close the response with a one-line signature in this format: TEAM1 SCORE, TEAM2 SCORE · Q? TIME · Live. This replaces the need to announce "the game is live" in the opening.`;
}

function formatNbaLiveScoreSignature(game) {
  if (!game || typeof game !== "object") return "";
  const awayAbbr = String(game?.awayTeam?.abbr || "AWAY").toUpperCase();
  const homeAbbr = String(game?.homeTeam?.abbr || "HOME").toUpperCase();
  const awayScore = game?.awayTeam?.score;
  const homeScore = game?.homeTeam?.score;
  if (!Number.isFinite(Number(awayScore)) || !Number.isFinite(Number(homeScore))) return "";

  const period = Number(game?.period);
  const quarter = Number.isFinite(period) && period > 0 ? `Q${period}` : "Q?";
  const clock = String(game?.clock || "").trim() || String(game?.status || "").trim() || "time unavailable";
  return `${awayAbbr} ${Number(awayScore)}, ${homeAbbr} ${Number(homeScore)} · ${quarter} ${clock} · Live.`;
}

/* Post-generation live-state repair (regex replace of model output) intentionally not shipped yet.
   Rely on data gate + NBA GAME-STATE AUTHORITY prompt block first; add repair only if production
   shows the model still hallucinates scores/times after that. */

function normalizeConfidenceVocabulary(label) {
  const s = String(label || "").trim().toLowerCase();
  if (s === "high") return "High";
  if (s === "medium" || s === "lean") return "Medium";
  if (s === "speculative" || s === "low" || s === "watch") return "Speculative";
  return "";
}

function confidenceVocabRank(label) {
  const norm = normalizeConfidenceVocabulary(label);
  if (norm === "High") return 3;
  if (norm === "Medium") return 2;
  return 1;
}

function confidenceVocabFromRank(rank) {
  if (rank >= 3) return "High";
  if (rank >= 2) return "Medium";
  return "Speculative";
}

function ensureNbaTakeConfidenceConsistency({
  takeRecord,
  decisionMode,
  derivedConfidence,
  confidenceModifier,
}) {
  if (!takeRecord || typeof takeRecord !== "object") return takeRecord;

  // Terminal floor: conditional_wait always emits Speculative regardless of model output.
  if (decisionMode === "conditional_wait") {
    return {
      ...takeRecord,
      confidence: "Speculative — Status unresolved; wait for final availability.",
    };
  }

  const reason = String(confidenceModifier?.reason || "").trim();
  const modifierLabel = normalizeConfidenceVocabulary(
    confidenceModifier?.label || derivedConfidence || "Speculative",
  );
  const modifierRank = confidenceVocabRank(modifierLabel);

  const current = String(takeRecord.confidence || "").trim();
  const isMissing = !current || /^unspecified$/i.test(current);
  const headMatch = current.match(/^([A-Za-z]+)/);
  const modelLabel = headMatch ? normalizeConfidenceVocabulary(headMatch[1]) : "";
  const modelRank = modelLabel ? confidenceVocabRank(modelLabel) : modifierRank;

  // Clamp: final rank cannot exceed modifier rank (e.g. modifier Speculative blocks model High).
  const finalRank = Math.min(modelRank, modifierRank);
  const finalLabel = confidenceVocabFromRank(finalRank);

  // If clamp dropped the model's tier, the model's prose justification no longer holds — replace with modifier reason.
  if (!isMissing && finalRank < modelRank) {
    return {
      ...takeRecord,
      confidence: reason ? `${finalLabel} — ${reason}` : finalLabel,
    };
  }

  // Model wrote a valid tier within the cap — preserve as-is.
  if (!isMissing && modelLabel) {
    return takeRecord;
  }

  // Missing or unspecified — fill with clamped label + modifier reason.
  return {
    ...takeRecord,
    confidence: reason ? `${finalLabel} — ${reason}` : finalLabel,
  };
}

function hasNbaNoMarketHardFail(text) {
  const s = String(text || "");
  return /\bno edge here\b/i.test(s) ||
    /\bcome back (?:when|later)\b/i.test(s) ||
    /\bwait for lines\b/i.test(s) ||
    /^\s*no\s+(?:player\s+)?prop\s+markets?\s+(?:posted|available)\b/i.test(s) ||
    /\bprops?\s+(?:aren't|are not)\s+(?:fully\s+)?available\b/i.test(s) ||
    /\bno confirmed (?:markets?|prices?)\b/i.test(s) ||
    /\bmarket snapshot is empty\b/i.test(s) ||
    /^\s*no (?:markets?|prices?) posted\b/i.test(s);
}

function isNbaNoMarketUpcomingSlate(nbaContext) {
  const props = Array.isArray(nbaContext?.propLines) ? nbaContext.propLines : [];
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const hasUpcoming = games.some((g) => {
    const state = String(g?.state || "").toLowerCase();
    return state !== "post";
  });
  return props.length === 0 && hasUpcoming;
}

function buildNbaNoMarketHardFallback(question, nbaContext) {
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  const qTeams = extractNbaTeamAbbrevsFromQuestion(question);

  const gameForQuestion = games.find((g) => {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    return qTeams.length >= 2
      ? qTeams.includes(aa) && qTeams.includes(ha)
      : qTeams.length === 1
        ? qTeams.includes(aa) || qTeams.includes(ha)
        : false;
  }) || games.find((g) => String(g?.state || "").toLowerCase() !== "post") || games[0] || null;

  const away = String(gameForQuestion?.awayTeam?.abbr || qTeams[0] || "AWAY").toUpperCase();
  const home = String(gameForQuestion?.homeTeam?.abbr || qTeams[1] || "HOME").toUpperCase();
  const title = `${away} @ ${home}`;
  const phase = classifyNbaBoardGamePhase(gameForQuestion);
  const isLiveGame = phase === "live" || phase === "halftime";
  const liveSignature = formatNbaLiveScoreSignature(gameForQuestion);

  const pbt = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const awayName = Array.isArray(pbt?.[away]) ? pbt[away][0] : null;
  const homeName = Array.isArray(pbt?.[home]) ? pbt[home][0] : null;

  const totalKeys = Object.keys(nbaContext?.gameTotals || {});
  const maybeTotal = totalKeys.length > 0 ? nbaContext.gameTotals[totalKeys[0]]?.total : null;
  const lowBand = Number.isFinite(Number(maybeTotal)) ? Math.max(208.5, Number(maybeTotal) - 5) : 214.5;
  const highBand = Number.isFinite(Number(maybeTotal)) ? Number(maybeTotal) + 1.5 : 221.5;

  const p1 = awayName
    ? `${awayName} volume is the first prop angle: lean over points if his opener lands in a fair band, and fade only if it opens materially above role baseline.`
    : `${away} shot-creation volume is the first prop angle: lean overs on lead usage if books hang conservative numbers.`;
  const p2 = homeName
    ? `${homeName} creation counters that: look assists/points depending on coverage, and avoid extremes unless the opener is clearly mispriced.`
    : `${home} primary initiator creation is the counter-angle: target assists or points based on coverage, not guesswork.`;

  if (isLiveGame) {
    const liveP1 = awayName
      ? `${awayName}'s live role is the first angle: weigh his minutes, touches, and foul count before chasing raw scoring pace.`
      : `${away} shot-creation is the first angle: weigh live touches and rotation shape before chasing raw scoring pace.`;
    const liveP2 = homeName
      ? `${homeName}'s counter is creation volume: his assists/points profile gets stronger if the defense is sending help early.`
      : `${home} primary creation is the counter-angle: trust role, matchup pressure, and foul trouble over stale pregame assumptions.`;

    return `${title} is a live-state read now: lean into the side creating cleaner possessions and avoid chasing raw pace unless minutes and rotation pattern support it.

${liveP1} ${liveP2}

Early stat lines matter more than pregame priors now: foul trouble, shortened rotations, and whether the lead creators are getting full run should drive the next move. If the game is producing paint touches and free throws without empty transition possessions, live overs get cleaner; if both teams are bleeding clock, stay selective.

${liveSignature || `${away} ?, ${home} ? · Q? ${String(gameForQuestion?.status || "in progress").trim()} · Live.`}`;
  }

  return `Check your books now, then lean into the strongest pregame angle.

${title} pregame edge is the number, not the delay.

${p1} ${p2}

Game total framework: under is the lean if the opener is ${highBand.toFixed(1)} or higher; over only becomes playable if it opens ${lowBand.toFixed(1)} or lower. In the middle band, stay selective and price-sensitive.

Live trigger: if the first 6 minutes produce 8+ combined free throws or repeated early-clock paint attacks, pivot to live over; if both teams are walking it up and living late-clock, stay with under angles.`;
}

function escapeRegExp(v) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeNbaAvailabilityClass(status, detail = "") {
  const s = `${String(status || "").toLowerCase()} ${String(detail || "").toLowerCase()}`;
  if (
    /\b(out|inactive|dnp|did not play|ruled out|available:\s*out|suspended|not with team)\b/.test(s)
  ) {
    return "out";
  }
  if (/\b(doubtful)\b/.test(s)) return "doubtful";
  if (/\b(questionable|game[- ]time decision|gtd|probable)\b/.test(s)) return "questionable";
  return "unknown";
}

function hasMaterialNbaNewsImpact(newsImpact) {
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  return teams.some((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0);
}

function getNbaInjuryIndex(nbaContext) {
  const map = new Map();
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    if (!name) continue;
    map.set(name.toLowerCase(), {
      player: name,
      team: String(row?.team || "").toUpperCase(),
      statusRaw: String(row?.status || "").trim(),
      detail: String(row?.detail || "").trim(),
      statusClass: normalizeNbaAvailabilityClass(row?.status, row?.detail),
    });
  }
  return map;
}

function findLastUrTakeAssistantContent(rawHistory) {
  const norm = normalizeIncomingChatHistory(rawHistory);
  for (let i = norm.length - 1; i >= 0; i--) {
    if (norm[i].role === "assistant") return norm[i].content;
  }
  return "";
}

function extractPriorAssistantKeyPositions(assistantText) {
  const raw = String(assistantText || "").trim();
  if (!raw) return "(none)";
  const jsonObj = tryParseJsonObject(raw);
  const nested = jsonObj || tryExtractSummaryDeepFromLooseText(raw);
  if (nested && typeof nested.summary === "string" && nested.summary.trim()) {
    const deep =
      typeof nested.deep === "string" && nested.deep.trim() ? nested.deep.trim() : "";
    const merged = [nested.summary.trim(), deep].filter(Boolean).join(" ");
    const collapsed = merged.replace(/\s+/g, " ").trim();
    return collapsed.slice(0, 700) || "(none)";
  }
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const scored = lines.filter(
    (l) =>
      /^(>>|THE PLAY|LEAN|CONFIDENCE|PROP PROJECTIONS|MATCH READ)/i.test(l) ||
      /\b(lean|fade|under|over|the play|PASS)\b/i.test(l),
  );
  const pick = scored.length
    ? scored.slice(0, 10).join(" | ")
    : raw.replace(/\s+/g, " ").trim();
  return pick.slice(0, 700) || "(none)";
}

function summarizeNbaInjuryFlagsForFollowUp(nbaContextForModel, nbaMatchup) {
  const teams = new Set();
  const away = String(nbaMatchup?.awayAbbr || "").toUpperCase();
  const home = String(nbaMatchup?.homeAbbr || "").toUpperCase();
  if (away) teams.add(away);
  if (home) teams.add(home);
  const injuries = Array.isArray(nbaContextForModel?.injuries) ? nbaContextForModel.injuries : [];
  const bits = [];
  for (const row of injuries) {
    const t = String(row?.team || "").toUpperCase();
    if (teams.size > 0 && t && !teams.has(t)) continue;
    const name = String(row?.player || "").trim();
    if (!name) continue;
    const statusClass = normalizeNbaAvailabilityClass(row?.status, row?.detail);
    if (statusClass === "out" || statusClass === "doubtful" || statusClass === "questionable") {
      bits.push(`${name} (${t || "?"}): ${statusClass}`);
    }
  }
  if (bits.length === 0) return "none flagged out/doubtful/questionable on injuries for this matchup";
  return bits.slice(0, 14).join("; ");
}

function resolveNbaFollowUpMatchupForCompact(nbaMatchup, question, nbaContextForModel) {
  if (nbaMatchup?.awayAbbr && nbaMatchup?.homeAbbr) return nbaMatchup;
  const abbrs = extractNbaTeamAbbrevsFromQuestion(String(question || ""));
  if (abbrs.length < 2) return nbaMatchup;
  const games = Array.isArray(nbaContextForModel?.todaysGames) ? nbaContextForModel.todaysGames : [];
  const exact = games.find((g) => {
    const ga = String(g?.awayTeam?.abbr || "").toUpperCase();
    const gh = String(g?.homeTeam?.abbr || "").toUpperCase();
    return abbrs.includes(ga) && abbrs.includes(gh);
  });
  if (exact) {
    return {
      awayAbbr: String(exact?.awayTeam?.abbr || "").toUpperCase(),
      homeAbbr: String(exact?.homeTeam?.abbr || "").toUpperCase(),
    };
  }
  return { awayAbbr: abbrs[0], homeAbbr: abbrs[1] };
}

/**
 * Injected on NBA follow-up turns so Haiku cannot "remember" ex-roster names after JSON strip.
 * Uses rosterGrounding.playersByTeamAbbrev for the focused matchup and any abbrs named in the question.
 */
function buildFollowUpVerifiedRosterByTeamBlock(nbaContextForModel, matchupForCompact, question) {
  const pbt = nbaContextForModel?.rosterGrounding?.playersByTeamAbbrev;
  if (!pbt || typeof pbt !== "object") {
    return "Verified rosters (playersByTeamAbbrev): none in payload — do not name specific NBA players; use team-level reads only or say the board is missing roster verification for this request.";
  }
  const teamSet = new Set();
  const a = String(matchupForCompact?.awayAbbr || "").toUpperCase();
  const h = String(matchupForCompact?.homeAbbr || "").toUpperCase();
  if (a) teamSet.add(a);
  if (h) teamSet.add(h);
  for (const ab of extractNbaTeamAbbrevsFromQuestion(String(question || ""))) {
    if (ab) teamSet.add(String(ab).toUpperCase());
  }
  if (teamSet.size === 0) {
    return "Verified rosters (playersByTeamAbbrev): (no team scope) — do not name specific players.";
  }
  const lines = [];
  for (const t of teamSet) {
    const list = pbt[t];
    const arr = Array.isArray(list) ? list : [];
    const display = arr.length
      ? arr
          .map((n) => String(n || "").trim())
          .filter(Boolean)
          .join(", ")
      : "(no names listed for this team in this payload)";
    lines.push(`${t}: ${display}`);
  }
  return `Verified rosters — playersByTeamAbbrev (ONLY use these names as verified for each team; max ~40 names/team in source)\n${lines.join(
    "\n",
  )}`;
}

function buildNbaFollowUpCompactContextLines({ nbaMatchup, nbaContextForModel, incomingHistory, question }) {
  const matchupForCompact = resolveNbaFollowUpMatchupForCompact(
    nbaMatchup,
    question,
    nbaContextForModel,
  );
  const away = String(matchupForCompact?.awayAbbr || "").toUpperCase();
  const home = String(matchupForCompact?.homeAbbr || "").toUpperCase();
  const matchupLine =
    away && home
      ? `Matchup: ${away} @ ${home}`
      : "Matchup: (not resolved from question — use question text only)";

  const snap = nbaContextForModel?.focusedSeriesSnapshot;
  let seriesRecordLine = "";
  let seriesAvgLine = "";
  if (snap && away && home) {
    seriesRecordLine = `Series record (question order ${snap.awayAbbr} away vs ${snap.homeAbbr} home): ${snap.awayWinsInQuestionOrder}-${snap.homeWinsInQuestionOrder}`;
    seriesAvgLine = Number.isFinite(snap.completedGamesCombinedPointsAverage)
      ? `Series completed-game combined scoring average: ${snap.completedGamesCombinedPointsAverage}`
      : "Series completed-game combined scoring average: n/a";
  } else {
    const rows = Array.isArray(nbaContextForModel?.playoffSeries) ? nbaContextForModel.playoffSeries : [];
    const row =
      rows.find((r) => {
        const sa = String(r?.away || "").toUpperCase();
        const sh = String(r?.home || "").toUpperCase();
        return away && home && ((sa === away && sh === home) || (sa === home && sh === away));
      }) || null;
    if (row) {
      const sa = String(row?.away || "").toUpperCase();
      const sh = String(row?.home || "").toUpperCase();
      const aw = Number(row?.awayWins) || 0;
      const hw = Number(row?.homeWins) || 0;
      seriesRecordLine = `Series record (${sa} @ ${sh} ESPN row order): ${aw}-${hw}`;
      const avg = row?.completedGamesCombinedPointsAverage;
      seriesAvgLine = Number.isFinite(Number(avg))
        ? `Series completed-game combined scoring average: ${avg}`
        : "Series completed-game combined scoring average: n/a";
    } else {
      seriesRecordLine = "Series record: unavailable";
      seriesAvgLine = "Series completed-game combined scoring average: n/a";
    }
  }

  const injuryLine = `Current injury flags: ${summarizeNbaInjuryFlagsForFollowUp(
    nbaContextForModel,
    matchupForCompact,
  )}`;
  const rosterBlock = buildFollowUpVerifiedRosterByTeamBlock(
    nbaContextForModel,
    matchupForCompact,
    question,
  );
  const priorLine = `Prior response key positions: ${extractPriorAssistantKeyPositions(findLastUrTakeAssistantContent(incomingHistory))}`;
  return `${matchupLine}\n${seriesRecordLine}\n${seriesAvgLine}\n${injuryLine}\n${rosterBlock}\n${priorLine}`;
}

function buildUrTakeFollowUpCoreSystemPrompt() {
  return `${buildCoreFrameworkPrompt()}

FABRICATION GUARDRAIL — MANDATORY
Do not invent players, teams, lines, scores, or stats that are not explicitly supplied in the compact NBA context block in the user message.
Estimated prop thresholds derived from playerStats in context when live odds are unavailable are authorized — label them clearly as season-average estimates, not as posted book lines.

ROSTER ENFORCEMENT — MANDATORY
Only name players from the verified roster list provided. Never use training memory for player names.

ARITHMETIC RULE — MANDATORY
When you reference pace math, totals, or series scoring averages, show the arithmetic in one line so it is checkable (example: "218 + 211 + 225 = 654 combined → 654/3 = 218 avg").

FOLLOW-UP STYLE — MANDATORY
Answer only the specific question asked. 3-5 sentences maximum. No section headers. No MATCH READ. No PROP PROJECTIONS. Speak like a sharp friend replying to a text.`;
}

function buildNbaPlayerUniverse(nbaContext) {
  const set = new Set();
  const grounded = nbaContext?.bdlGrounding?.bdlGroundedPlayers || {};
  for (const name of Object.keys(grounded)) {
    const normalized = String(name || "").trim();
    if (normalized) set.add(normalized);
  }
  for (const row of nbaContext?.playerStats || []) {
    const name = String(row?.name || "").trim();
    if (name) set.add(name);
  }
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    if (name) set.add(name);
  }
  return [...set];
}

export function resolveQuestionNbaPlayers(question, nbaContext) {
  const q = String(question || "").trim();
  if (!q) return [];
  const players = buildNbaPlayerUniverse(nbaContext);
  const sorted = players
    .map((name) => String(name || "").trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const hits = [];
  const seen = new Set();
  const expandCandidateName = (candidate) => {
    const raw = String(candidate || "").trim();
    if (!raw) return "";
    const normalized = normalizeNbaMarketPlayerKey(raw);
    const exact = sorted.find((name) => normalizeNbaMarketPlayerKey(name) === normalized);
    if (exact) return exact;
    const firstToken = normalized.split(" ")[0];
    if (!firstToken) return raw;
    const tokenMatches = sorted.filter((name) => {
      const key = normalizeNbaMarketPlayerKey(name);
      const start = key.split(" ")[0];
      return start === firstToken;
    });
    return tokenMatches.length === 1 ? tokenMatches[0] : raw;
  };
  const pushHit = (name) => {
    const n = expandCandidateName(name);
    const k = n.toLowerCase();
    if (!n || seen.has(k)) return;
    seen.add(k);
    hits.push(n);
  };

  for (const name of sorted) {
    const re = new RegExp(`\\b${escapeRegExp(name)}\\b`, "i");
    if (re.test(q)) pushHit(name);
  }

  const surnameToFull = new Map();
  for (const name of sorted) {
    const parts = name.split(/\s+/).filter(Boolean);
    const last = String(parts[parts.length - 1] || "").toLowerCase();
    if (!last || last.length < 4) continue;
    if (!surnameToFull.has(last)) surnameToFull.set(last, new Set());
    surnameToFull.get(last).add(name);
  }
  const qLower = q.toLowerCase();
  for (const [surname, fullSet] of surnameToFull.entries()) {
    if (fullSet.size !== 1) continue;
    const re = new RegExp(`\\b${escapeRegExp(surname)}(?:'s)?\\b`, "i");
    if (re.test(qLower)) pushHit([...fullSet][0]);
  }

  // Fallback when slate context is empty: infer 1-2 names from prop phrasing.
  const patterns = [
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b\s+(?:over|under)\b/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b\s+(?:points?|rebounds?|assists?|pra)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)'s\s+(?:line|prop|points|rebounds|assists|pra)\b/g,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(q)) !== null) {
      pushHit(String(m[1] || "").trim());
    }
  }

  return hits;
}

function resolveQuestionNbaPlayer(question, nbaContext) {
  return resolveQuestionNbaPlayers(question, nbaContext)[0] || null;
}

function resolveNbaPlayerTeam(playerName, nbaContext) {
  const key = String(playerName || "").trim().toLowerCase();
  if (!key) return "";
  const grounded = nbaContext?.bdlGrounding?.bdlGroundedPlayers || {};
  for (const [name, meta] of Object.entries(grounded)) {
    if (String(name || "").trim().toLowerCase() === key) {
      return String(meta?.team || "").toUpperCase();
    }
  }
  const statsHit = (nbaContext?.playerStats || []).find(
    (p) => String(p?.name || "").trim().toLowerCase() === key,
  );
  if (statsHit?.team) return String(statsHit.team).toUpperCase();
  const injuryHit = (nbaContext?.injuries || []).find(
    (i) => String(i?.player || "").trim().toLowerCase() === key,
  );
  if (injuryHit?.team) return String(injuryHit.team).toUpperCase();
  return "";
}

function sanitizeNbaQuestionForGeneration(question, nbaContext) {
  const raw = String(question || "").trim();
  if (!raw) return raw;
  const targeted = resolveQuestionNbaPlayer(raw, nbaContext);
  if (!targeted) return raw;
  const targetedTeam = resolveNbaPlayerTeam(targeted, nbaContext);
  const hasTargetedTeam = Boolean(targetedTeam);

  let sanitized = raw;
  const pattern = /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+is\s+(out|doubtful|questionable)\b/gi;
  let m;
  while ((m = pattern.exec(raw)) !== null) {
    const mention = String(m[1] || "").trim();
    if (!mention || mention.toLowerCase() === targeted.toLowerCase()) continue;
    const mentionFull = resolveQuestionNbaPlayer(mention, nbaContext) || mention;
    const mentionTeam = resolveNbaPlayerTeam(mentionFull, nbaContext);
    const sameTeam = hasTargetedTeam && mentionTeam && mentionTeam === targetedTeam;
    if (!sameTeam) {
      sanitized = sanitized.replace(m[0], "").replace(/\s{2,}/g, " ").trim();
    }
  }

  return sanitized || raw;
}

/** Minimal normalization for matching Odds API outcome names to roster/stats names. */
export function normalizeNbaMarketPlayerKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function parseNbaRequestedMarket(question) {
  const q = String(question || "").toLowerCase();
  const lineMatch = q.match(/\b(\d{1,3}(?:\.\d+)?)\b/);
  const requestedLine = lineMatch ? Number(lineMatch[1]) : null;
  let market = null;
  if (/\bpra\b|\bpoints?\s+rebounds?\s+assists?\b/.test(q)) market = "points rebounds assists";
  else if (/\bassists?\b/.test(q)) market = "assists";
  else if (/\brebounds?\b/.test(q)) market = "rebounds";
  else if (/\bpoints?\b/.test(q)) market = "points";
  return { market, line: Number.isFinite(requestedLine) ? requestedLine : null };
}

function propLineMatchesTargetedPlayer(pl, targetedPlayer) {
  const k = normalizeNbaMarketPlayerKey(pl?.player);
  const t = normalizeNbaMarketPlayerKey(targetedPlayer);
  return Boolean(k && t && k === t);
}

function inferNbaPlayerCentrality(playerName, nbaContext, injuryMeta = null) {
  const key = String(playerName || "").trim().toLowerCase();
  if (!key) return "low";
  const props = (nbaContext?.propLines || []).filter((pl) =>
    propLineMatchesTargetedPlayer(pl, playerName),
  );
  const hasPra = props.some((pl) =>
    String(pl?.prop || "").toLowerCase().includes("points rebounds assists"),
  );
  const stats = (nbaContext?.playerStats || []).find(
    (p) => String(p?.name || "").trim().toLowerCase() === key,
  );
  const pts = Number(stats?.pts || 0);
  const ast = Number(stats?.ast || 0);
  const reb = Number(stats?.reb || 0);
  if (hasPra || props.length >= 3) return "high";
  if (pts >= 22 || ast >= 7 || reb >= 10) return "high";
  if (props.length >= 2 || pts >= 16 || ast >= 5 || reb >= 8) return "medium";
  if (injuryMeta?.statusClass === "out") return "medium";
  return "low";
}

export function summarizeNbaNewsImpact(newsImpact) {
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  const material = teams.filter(
    (t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0,
  );
  if (material.length === 0) return "";
  const lines = [];
  for (const t of material.slice(0, 2)) {
    const outLine = (t.outs || []).length ? `OUT: ${(t.outs || []).join(", ")}` : null;
    const doubtLine =
      (t.doubtful || []).length ? `DOUBTFUL: ${(t.doubtful || []).join(", ")}` : null;
    const benefit = (t.beneficiaries || [])
      .slice(0, 2)
      .map((b) => `${b.player} (${(b.markets || []).join("/")})`)
      .join("; ");
    const parts = [outLine, doubtLine].filter(Boolean).join(" | ");
    const benefPart = benefit ? ` | BENEFICIARIES: ${benefit}` : "";
    lines.push(`${t.team} [${t.priority || "low"}] ${parts}${benefPart}`.trim());
  }
  return lines.join("\n");
}

export function buildNbaStatusShiftSection(newsImpact, invalidation) {
  if (invalidation?.blocked && invalidation?.targetedPlayer) {
    if (
      invalidation?.blockedReason === "unlisted_market" ||
      invalidation?.blockedReason === "odds_feed_unavailable"
    ) {
      return "";
    }
    return `${invalidation.targetedPlayer} is ${invalidation.statusDisplay || invalidation.statusClass}. Direct prop projection is invalid at this status.`;
  }
  if (invalidation?.unresolved && invalidation?.targetedPlayer) {
    return `${invalidation.targetedPlayer} status is unresolved (${invalidation.statusDisplay || invalidation.statusClass}). Treat any lean as contingent on final availability.`;
  }
  const teams = Array.isArray(newsImpact?.affectedTeams) ? newsImpact.affectedTeams : [];
  const first = teams.find((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0);
  if (!first) return "";
  const changed = [...(first.outs || []), ...(first.doubtful || [])].slice(0, 2).join(", ");
  return `${first.team} rotation shifted by ${changed}. Price production through role reallocation, not baseline averages.`;
}

function isDirectNbaPropAsk(question) {
  const qText = String(question || "");
  return (
    (/\b(over|under)\b/i.test(qText) && /\b\d{1,3}(?:\.\d+)?\b/.test(qText)) ||
    (/\b(points?|rebounds?|assists?|pra)\b/i.test(qText) &&
      /\b(tonight|live|now|game)\b/i.test(qText))
  );
}

export function applyNbaMarketInvalidation({ question, board, newsImpact }) {
  const targetedPlayers = resolveQuestionNbaPlayers(question, board);
  const targetedPlayer = targetedPlayers[0] || null;
  const requestedMarket = parseNbaRequestedMarket(question);
  const injuriesByPlayer = getNbaInjuryIndex(board);
  const grounded = board?.bdlGrounding?.bdlGroundedPlayers || {};
  // NBA roster truth contract: only BDL grounding can authorize player/team/slate truth.
  const groundedPlayers = targetedPlayers
    .map((name) => {
      const key = String(name || "").trim().toLowerCase();
      const entry = Object.entries(grounded).find(
        ([n]) => String(n || "").trim().toLowerCase() === key,
      );
      if (!entry) return null;
      const [resolvedName, meta] = entry;
      return { name: resolvedName, team: String(meta?.team || "").toUpperCase(), onSlate: meta?.onSlate !== false };
    })
    .filter(Boolean);
  const unresolvedPlayers = targetedPlayers.filter((name) => {
    const key = String(name || "").trim().toLowerCase();
    return !groundedPlayers.some((p) => String(p.name || "").toLowerCase() === key);
  });
  const injuryMeta = targetedPlayer
    ? injuriesByPlayer.get(String(targetedPlayer).toLowerCase()) || null
    : null;
  const statusClass = injuryMeta?.statusClass || "unknown";
  const centrality = targetedPlayer
    ? inferNbaPlayerCentrality(targetedPlayer, board, injuryMeta)
    : "low";
  const unresolvedCentral =
    (statusClass === "questionable" || statusClass === "doubtful") && centrality !== "low";
  const blocked = statusClass === "out";
  const affectedTeams = new Set(
    (newsImpact?.affectedTeams || [])
      .filter((t) => (t?.outs || []).length > 0 || (t?.doubtful || []).length > 0)
      .map((t) => String(t?.team || "").toUpperCase())
      .filter(Boolean),
  );
  const statsRow = targetedPlayer
    ? (board?.playerStats || []).find(
        (p) =>
          String(p?.name || "").trim().toLowerCase() ===
          String(targetedPlayer).trim().toLowerCase(),
      )
    : null;
  const targetedTeam = String(injuryMeta?.team || statsRow?.team || "").toUpperCase();
  const materialRelevantImpact =
    hasMaterialNbaNewsImpact(newsImpact) &&
    (!targetedPlayer || (targetedTeam && affectedTeams.has(targetedTeam)));
  const directPropAsk = isDirectNbaPropAsk(question);
  const activeSlatePropCount = Array.isArray(board?.propLines) ? board.propLines.length : 0;
  const hasTargetPlayerMarket = targetedPlayer
    ? (board?.propLines || []).some((pl) => propLineMatchesTargetedPlayer(pl, targetedPlayer))
    : false;
  const verifyPlayerMarket = (playerName) => {
    const rows = (board?.propLines || []).filter((pl) => propLineMatchesTargetedPlayer(pl, playerName));
    if (!rows.length) return false;
    if (!requestedMarket.market) return true;
    const rowsByMarket = rows.filter((pl) =>
      String(pl?.prop || "").toLowerCase().includes(requestedMarket.market),
    );
    if (!rowsByMarket.length) return false;
    if (!Number.isFinite(requestedMarket.line)) return true;
    return rowsByMarket.some((pl) => Number(pl?.line) === Number(requestedMarket.line));
  };
  const marketVerification = targetedPlayers.map((name) => ({
    player: name,
    grounded: groundedPlayers.some((p) => String(p.name || "").toLowerCase() === String(name || "").toLowerCase()),
    verified: verifyPlayerMarket(name),
  }));
  const hasAnyRequestedMarket = marketVerification.some((m) => m.verified);
  const allRequestedMarketsMissing =
    targetedPlayers.length > 0 && marketVerification.every((m) => !m.verified);
  // Player-level "no line" only when the feed already shows at least one active listed prop elsewhere.
  // Empty slate snapshot (ingestion/key/API) → odds_feed_unavailable; do not blame books/cover timing.
  const blockedPlayerLevelNoListedMarket = Boolean(
    targetedPlayers.length > 0 &&
      directPropAsk &&
      allRequestedMarketsMissing &&
      activeSlatePropCount > 0 &&
      !blocked,
  );
  const blockedOddsFeedSnapshot = Boolean(
    targetedPlayers.length > 0 &&
      directPropAsk &&
      allRequestedMarketsMissing &&
      activeSlatePropCount === 0 &&
      !blocked,
  );
  const blockedNoMarket = Boolean(blockedPlayerLevelNoListedMarket || blockedOddsFeedSnapshot);
  const requiresStatusAcknowledgement =
    blocked || unresolvedCentral || materialRelevantImpact;
  return {
    decisionMode: blocked
      ? "blocked_unavailable"
      : blockedPlayerLevelNoListedMarket
        ? "blocked_unlisted_market"
        : blockedOddsFeedSnapshot
          ? "blocked_odds_feed_unavailable"
          : unresolvedCentral
            ? "unresolved_status"
            : "normal",
    blocked,
    blockedReason: blocked
      ? "unavailable"
      : blockedPlayerLevelNoListedMarket
        ? "unlisted_market"
        : blockedOddsFeedSnapshot
          ? "odds_feed_unavailable"
          : null,
    unresolved: unresolvedCentral,
    targetedPlayer,
    statusClass,
    statusDisplay: injuryMeta?.statusRaw || injuryMeta?.detail || statusClass,
    team: injuryMeta?.team || null,
    materialRelevantImpact,
    requiresStatusAcknowledgement,
    hasTargetPlayerMarket,
    directPropAsk,
    requestedMarket,
    targetedPlayers,
    unresolvedPlayers,
    playerGrounding: groundedPlayers,
    marketVerification,
    hasAnyRequestedMarket,
  };
}

function confidenceLabelToRank(label) {
  const normalized = String(label || "").toLowerCase();
  if (normalized === "high") return 3;
  if (normalized === "medium") return 2;
  return 1;
}

function confidenceRankToLabel(rank) {
  if (rank >= 3) return "High";
  if (rank >= 2) return "Medium";
  return "Low";
}

export function applyNbaConfidenceModifiers({
  baseConfidence,
  invalidation,
  nbaContext,
}) {
  const directBlockedUnavailable = invalidation?.blockedReason === "unavailable";
  const directBlockedNoMarket = invalidation?.blockedReason === "unlisted_market";
  const directBlockedOddsFeed = invalidation?.blockedReason === "odds_feed_unavailable";
  if (directBlockedUnavailable) {
    return {
      label: "Low",
      reason: "Player unavailable — direct prop projection is blocked.",
    };
  }
  if (directBlockedOddsFeed) {
    return {
      label: "Low",
      reason: "Odds provider snapshot unavailable — named player props cannot be verified.",
    };
  }
  if (directBlockedNoMarket) {
    return {
      label: "Low",
      reason: "No active listed market — avoid speculative confidence inflation.",
    };
  }

  let rank = confidenceLabelToRank(baseConfidence);
  const reasons = [];
  if (invalidation?.unresolved) {
    rank = Math.max(1, rank - 1);
    reasons.push("Unresolved central status lowers certainty.");
  }
  if (invalidation?.materialRelevantImpact) {
    rank = Math.min(rank, 2);
    reasons.push("Material injury/news impact increases volatility.");
  }
  if (!Array.isArray(nbaContext?.todaysGames) || nbaContext.todaysGames.length === 0) {
    rank = Math.min(rank, 2);
    reasons.push("Slate context is thin for game-specific conviction.");
  }

  return {
    label: confidenceRankToLabel(rank),
    reason: reasons.join(" "),
  };
}

function detectNbaAvailabilityIntent(question) {
  const q = String(question || "").toLowerCase();
  const asksStatus =
    /\b(is|are|will|did)\b[\s\S]{0,80}\b(play|playing|active|available|out|inactive|status|questionable|doubtful)\b/i.test(q) ||
    /\bstatus\b/.test(q) ||
    /\bplaying tonight\b/.test(q) ||
    /\bout tonight\b/.test(q);
  const asksBettingConsequence =
    /\b(impact|benefit|benefits|beneficiary|what does that mean|what happens|angle|bet|prop|play)\b/i.test(q);
  return {
    isAvailabilityQuestion: asksStatus,
    asksBettingConsequence,
  };
}

export function resolveNbaDecisionMode({
  sportHint,
  availabilityIntent,
  directPropAsk,
  invalidation,
}) {
  if (sportHint !== "nba") return "none";
  if (availabilityIntent?.isAvailabilityQuestion && !directPropAsk) {
    return availabilityIntent.asksBettingConsequence
      ? "status_plus_consequence"
      : "status_only";
  }
  if (invalidation?.blockedReason === "unavailable") return "blocked_unavailable";
  if (invalidation?.blockedReason === "odds_feed_unavailable")
    return "blocked_odds_feed_unavailable";
  if (invalidation?.blockedReason === "unlisted_market") return "blocked_unlisted_market";
  if (invalidation?.unresolved && invalidation?.hasTargetPlayerMarket) return "conditional_wait";
  return "actionable";
}

export function buildNbaConditionalPayload({ invalidation, nbaContext, newsImpact }) {
  const player = invalidation?.targetedPlayer || "targeted player";
  const status = invalidation?.statusDisplay || invalidation?.statusClass || "questionable";
  const lines = (nbaContext?.propLines || [])
    .filter((pl) => propLineMatchesTargetedPlayer(pl, player))
    .slice(0, 3)
    .map((pl) => `${pl.prop} ${pl.line}`)
    .join(" | ");
  const teamImpact = (newsImpact?.affectedTeams || []).find(
    (t) => String(t?.team || "").toUpperCase() === String(invalidation?.team || "").toUpperCase(),
  );
  const pivots = (teamImpact?.beneficiaries || [])
    .slice(0, 2)
    .map((b) => `${b.player} (${(b.markets || []).join("/")})`)
    .join("; ");
  return {
    player,
    status,
    listedMarkets: lines || "listed market present",
    ifActive:
      "convert to actionable with one primary angle at posted number and clear threshold.",
    ifOut:
      `hard block direct props for ${player}${pivots ? `; pivot watchlist: ${pivots}` : ""}.`,
    ifUnresolved:
      "keep conditional_wait; no full-size commitment before final availability.",
  };
}

function buildNbaPlayerResolutionBlock(invalidation) {
  const targeted = Array.isArray(invalidation?.targetedPlayers) ? invalidation.targetedPlayers : [];
  if (!targeted.length) return "";
  const rows = targeted.map((name) => {
    const verification = (invalidation?.marketVerification || []).find(
      (v) => String(v?.player || "").toLowerCase() === String(name || "").toLowerCase(),
    );
    const grounded = verification?.grounded ? "grounded" : "not_grounded";
    const market = verification?.verified ? "verified_market" : "unverified_market";
    return `${name}: ${grounded}, ${market}`;
  });
  return `NBA NAMED PLAYER RESOLUTION (BDL + Odds)\n${rows.join("\n")}`;
}

function nbaTeamSignals(team) {
  const out = new Set();
  const abbr = String(team?.abbr || "").toUpperCase();
  const name = String(team?.name || "").toLowerCase();
  if (abbr) out.add(abbr.toLowerCase());
  if (name) out.add(name);
  const cleaned = name.replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
  if (cleaned) {
    out.add(cleaned);
    const tokens = cleaned.split(" ").filter(Boolean);
    const last = tokens[tokens.length - 1];
    if (last && last.length >= 4) out.add(last);
  }
  return out;
}

export function resolveNbaMatchupFromQuestion(question, nbaContext) {
  const q = normalizeText(question);
  const games = Array.isArray(nbaContext?.todaysGames) ? nbaContext.todaysGames : [];
  if (!q || games.length === 0) return null;

  const abbrs = extractNbaTeamAbbrevsFromQuestion(question);
  if (abbrs.length >= 2) {
    const exact = games.find((g) => {
      const away = String(g?.awayTeam?.abbr || "").toUpperCase();
      const home = String(g?.homeTeam?.abbr || "").toUpperCase();
      return abbrs.includes(away) && abbrs.includes(home);
    });
    if (exact) {
      return {
        awayAbbr: String(exact?.awayTeam?.abbr || "").toUpperCase(),
        homeAbbr: String(exact?.homeTeam?.abbr || "").toUpperCase(),
        label: `${String(exact?.awayTeam?.abbr || "").toUpperCase()} at ${String(exact?.homeTeam?.abbr || "").toUpperCase()}`,
      };
    }
  }

  for (const g of games) {
    const awaySignals = nbaTeamSignals(g?.awayTeam);
    const homeSignals = nbaTeamSignals(g?.homeTeam);
    const awayHit = [...awaySignals].some((s) => q.includes(s));
    const homeHit = [...homeSignals].some((s) => q.includes(s));
    if (awayHit && homeHit) {
      const awayAbbr = String(g?.awayTeam?.abbr || "").toUpperCase();
      const homeAbbr = String(g?.homeTeam?.abbr || "").toUpperCase();
      if (!awayAbbr || !homeAbbr) continue;
      return {
        awayAbbr,
        homeAbbr,
        label: `${awayAbbr} at ${homeAbbr}`,
      };
    }
  }

  if (games.length === 1) {
    const g = games[0];
    const awayAbbr = String(g?.awayTeam?.abbr || "").toUpperCase();
    const homeAbbr = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (awayAbbr && homeAbbr) {
      return {
        awayAbbr,
        homeAbbr,
        label: `${awayAbbr} at ${homeAbbr}`,
      };
    }
  }

  return null;
}

export function buildAllowedMatchupPlayerPool(matchup, nbaContext) {
  const allowedTeams = matchup ? [matchup.awayAbbr, matchup.homeAbbr].filter(Boolean) : [];
  const teamSet = new Set(allowedTeams.map((t) => String(t || "").toUpperCase()));
  const playersByTeamAbbrev = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const byTeam = {};
  const playerToTeam = new Map();

  for (const team of teamSet) {
    byTeam[team] = [];
    for (const n of playersByTeamAbbrev?.[team] || []) {
      const name = String(n || "").trim();
      if (!name) continue;
      if (!byTeam[team].includes(name)) byTeam[team].push(name);
      if (!playerToTeam.has(name.toLowerCase())) playerToTeam.set(name.toLowerCase(), team);
    }
  }

  for (const row of nbaContext?.playerStats || []) {
    const team = String(row?.team || "").toUpperCase();
    const name = String(row?.name || "").trim();
    if (!teamSet.has(team) || !name) continue;
    if (!byTeam[team]) byTeam[team] = [];
    if (!byTeam[team].includes(name)) byTeam[team].push(name);
    if (!playerToTeam.has(name.toLowerCase())) playerToTeam.set(name.toLowerCase(), team);
  }

  const knownPlayerToTeam = new Map(playerToTeam);
  for (const row of nbaContext?.playerStats || []) {
    const name = String(row?.name || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (name && team && !knownPlayerToTeam.has(name.toLowerCase())) {
      knownPlayerToTeam.set(name.toLowerCase(), team);
    }
  }
  for (const row of nbaContext?.injuries || []) {
    const name = String(row?.player || "").trim();
    const team = String(row?.team || "").toUpperCase();
    if (name && team && !knownPlayerToTeam.has(name.toLowerCase())) {
      knownPlayerToTeam.set(name.toLowerCase(), team);
    }
  }

  for (const team of Object.keys(byTeam)) byTeam[team].sort();
  const allowedPlayers = [...playerToTeam.keys()].map((k) => {
    for (const [team, names] of Object.entries(byTeam)) {
      const found = names.find((n) => n.toLowerCase() === k);
      if (found) return found;
    }
    return k;
  });

  return {
    allowedTeams,
    allowedPlayers,
    byTeam,
    playerToTeam,
    knownPlayerToTeam,
  };
}

function injectMatchupGroundingBlock(matchup, pool) {
  if (!matchup || !pool || pool.allowedTeams.length !== 2) return "";
  const awayPlayers = pool.byTeam[matchup.awayAbbr] || [];
  const homePlayers = pool.byTeam[matchup.homeAbbr] || [];
  const matchupQuality =
    awayPlayers.length >= 4 && homePlayers.length >= 4
      ? "full"
      : awayPlayers.length > 0 && homePlayers.length > 0
        ? "partial"
        : "thin";
  const awayList = awayPlayers.join(", ") || "(none grounded)";
  const homeList = homePlayers.join(", ") || "(none grounded)";
  return `VALID MATCHUP
- ${matchup.label}
VALID PLAYER POOL
- ${matchup.awayAbbr}: ${awayList}
- ${matchup.homeAbbr}: ${homeList}
- Focused matchup roster quality: ${matchupQuality}

MATCHUP ENFORCEMENT
- If you mention any player-specific prop or take, player must be from ${matchup.awayAbbr} or ${matchup.homeAbbr}.
- Do not mention players from other games/teams.
- If focused matchup roster quality is thin, use team-level analysis and do NOT guess player names. If it is full, use the authorized player names above normally.`;
}

function buildOffMatchupPromptAcknowledgement(question, matchup, pool) {
  if (!matchup || !pool || pool.allowedTeams.length !== 2) return "";
  const knownMap = pool.knownPlayerToTeam;
  if (!knownMap || knownMap.size === 0) return "";
  const allowedTeamSet = new Set(pool.allowedTeams.map((t) => String(t || "").toUpperCase()));
  const mentioned = extractMentionedPlayersFromOutput(question, knownMap);
  if (!mentioned.length) return "";
  const offMatchup = mentioned
    .map((key) => {
      const team = String(knownMap.get(key) || "").toUpperCase();
      if (!team || allowedTeamSet.has(team)) return null;
      return key
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    })
    .filter(Boolean);
  if (!offMatchup.length) return "";
  const teamLabel = `${matchup.awayAbbr}/${matchup.homeAbbr}`;
  if (offMatchup.length === 1) {
    return `Limiting to ${teamLabel} players — ${offMatchup[0]} is not part of this matchup.`;
  }
  return `Limiting to ${teamLabel} players — ${offMatchup.join(", ")} are not part of this matchup.`;
}

export function extractMentionedPlayersFromOutput(output, knownPlayerToTeam) {
  const text = String(output || "");
  if (!text || !knownPlayerToTeam || knownPlayerToTeam.size === 0) return [];
  const names = [...knownPlayerToTeam.keys()]
    .map((k) => {
      const pretty = k
        .split(" ")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
      return { key: k, pretty };
    })
    .sort((a, b) => b.pretty.length - a.pretty.length);
  const hits = [];
  for (const n of names) {
    const re = new RegExp(`\\b${escapeRegExp(n.pretty)}\\b`, "i");
    if (re.test(text)) hits.push(n.key);
  }
  return [...new Set(hits)];
}

export function validatePlayersAgainstMatchup(mentionedPlayers, allowedTeamSet, playerToTeamMap) {
  const invalid = [];
  for (const p of mentionedPlayers || []) {
    const team = String(playerToTeamMap?.get(p) || "").toUpperCase();
    if (!team) continue;
    if (!allowedTeamSet.has(team)) {
      invalid.push({
        player: p
          .split(" ")
          .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
          .join(" "),
        team,
      });
    }
  }
  return invalid;
}

function repairOrRegenerateInvalidMatchupOutput({ matchup, pool, invalidPlayers }) {
  const away = matchup?.awayAbbr || "AWAY";
  const home = matchup?.homeAbbr || "HOME";
  const awayPlayers = (pool?.byTeam?.[away] || []).slice(0, 5).join(", ") || "(none grounded)";
  const homePlayers = (pool?.byTeam?.[home] || []).slice(0, 5).join(", ") || "(none grounded)";
  const invalidLine = (invalidPlayers || []).map((x) => `${x.player} (${x.team})`).join(", ");
  return `MATCHUP GROUNDING\nValid matchup: ${away} at ${home}.\nCross-game player mentions were removed: ${invalidLine}.\n\nVALID PLAYER POOL\n${away}: ${awayPlayers}\n${home}: ${homePlayers}\n\nNEXT ACTION\nUse only players from ${away} or ${home}. If you want player props, pick names from the valid pool above.`;
}

function normalizePlayerNameKey(name) {
  return String(name || "").trim().toLowerCase();
}

function inferNbaMarketSetFromStats(statsRow) {
  const pts = Number(statsRow?.pts);
  const ast = Number(statsRow?.ast);
  const reb = Number(statsRow?.reb);
  const out = [];
  if (Number.isFinite(pts) && pts >= 10) out.push("points");
  if (Number.isFinite(ast) && ast >= 4) out.push("assists");
  if (Number.isFinite(reb) && reb >= 5) out.push("rebounds");
  if (!out.length) out.push("points");
  return out.slice(0, 2);
}

function buildNbaOutStatusShiftPlan({ targetedPlayer, teamAbbr, nbaContext, teamImpact }) {
  const targetKey = normalizePlayerNameKey(targetedPlayer);
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const verifiedRoster = (playersByTeam?.[String(teamAbbr || "").toUpperCase()] || [])
    .map((n) => String(n || "").trim())
    .filter(Boolean);
  const rosterKeySet = new Set(verifiedRoster.map((n) => normalizePlayerNameKey(n)));
  const statsRows = Array.isArray(nbaContext?.playerStats) ? nbaContext.playerStats : [];
  const statsMap = new Map(
    statsRows
      .map((row) => [normalizePlayerNameKey(row?.name), row])
      .filter(([k]) => Boolean(k)),
  );

  const candidates = [];
  const seen = new Set();
  const pushCandidate = (name, markets = []) => {
    const cleaned = String(name || "").trim();
    const key = normalizePlayerNameKey(cleaned);
    if (!cleaned || !key || key === targetKey || seen.has(key)) return;
    if (rosterKeySet.size > 0 && !rosterKeySet.has(key)) return;
    const row = statsMap.get(key) || null;
    const resolvedMarkets = Array.isArray(markets) && markets.length ? markets : inferNbaMarketSetFromStats(row);
    seen.add(key);
    candidates.push({ name: cleaned, stats: row, markets: resolvedMarkets });
  };

  for (const b of teamImpact?.beneficiaries || []) {
    pushCandidate(b?.player, b?.markets || []);
  }
  if (candidates.length < 3) {
    const rankedRoster = verifiedRoster
      .map((name) => ({ name, row: statsMap.get(normalizePlayerNameKey(name)) || null }))
      .sort((a, b) => {
        const as = Number(a.row?.pts || 0) + Number(a.row?.ast || 0) * 1.4 + Number(a.row?.reb || 0) * 0.9;
        const bs = Number(b.row?.pts || 0) + Number(b.row?.ast || 0) * 1.4 + Number(b.row?.reb || 0) * 0.9;
        return bs - as;
      });
    for (const row of rankedRoster) {
      if (candidates.length >= 3) break;
      pushCandidate(row.name, inferNbaMarketSetFromStats(row.row));
    }
  }

  const selected = candidates.slice(0, 3);
  const replacementLines = selected.length
    ? selected
        .map((c) => {
          const pts = Number(c?.stats?.pts);
          const ast = Number(c?.stats?.ast);
          const reb = Number(c?.stats?.reb);
          const statsLine =
            Number.isFinite(pts) || Number.isFinite(ast) || Number.isFinite(reb)
              ? `${Number.isFinite(pts) ? `${pts} pts` : "n/a pts"}, ${Number.isFinite(ast) ? `${ast} ast` : "n/a ast"}, ${Number.isFinite(reb) ? `${reb} reb` : "n/a reb"}`
              : "no stable season stat row in payload";
          return `- ${c.name}: ${statsLine}; watch ${c.markets.join("/")} volume up.`;
        })
        .join("\n")
    : "- Verified roster replacements unavailable in payload; do not name replacement players until rosterGrounding refreshes.";

  const shiftLine = selected.length
    ? `Prop shifts: ${targetedPlayer} props stay blocked while out. Lean ${selected.map((c) => `${c.name} ${c.markets.join("/")}`).join("; ")} toward over if books post near baseline.`
    : `Prop shifts: ${targetedPlayer} props stay blocked while out; without verified replacement names, use team-level pace/usage angles only.`;
  const triggerPrimary = selected[0]?.name || "replacement guard";
  const triggerSecondary = selected[1]?.name || "secondary creator";
  const liveTrigger = `Live trigger: if ${triggerPrimary} and ${triggerSecondary} both clear opening-rotation minutes and early touch volume by halftime, keep the replacement-over angle; if one is stuck in a low-minute role, cut exposure.`;

  return { replacementLines, shiftLine, liveTrigger };
}

function buildNbaAvailabilityResponse({
  question,
  nbaContext,
  nbaInvalidation,
  derivedConfidence,
  nbaConfidenceModifier,
  decisionMode,
}) {
  const targetedPlayer = nbaInvalidation?.targetedPlayer || resolveQuestionNbaPlayer(question, nbaContext) || "Target player";
  const injuriesByPlayer = getNbaInjuryIndex(nbaContext || {});
  const injuryMeta = injuriesByPlayer.get(String(targetedPlayer).toLowerCase()) || null;
  const statusClass = injuryMeta?.statusClass || "unknown";
  const statusDisplay = injuryMeta?.statusRaw || injuryMeta?.detail || (statusClass === "unknown" ? "No injury designation in current context" : statusClass);
  const intent = detectNbaAvailabilityIntent(question);
  const includeConsequence =
    decisionMode === "status_plus_consequence" || intent.asksBettingConsequence;

  const firstLine =
    statusClass === "unknown"
      ? `STATUS\n${targetedPlayer} — ${statusDisplay}.`
      : `STATUS\n${targetedPlayer} — ${statusDisplay}.`;

  const confidenceLine = `CONFIDENCE\n${derivedConfidence}${nbaConfidenceModifier?.reason ? ` — ${nbaConfidenceModifier.reason}` : ""}`;
  let consequenceBlock = "";
  if (includeConsequence) {
    if (statusClass === "out") {
      const teamImpact = (nbaContext?.newsImpact?.affectedTeams || []).find(
        (t) => String(t?.team || "").toUpperCase() === String(injuryMeta?.team || "").toUpperCase(),
      );
      const outPlan = buildNbaOutStatusShiftPlan({
        targetedPlayer,
        teamAbbr: injuryMeta?.team,
        nbaContext,
        teamImpact,
      });
      consequenceBlock = `\n\nBETTING CONSEQUENCE\n${targetedPlayer} is out — do not play direct props on this player.\n\nREPLACEMENT WATCHLIST\n${outPlan.replacementLines}\n\n${outPlan.shiftLine}\n\n${outPlan.liveTrigger}`;
    } else if (statusClass === "questionable" || statusClass === "doubtful") {
      consequenceBlock = `\n\nBETTING CONSEQUENCE\nTreat ${targetedPlayer} props as contingent until final availability confirms. Avoid full-size exposure before status lock.`;
    } else {
      consequenceBlock = `\n\nBETTING CONSEQUENCE\nNo explicit injury downgrade in current context. Use listed markets and matchup structure for any sizing decision.`;
    }
  }

  const statusShift =
    statusClass === "out" || statusClass === "questionable" || statusClass === "doubtful"
      ? `${targetedPlayer} status is ${statusDisplay}. Availability should be acknowledged before prop recommendations.`
      : null;

  return {
    response: `${firstLine}${consequenceBlock}\n\n${confidenceLine}`,
    statusShift,
  };
}

function isTier1InformationalQuestion(question) {
  const q = normalizeText(question);
  if (
    q.includes("who wins") ||
    q.includes(" vs ") ||
    q.includes(" v ") ||
    q.includes("prop") ||
    q.includes("spread") ||
    q.includes("total") ||
    q.includes("cover") ||
    q.includes("k prop") ||
    q.includes("strikeout") ||
    q.includes("pitcher")
  ) {
    return false;
  }
  if (/\b(is|are|will|does)\s+.+\s+(playing|play|start|starting|active|available|dress)\b/.test(q)) return true;
  if (/\b(what time|when does|where is the game)\b/.test(q)) return true;
  return false;
}

function shouldUseTier25WithDeep({ question, matchupContext, sportHint }) {
  if (matchupContext) return true;
  const q = normalizeText(question);
  if (q.includes("who wins") || q.includes(" who wins")) return true;
  if (q.includes(" vs ") || q.includes(" v ") || q.includes(" @ ")) return true;
  if (q.includes("prop")) return true;
  if (q.includes("cover") || q.includes("spread") || q.includes("total")) return true;
  if (q.includes("strikeout") || q.includes("k prop") || (q.includes("pitcher") && q.includes("tonight"))) return true;
  const s = String(sportHint || "").toLowerCase();
  if (s && s !== "generic" && s !== "image_review") {
    if (/\b(best|lean|edge|angle|fade|lock|pick|bet)\b/.test(q)) return true;
  }
  return false;
}

function isSpreadOrGameSideQuestion(question) {
  const q = normalizeText(question);
  if (!q) return false;
  return (
    q.includes("spread") ||
    q.includes("ats") ||
    q.includes("against the spread") ||
    q.includes("game side") ||
    q.includes("which team covers") ||
    q.includes("who covers") ||
    (q.includes("cover") && (q.includes("line") || q.includes("side")))
  );
}

function resolveOutputJsonMode({
  chaseSignals,
  intent,
  hasImage,
  liveSignals,
  question,
  matchupContext,
  sportHint,
}) {
  if (chaseSignals?.isChase) return "plain";
  if (intent === "slip_review") return "plain";
  if (intent === "prop_projection") return "tier2_5_json";
  if (hasImage && liveSignals?.isLive) return "tier2_live_json";
  if (isTier1InformationalQuestion(question)) return "tier1_json";
  if (
    isSettledFactQuestion(question) &&
    !shouldUseTier25WithDeep({ question, matchupContext, sportHint })
  ) {
    return "tier1_json";
  }
  if (shouldUseTier25WithDeep({ question, matchupContext, sportHint })) return "tier2_5_json";
  return "plain";
}

function buildJsonOutputContract(mode, sportHint, { requireStatusShift = false } = {}) {
  const sport = String(sportHint || "generic").toLowerCase();

  const nbaTier25Lead =
    sport === "nba"
      ? `
NBA (formatting only when sport is NBA): write the opener sentence per Step 1 of the framework, then prepend ">> " to that same sentence so the summary begins with ">> ". The ">>" is a formatting prefix, not an opener rule — Step 1 still owns the content of the first sentence.
${requireStatusShift ? 'NBA STATUS SHIFT (mandatory): include "statusShift" in the JSON response with one decisive sentence naming the key availability shift and what it invalidates or unlocks.' : ""}
`
      : "";

  const tier25Spec = `TIER 2.5 — DEFAULT MATCHUP / PROP / SIDE RESPONSE (summary field)

summary must use this exact shape (plain text inside the JSON string, no markdown):

>> [Opener sentence per Step 1 of the framework, with ">> " prepended as a formatting prefix]

[blank line]

MATCH READ
- [bullet 1 — concrete edge for the favored side — stats or sequences, not "good form"]
- [bullet 2 — opponent weakness or friction]
- [bullet 3 — surface / park / venue / matchup factor]

PROP PROJECTIONS
[3–6 lines minimum when data allows; project STATS not book prices — "project ~7" not "over 6.5 -110"]
Sport-specific projection lines (pick what fits ${sport}):
- Tennis: match-winner threshold band; total games lean; aces per player ("Name: project ~N"); double faults; break points saved bands; scoreline prediction.
- NBA: points (and rebounds/assists/PRA as role fits); threes for shooters; minutes if role unclear; game total lean.
- MLB: SP strikeouts each; key hitter total bases; game total lean + park note; first-inning angle when useful.
- NFL: QB yards/TDs; primary RB rush; WR1/WR2 yards; anytime TD leans for 2–3; longest play when supported.
- Golf: top-5 / top-10 / top-20 for 2–3 names; make-cut; H2H when asked.
- F1: podium % for 3–4 drivers; points finish mid-grid; DNF risk; margin read when dominant.

CONFIDENCE
[High / Medium / Speculative] — [one-line justification]
${nbaTier25Lead}
CRITICAL
- Never say "limited profile", "held back", or apologize for thin data — put uncertainty only in CONFIDENCE.
- Never invent book lines; estimate stats only.
- Never include the phrase "See full breakdown" in any field (UI handles that).
- If you can only produce 1–2 projection lines, confidence must be Speculative.
- summary MUST NOT include legacy headers like THE PLAY / MARKET MISTAKE / WHY MISPRICED / TIMING EDGE / WHY IT FITS / FADE.
- Those legacy sections belong in deep only.

deep field (same JSON object)
- Must contain the FULL legacy Tier-3 answer: opener sentence (Step 1) prefixed with ">> ", then THE PLAY / MARKET MISTAKE / WHY MISPRICED / TIMING EDGE / WHY IT FITS / FADE / CONFIDENCE / TIMING sections exactly as in the base system prompt.
- Plain text inside the JSON string, no markdown.`;

  if (mode === "tier1_json") {
    return `OUTPUT CONTRACT — TIER 1 (mandatory)
Return ONLY valid JSON on a single line or pretty-printed:
{"summary":"<1–3 plain sentences factual answer — no sections, no >> line>"}
No other keys. No markdown.`;
  }

  if (mode === "tier2_live_json") {
    return `OUTPUT CONTRACT — TIER 2 LIVE (mandatory)
Return ONLY valid JSON:
{"summary":"<full compressed live response: LIVE CALL, THE MATH, WHY NOW, CLOCK, WATCH FOR — show arithmetic explicitly>"}
No other keys. No markdown.`;
  }

  if (mode === "tier2_5_json") {
    return `OUTPUT CONTRACT — TIER 2.5 + DEEP (mandatory)
Return ONLY valid JSON with exactly these keys:
${sport === "nba" && requireStatusShift ? '{"summary":"...","deep":"...","statusShift":"..."}' : '{"summary":"...","deep":"..."}'}

${tier25Spec}`;
  }

  return "";
}

function collectNbaVerifiedPlayerNamesFromGrounding(nbaContext) {
  const verifiedPlayerNames = new Set();
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  for (const players of Object.values(playersByTeam)) {
    if (!Array.isArray(players)) continue;
    for (const name of players) {
      const n = String(name || "").trim();
      if (n) verifiedPlayerNames.add(n);
    }
  }
  for (const raw of nbaContext?.clientUiSurface?.featuredPlayersFullNames || []) {
    const n = String(raw || "").trim();
    if (n) verifiedPlayerNames.add(n);
  }
  return verifiedPlayerNames;
}

function questionExplicitlyNamesPlayerCue(question) {
  const q = String(question || "").trim();
  if (!q) return false;
  const fullName = /\b(?:about|for)\s+[A-Z][a-z]+\s+[A-Z][a-z]+\b/;
  const surnameCue = /\bfor\s+[A-Z][a-z]{2,}(?:'s)?\b/;
  const possessivePlayer = /\b[A-Z][a-z]{2,}'s\s+(?:PRA|line|prop)/;
  return fullName.test(q) || surnameCue.test(q) || possessivePlayer.test(q);
}

function buildNbaRosterListInner(nbaContext, rosterOpts = {}) {
  const { hasImage = false, question = "", matchup = null } = rosterOpts;
  const playersByTeam = nbaContext?.rosterGrounding?.playersByTeamAbbrev || {};
  const qualityByTeam = nbaContext?.rosterGrounding?.qualityByTeam || {};
  let rosterQuality = nbaContext?.rosterGrounding?.rosterGroundingQuality;
  if (matchup?.awayAbbr && matchup?.homeAbbr) {
    const away = String(matchup.awayAbbr || "").toUpperCase();
    const home = String(matchup.homeAbbr || "").toUpperCase();
    const awayCount = (playersByTeam[away] || []).length;
    const homeCount = (playersByTeam[home] || []).length;
    rosterQuality =
      awayCount >= 4 && homeCount >= 4
        ? "full"
        : awayCount > 0 && homeCount > 0
          ? "partial"
          : "thin";
    if (qualityByTeam[away] === "thin" || qualityByTeam[home] === "thin") {
      rosterQuality = "thin";
    } else if (qualityByTeam[away] === "partial" || qualityByTeam[home] === "partial") {
      rosterQuality = rosterQuality === "full" ? "partial" : rosterQuality;
    }
  }
  const names = [...collectNbaVerifiedPlayerNamesFromGrounding(nbaContext)];

  const namedInQuestion = questionExplicitlyNamesPlayerCue(question);
  const userGrounded = hasImage || namedInQuestion;

  if (userGrounded) {
    const apiLine = names.length
      ? `Reference names from context: ${names.join(", ")}`
      : "Use image and Question text as the name source when the slate list is empty.";
    return `USER-SUPPLIED GROUNDING — OVERRIDES “NO NAMES” ROSTER MODE
${hasImage ? "- An image is attached: read visible player names, prop lines, prices, and stat rows from the screenshot as primary evidence.\n" : ""}${namedInQuestion ? "- The Question targets a specific player by name — discuss that player directly.\n" : ""}- ${apiLine}

You MUST use names and numbers from the image and/or the Question.
Do not refuse to name a player who is visible in the image or clearly named in the Question solely because playersByTeamAbbrev is empty or incomplete.`;
  }

  const thinOrAbsentBody = `INTERNAL ROSTER LIST: no authorized names in payload for these teams.
Do not name specific players for those sides unless the Question or an attached image names them.
Give team-level analysis only — pace, scheme, series context, matchup profile, injuries from context.
Inventing player names destroys trust.`;

  if (names.length === 0) {
    return thinOrAbsentBody;
  }

  if (rosterQuality === "full") {
    return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

Name only these players when discussing tonight's games (unless Question/image authorizes another name per rules below).`;
  }

  if (rosterQuality === "partial") {
    return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

You may ONLY name players on this list for team-specific assignments. For any team with no names in playersByTeamAbbrev, use team-level analysis only — do not supplement with training memory.`;
  }

  if (rosterQuality === "thin") {
    return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

You may name anyone on this list. For a team with no names under playersByTeamAbbrev, use team-level read for that side only.`;
  }

  return `INTERNAL — AUTHORIZED NAMES FOR TONIGHT (do not describe this list or its completeness to the user):
${names.join(", ")}

Name only these players when discussing player-specific props unless the image or question authorizes another name.`;
}

function buildNbaRosterProminentInjection(nbaContext, rosterOpts = {}) {
  return `════════════════════════════════════════
${buildNbaRosterListInner(nbaContext, rosterOpts)}
════════════════════════════════════════`;
}

const NO_MARKET_VERIFIED_PLAYER_STEP_2 = `2. Name the two to four highest-usage players from the AUTHORIZED list for each team in the matchup. For SAS this must include Wembanyama if present. Never stop at one name if more authorized names exist for the matchup teams.
If fewer than two authorized names exist for the matchup, do NOT invent names.
Give a sharp team-level read anchored to matchup context — never mention missing lines,
loading pipelines, or roster completeness.`;

const PROP_PROJECTION_MODE_BLOCK = `PROP PROJECTION MODE — MANDATORY

The user is explicitly asking for prop projections. You MUST deliver:

For tennis:
- Match winner lean with price threshold
- Total games: OVER/UNDER with specific number
- Aces for each player: "project ~N per set, ~N total"
- Double faults for each player: "project ~N"
- Break points saved: "~N% for each player"
- Scoreline prediction: "[winner] in [sets], [X-X X-X] range"

For NBA: points, rebounds, assists for each named player with ranges.
For MLB: K total for each pitcher, total bases for key hitters.
For golf: finishing position probability ranges for named golfers.
For F1: podium probability for named drivers.

If the player database has limited data for a player, use surface/venue
baselines and tour averages. ALWAYS produce projections. Never say
"cannot project without more data." Confidence reflects data quality.

In Tier 2.5 summary, PROP PROJECTIONS must contain at least 4 specific lines.`;

const SPREAD_AND_GAME_SIDE_BLOCK = `SPREAD AND GAME SIDE — when user asks about a spread, ATS, or which team covers:

Answer the spread question directly in the first sentence. Do not pivot to a prop angle.
Format: '[Team] covers at [number] if [specific condition]. The fragile assumption behind the other side: [one sentence].'
Identify the specific game script that decides the cover — pace, foul trouble, bench depth, specific player performance threshold.
Name the kill script explicitly: 'This breaks if [specific condition].'
End with the live trigger format: 'Live trigger: [player/team] [observable action] by [time marker] — if yes, [cover holds]. If no, [reassess].'`;

const ROSTER_ENFORCEMENT_NBA = `ROSTER ENFORCEMENT — THIS IS A HARD RULE WITH NO EXCEPTIONS

playersByTeamAbbrev in rosterGrounding lists the ONLY players you are
allowed to name as members of each team. Use this for internal checks only —
never narrate roster completeness, verification status, or data pipelines to the user.

YOU MUST FOLLOW THESE RULES EXACTLY:

1. Before naming ANY player as being on a team, check that their EXACT
   full name appears under that team's abbreviation in
   rosterGrounding.playersByTeamAbbrev. If it does not appear, you
   CANNOT name them as being on that team. Period.

2. If VALID PLAYER POOL includes a focused matchup roster quality line, use that
   matchup-scoped quality instead of global rosterGroundingQuality. If focused
   matchup roster quality is full, use the listed names normally. If it is thin,
   give team-level analysis (pace, scheme, series, totals, injuries from context)
   without inventing players. Do NOT tell the user the roster is missing,
   unconfirmed, partial, or loading — if coverage is weak, reflect that only
   through CONFIDENCE (High / Medium / Speculative), not a prose disclaimer.

3. Your training data about NBA rosters is STALE and WRONG. Trades,
   injuries, and roster moves happen constantly. A player you "know"
   is on a team from training may have been traded months ago. NEVER
   use training memory for specific player-team assignments.

4. "De'Andre Murray", "Marcus Young", or any name you generate that
   is not in playersByTeamAbbrev is a hallucinated player. Hallucinated
   players destroy user trust and make this product worthless. There
   is no acceptable scenario where you invent a player name.

5. EXCEPTION — IMAGE OR USER-NAMED PLAYER: When an image is attached OR the
   Question explicitly names a player (or shows their line card), that name and
   any stats visible in the screenshot or stated in the Question are AUTHORIZED.
   Do not reply with “I can't cite [that player] without verification.” The user
   supplied the source. Use API roster lists only as a supplement.

ROSTER DISCLOSURE RULE:
Never tell the user which players are verified, partial, or loading.
Never say "working from partial roster data."
Never say "data is still loading" or any variation.
Never say which team's roster is confirmed vs thin.
Never mention client UI, API merge, rosterGroundingQuality, or "combined" data sources.
The confidence line reflects data quality. That is the only place uncertainty
about data completeness belongs. Nowhere else.

ENFORCEMENT CHECK: Before generating your response, mentally verify each player name:
If the name appears in the Question or attached image → allowed.
Otherwise, for roster membership → must appear under the correct team in
playersByTeamAbbrev or remove it.`;

function _parseNbaTonightGameAbbrs(tonightGame) {
  const s = String(tonightGame || "").trim();
  const m = s.match(/^([A-Z0-9]{2,4})\s*@\s*([A-Z0-9]{2,4})$/i);
  if (!m) return null;
  return { away: m[1].toUpperCase(), home: m[2].toUpperCase() };
}

function _collectTonightNbaSlateAbbrs(todaysGames) {
  const set = new Set();
  for (const g of todaysGames || []) {
    const aa = String(g?.awayTeam?.abbr || "").toUpperCase();
    const ha = String(g?.homeTeam?.abbr || "").toUpperCase();
    if (aa && aa !== "?") set.add(aa);
    if (ha && ha !== "?") set.add(ha);
  }
  return set;
}

function _filterBdlAvailabilityToTeams(avail, allowTeams) {
  if (!avail || typeof avail !== "object" || !allowTeams || allowTeams.size === 0) return {};
  const out = {};
  for (const [name, meta] of Object.entries(avail)) {
    const t = String(meta?.team || "").toUpperCase();
    if (t && allowTeams.has(t)) out[name] = meta;
  }
  return out;
}

function _buildNbaSlateRowDigest(game) {
  const a = String(game?.awayTeam?.abbr || "").toUpperCase();
  const h = String(game?.homeTeam?.abbr || "").toUpperCase();
  const at = String(game?.awayTeam?.name || "").trim();
  const ht = String(game?.homeTeam?.name || "").trim();
  const tLabel = game?.startTimeUtc
    ? new Date(game.startTimeUtc).toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "America/New_York",
      })
    : "";
  const when = tLabel ? `${tLabel} ET` : "time TBD";
  return `${a} vs ${h} — ${at || a} at ${ht || h} — ${when}`;
}

/**
 * Shallow clone via JSON, then filter what is sent to the model (Haiku) only.
 * Fetch/cache code keeps full nbaContext server-side; call sites pass this for prompt JSON + roster block.
 * @param {object} nbaContext
 * @param {{ awayAbbr: string, homeAbbr: string } | null} nbaMatchup
 */
export function buildNbaContextForModel(nbaContext, nbaMatchup) {
  if (!nbaContext || typeof nbaContext !== "object") return nbaContext;
  const todays = Array.isArray(nbaContext.todaysGames) ? nbaContext.todaysGames : [];
  const tonight = _collectTonightNbaSlateAbbrs(todays);
  const awayF = nbaMatchup ? String(nbaMatchup.awayAbbr || "").toUpperCase() : "";
  const homeF = nbaMatchup ? String(nbaMatchup.homeAbbr || "").toUpperCase() : "";
  /** Two-team matchup scope — stats + rosterGrounding.playersByTeamAbbrev use this when set. */
  const matchupTeamSet = awayF && homeF ? new Set([awayF, homeF]) : null;
  /** Broader slate scope when no matchup resolved (multi-game boards). */
  const relevantTeams = matchupTeamSet || (tonight.size > 0 ? tonight : null);

  let raw;
  try {
    raw = JSON.parse(JSON.stringify(nbaContext));
  } catch {
    return nbaContext;
  }

  if (tonight.size > 0) {
    raw.bdlAvailability = _filterBdlAvailabilityToTeams(raw.bdlAvailability, tonight);
    if (raw.bdlGrounding && typeof raw.bdlGrounding === "object") {
      raw.bdlGrounding = { ...raw.bdlGrounding };
      raw.bdlGrounding.bdlAvailability = _filterBdlAvailabilityToTeams(
        raw.bdlGrounding.bdlAvailability,
        tonight,
      );
      if (raw.bdlGrounding.bdlGroundedPlayers) {
        const gP = {};
        for (const [k, v] of Object.entries(raw.bdlGrounding.bdlGroundedPlayers)) {
          const t = String(v?.team || "").toUpperCase();
          if (t && tonight.has(t)) gP[k] = v;
        }
        raw.bdlGrounding.bdlGroundedPlayers = gP;
      }
    }
  }

  if (tonight.size > 0 && Array.isArray(raw.injuries)) {
    raw.injuries = raw.injuries.filter((r) => tonight.has(String(r?.team || "").toUpperCase()));
  }

  if (Array.isArray(raw.playerStats)) {
    if (relevantTeams && relevantTeams.size > 0) {
      raw.playerStats = raw.playerStats.filter((row) => {
        const t = String(row?.team || "").toUpperCase();
        if (relevantTeams.has(t)) return true;
        if (matchupTeamSet) {
          const tg = _parseNbaTonightGameAbbrs(row?.tonightGame);
          if (tg) {
            const a = [tg.away, tg.home].sort().join();
            const b = [awayF, homeF].sort().join();
            if (a && b && a === b) return true;
          }
        }
        return false;
      });
    } else {
      raw.playerStats = raw.playerStats.slice(0, 72);
    }
    if (!matchupTeamSet && Array.isArray(raw.playerStats) && raw.playerStats.length > 96) {
      raw.playerStats = raw.playerStats.slice(0, 96);
    }
  }

  if (raw.rosterGrounding && raw.rosterGrounding.playersByTeamAbbrev) {
    const rosterAbbrScope = matchupTeamSet || relevantTeams;
    const pbt = {};
    if (rosterAbbrScope && rosterAbbrScope.size > 0) {
      for (const ab of rosterAbbrScope) {
        if (raw.rosterGrounding.playersByTeamAbbrev[ab]) {
          pbt[ab] = raw.rosterGrounding.playersByTeamAbbrev[ab];
        }
      }
    }
    raw.rosterGrounding = { ...raw.rosterGrounding, playersByTeamAbbrev: pbt };
    if (raw.rosterGrounding.qualityByTeam) {
      const q = {};
      const qScope = matchupTeamSet || relevantTeams;
      if (qScope && qScope.size > 0) {
        for (const ab of qScope) {
          if (raw.rosterGrounding.qualityByTeam[ab] != null) {
            q[ab] = raw.rosterGrounding.qualityByTeam[ab];
          }
        }
      }
      raw.rosterGrounding.qualityByTeam = q;
    }
  }

  if (matchupTeamSet && Array.isArray(raw.propLines)) {
    const fa = awayF;
    const fh = homeF;
    raw.propLines = raw.propLines.filter((pl) => {
      const g = String(pl?.game || "");
      if (!g) return true;
      const gup = g.toUpperCase();
      return gup.includes(fa) && gup.includes(fh);
    });
  }

  if (matchupTeamSet && todays.length > 0) {
    raw.todaysGames = todays.map((g) => {
      const a = String(g?.awayTeam?.abbr || "").toUpperCase();
      const h = String(g?.homeTeam?.abbr || "").toUpperCase();
      const isFocus = (a === awayF && h === homeF) || (a === homeF && h === awayF);
      if (isFocus) return g;
      return {
        _slimSlate: true,
        awayTeam: { abbr: g?.awayTeam?.abbr, name: g?.awayTeam?.name, score: g?.awayTeam?.score },
        homeTeam: { abbr: g?.homeTeam?.abbr, name: g?.homeTeam?.name, score: g?.homeTeam?.score },
        startTimeUtc: g?.startTimeUtc,
        startTimeSource: g?.startTimeSource,
        state: g?.state,
        status: g?.status,
        period: g?.period,
        clock: g?.clock,
        seriesContext: g?.seriesContext,
        digest: _buildNbaSlateRowDigest(g),
      };
    });
  }

  if (matchupTeamSet && raw.gameTotals && typeof raw.gameTotals === "object" && !Array.isArray(raw.gameTotals)) {
    const o = {};
    for (const [k, v] of Object.entries(raw.gameTotals)) {
      const ku = k.toUpperCase();
      if (ku.includes(awayF) && ku.includes(homeF)) o[k] = v;
    }
    if (Object.keys(o).length > 0) raw.gameTotals = o;
  }

  if (matchupTeamSet && Array.isArray(raw.playoffSeries)) {
    raw.playoffSeries = raw.playoffSeries.filter((row) => {
      const s = JSON.stringify(row || "").toUpperCase();
      return s.includes(awayF) && s.includes(homeF);
    });
    raw.focusedSeriesSnapshot = buildFocusedPlayoffSeriesSnapshot(awayF, homeF, raw.playoffSeries, todays);
  }

  if (Array.isArray(raw.playerStats) && raw.playerStats.length > 0) {
    delete raw.playerStatsText;
  }

  return raw;
}

function extractMlbMarketHints(qRaw) {
  const q = String(qRaw || "").toLowerCase();
  const hints = new Set();
  if (/\b(strikeout|strikeouts|\bk\b|\bks\b|\bso\b|punchies)\b/i.test(q)) hints.add("strikeouts");
  if (/\b(total\s+bases|\btb\b)\b/i.test(q)) hints.add("total_bases");
  if (/\b(home\s*run|homer|\bhr\b|\bhrs\b)\b/i.test(q)) hints.add("home_runs");
  if (/\bhits\b/i.test(q)) hints.add("hits");
  if (/\brbi(s)?\b/i.test(q)) hints.add("rbis");
  if (
    /\b(game\s+total|team\s+total|runs\s+total|total\s+runs|over[/\s-]+under|ou\s*\d)/i.test(q)
  ) {
    hints.add("game_total");
  }
  return hints;
}

function mlbPropMatchesMarketHints(pl, hints) {
  if (!hints || hints.size === 0) return true;
  const raw = `${pl?.propRaw || ""} ${pl?.prop || ""}`.toLowerCase();
  for (const h of hints) {
    if (h === "game_total") continue;
    if (
      h === "strikeouts" &&
      (raw.includes("strikeout") || raw.includes("pitcher_strikeout"))
    )
      return true;
    if (h === "total_bases" && (raw.includes("total_base") || raw.includes("total bases")))
      return true;
    if (h === "home_runs" && raw.includes("home_run")) return true;
    if (h === "hits" && raw.includes("batter_hits")) return true;
    if (h === "rbis" && raw.includes("batter_rbis")) return true;
  }
  return false;
}

function collectMlbRosterNames(mlbContext) {
  const names = [];
  const seen = new Set();
  for (const pl of mlbContext?.propLines || []) {
    const n = String(pl?.player || "").trim();
    if (!n || seen.has(n.toLowerCase())) continue;
    seen.add(n.toLowerCase());
    names.push(n);
  }
  for (const g of mlbContext?.games || []) {
    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      const n = String(pit || "").trim();
      if (!n || /^tbd$/i.test(n) || seen.has(n.toLowerCase())) continue;
      seen.add(n.toLowerCase());
      names.push(n);
    }
  }
  return names;
}

function findMlbPlayerReference(question, mlbContext) {
  const q = normalizeText(question);
  if (!q) return { matched: false };
  const candidates = [];
  for (const fullName of collectMlbRosterNames(mlbContext)) {
    const lower = fullName.toLowerCase();
    const parts = lower.split(/\s+/).filter(Boolean);
    const last = parts[parts.length - 1];
    if (q.includes(lower)) {
      candidates.push({ fullName, score: 100 });
      continue;
    }
    if (last && last.length >= 4 && new RegExp(`\\b${escapeRegExp(last)}\\b`, "i").test(q)) {
      candidates.push({ fullName, score: last.length });
    }
  }
  if (candidates.length === 0) return { matched: false };
  candidates.sort((a, b) => b.score - a.score);
  const topScore = candidates[0].score;
  const tied = candidates.filter((c) => c.score === topScore);
  if (tied.length > 1) return { matched: false, ambiguous: true };
  return { matched: true, canonicalName: tied[0].fullName };
}

function playerNamesAlign(a, b) {
  const na = String(a || "")
    .trim()
    .toLowerCase();
  const nb = String(b || "")
    .trim()
    .toLowerCase();
  if (!na || !nb) return false;
  if (na === nb) return true;
  const la = na.split(/\s+/).pop();
  const lb = nb.split(/\s+/).pop();
  return Boolean(la && lb && la === lb && la.length >= 4);
}

function scoreMlbGameMatch(question, g) {
  const ql = normalizeText(question);
  let s = 0;
  for (const t of [g?.awayTeam, g?.homeTeam]) {
    const ab = String(t?.abbr || "").toLowerCase();
    const nm = String(t?.name || "");
    const nml = nm.toLowerCase();
    if (ab && ql.includes(ab)) s += 3;
    if (nm.length > 4 && ql.includes(nml)) s += 4;
    const last = nm.split(" ").pop();
    if (last && last.length >= 4 && ql.includes(last.toLowerCase())) s += 2;
    if (nml.includes("red sox") && ql.includes("red sox")) s += 4;
    if (nml.includes("white sox") && ql.includes("white sox")) s += 4;
  }
  return s;
}

function findMlbGameReference(question, games) {
  if (!Array.isArray(games) || games.length === 0) return { matched: false };
  const scored = games
    .map((g) => ({ g, s: scoreMlbGameMatch(question, g) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length === 0) return { matched: false };
  if (scored[0].s >= 4) return { matched: true, game: scored[0].g };
  if (scored[0].s >= 3 && (scored.length === 1 || scored[0].s > scored[1].s)) {
    return { matched: true, game: scored[0].g };
  }
  if (scored[0].s >= 2 && scored.length === 1) return { matched: true, game: scored[0].g };
  return { matched: false };
}

function gameRowMatchesPropGame(plGame, g) {
  if (!plGame || !g) return false;
  const parts = String(plGame)
    .split("@")
    .map((s) => s.trim().toLowerCase());
  if (parts.length !== 2) return false;
  const [pa, ph] = parts;
  const ga = String(g.awayTeam?.name || "").toLowerCase();
  const gh = String(g.homeTeam?.name || "").toLowerCase();
  const rough = (a, b) =>
    Boolean(a && b && (a.includes(b) || b.includes(a) || a.split(/\s+/).pop() === b.split(/\s+/).pop()));
  return (
    (rough(pa, ga) && rough(ph, gh)) || (rough(pa, gh) && rough(ph, ga))
  );
}

function findGameTotalsKeyForGame(gameTotals, g) {
  if (!g || !gameTotals || typeof gameTotals !== "object") return null;
  for (const key of Object.keys(gameTotals)) {
    if (gameRowMatchesPropGame(key, g)) return key;
  }
  return null;
}

/**
 * MLB server decision mode (MLB only — aligns conditional analysis with missing-market guardrails).
 * - no_data: nothing usable in payload (no games, props, or gameTotals keys).
 * - actionable: posted data in propLines/gameTotals matches this question's player/game/market scope.
 * - pre_market_framework: incomplete or not question-relevant — no fabricated prop lines or K projections.
 *
 * Known limitations (baseline — keep question-aware routing lean; refine deliberately):
 * - Player detection uses names from propLines plus probable/listed pitchers on games[] only — not full batting rosters.
 * - Game/prop/totals matching can fall back to pre_market_framework when ESPN vs Odds API team strings diverge.
 * - If the question implies a player but extractMlbMarketHints finds no market keywords, any prop row for that player still qualifies as actionable (narrow by prompts later if needed).
 */
export function resolveMlbDecisionMode(mlbContext = {}, question = "") {
  const games = Array.isArray(mlbContext?.games) ? mlbContext.games : [];
  const propLines = Array.isArray(mlbContext?.propLines) ? mlbContext.propLines : [];
  const gameTotals =
    mlbContext?.gameTotals &&
    typeof mlbContext.gameTotals === "object" &&
    !Array.isArray(mlbContext.gameTotals)
      ? mlbContext.gameTotals
      : {};

  const hasGames = games.length > 0;
  const hasProps = propLines.length > 0;
  const hasTotals = Object.keys(gameTotals).length > 0;

  if (!hasGames && !hasProps && !hasTotals) {
    return "no_data";
  }

  const marketHints = extractMlbMarketHints(question);
  const wantsGameTotal = marketHints.has("game_total");
  const playerRef = findMlbPlayerReference(question, mlbContext);
  const gameRef = findMlbGameReference(question, games);

  const propsForPlayer = playerRef.matched
    ? propLines.filter((pl) => playerNamesAlign(pl?.player, playerRef.canonicalName))
    : [];

  if (playerRef.matched) {
    if (propsForPlayer.length === 0) return "pre_market_framework";
    const hintsNoTotal = new Set(marketHints);
    hintsNoTotal.delete("game_total");
    if (hintsNoTotal.size === 0) {
      return "actionable";
    }
    const ok = propsForPlayer.some((pl) => mlbPropMatchesMarketHints(pl, hintsNoTotal));
    return ok ? "actionable" : "pre_market_framework";
  }

  if (gameRef.matched) {
    const forGame = propLines.filter((pl) => gameRowMatchesPropGame(pl.game, gameRef.game));
    const totalsKey = findGameTotalsKeyForGame(gameTotals, gameRef.game);
    if (wantsGameTotal) {
      if (totalsKey) return "actionable";
      return forGame.length > 0 ? "actionable" : "pre_market_framework";
    }
    const hintsNoTotal = new Set(marketHints);
    hintsNoTotal.delete("game_total");
    if (hintsNoTotal.size === 0) {
      return forGame.length > 0 ? "actionable" : "pre_market_framework";
    }
    const ok = forGame.some((pl) => mlbPropMatchesMarketHints(pl, hintsNoTotal));
    return ok ? "actionable" : "pre_market_framework";
  }

  return "pre_market_framework";
}

function buildMlbNoDataTerminalResponse({ derivedConfidence }) {
  return `Lean: broad and low-confidence until a game is pinned.

Without a specific matchup, the safest MLB default is role-first: trust confirmed starters, bullpen depth, and run-environment context over hot streak narratives.

Where it breaks: once park/weather, lineups, or pitcher confirmation changes the run environment, this generic lean can flip quickly.

Drop the exact matchup (or player + market) and I’ll tighten this into a concrete over/under-style take.

Confidence: Low (${derivedConfidence}) — this is a no-context opinion, not a verified market read.`;
}

function buildRateLimitFallbackResponse({
  sportHint,
  question,
  derivedConfidence,
  nbaContext,
  mlbContext,
  golfContext,
  f1Context,
}) {
  const q = String(question || "").trim();
  if (sportHint === "nba") {
    const games = (nbaContext?.todaysGames || [])
      .slice(0, 3)
      .map((g) => `${g?.awayTeam?.abbr || "AWAY"} @ ${g?.homeTeam?.abbr || "HOME"}`);
    const gameLine = games.length ? `Slate focus: ${games.join(" | ")}.` : "Slate focus: NBA board context is loaded.";
    return `Quick board read while upstream is busy: lean pace-and-rotation angles over hard line calls right now. ${gameLine} Confidence: ${derivedConfidence}.`;
  }
  if (sportHint === "mlb") {
    const games = (mlbContext?.games || [])
      .slice(0, 3)
      .map((g) => `${g?.awayTeam?.abbr || "AWAY"} @ ${g?.homeTeam?.abbr || "HOME"}`);
    return `Quick MLB board read while upstream is busy: prioritize starter role clarity and park context before committing to prop size. ${games.length ? `Slate focus: ${games.join(" | ")}.` : ""} Confidence: ${derivedConfidence}.`;
  }
  if (sportHint === "golf") {
    const ev = golfContext?.currentEvent || golfContext?.tournament || null;
    return `Quick golf board read while upstream is busy: favor placement markets over outrights unless board volatility clearly supports the upside. ${ev ? `Event: ${ev?.shortName || ev?.name || "PGA Tour event"}.` : ""} Confidence: ${derivedConfidence}.`;
  }
  if (sportHint === "f1") {
    const race = (f1Context?.schedule?.races || []).find((r) => r?.is_next) || f1Context?.schedule?.races?.[0];
    return `Quick F1 board read while upstream is busy: prefer race-pace and team-trim angles over single-session noise. ${race ? `Next race: ${race?.meeting_name || race?.name || "Grand Prix"}.` : ""} Confidence: ${derivedConfidence}.`;
  }
  return `Quick read while upstream is busy: ${q || "use matchup context"} and lean the highest-signal structural edge over low-information line chasing. Confidence: ${derivedConfidence}.`;
}

function buildMlbPreMarketUserPrompt({
  question,
  mlbContext,
  derivedConfidence,
  priorTakesSummary,
  mlbVerifiedBlock,
}) {
  const gameTotals =
    mlbContext?.gameTotals &&
    typeof mlbContext.gameTotals === "object" &&
    !Array.isArray(mlbContext.gameTotals)
      ? mlbContext.gameTotals
      : {};
  const totalsKeys = Object.keys(gameTotals);
  const totalsPreview =
    totalsKeys.length > 0
      ? JSON.stringify(
          Object.fromEntries(totalsKeys.slice(0, 12).map((k) => [k, gameTotals[k]])),
          null,
          2,
        )
      : null;

  const totalsNote = totalsPreview
    ? `Listed game totals from payload only — cite these numbers verbatim when referencing a total:\n${totalsPreview}`
    : "No gameTotals in this payload — do not state a game total number.";

  return `You are answering an MLB betting question in PRE_MARKET_FRAMEWORK mode.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

MLB context (JSON — authoritative for what exists; absence means unknown):
${JSON.stringify(mlbContext || {}, null, 2)}

${mlbVerifiedBlock}

${totalsNote}

SERVER MODE — PRE_MARKET_FRAMEWORK (mandatory)
- Do NOT invent prop numbers, K totals, strikeout lines, hitter lines, juice, or price quotes.
- Do NOT say or imply "expect K props at X", "books will price", "likely opens at", "look for under 6.5", or any fabricated numeric projection unless that exact number appears in propLines or gameTotals in the JSON above.
- Do NOT assume books are pricing anything until propLines lists the market.
- You MAY describe park factors and venue using games[].park (and named pitchers only when printed on that side — never invent a starter name).
- You MAY cite a game total ONLY from gameTotals in the JSON (exact number).

Answer structure:
1. Lean first — give a clear take (over/under/side/slight lean/close) even when market verification is missing.

2. Structural angles — park/run environment, role, matchup, and game-script framing without fake prop numbers.

3. What breaks the lean — one concrete condition that would invalidate or flip it.

4. Optional clarifier — ask for one compact missing market detail (exact line / market scope) to tighten the recommendation.

CONFIDENCE — cap at Medium; align tone with ${derivedConfidence}.

Rules:
- Answer only as an MLB analyst.
- Do not mention NBA, NFL, golf, F1, or tennis.
`;
}

function buildMlbActionableUserPrompt({
  question,
  mlbContext,
  derivedConfidence,
  priorTakesSummary,
  mlbVerifiedBlock,
}) {
  return `You are answering an MLB betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

MLB context:
${JSON.stringify(mlbContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

${mlbVerifiedBlock}

SERVER MODE — ACTIONABLE (propLines present in payload)
- You MAY cite specific prop lines ONLY when they appear in propLines (player, prop type, line, book/sportsbook field as given).
- You MAY cite game total numbers ONLY from gameTotals in the JSON.
- Do NOT invent props, K totals, or juice not shown in propLines or gameTotals.
- Do NOT claim books "will" open or price at a level without a listed line in propLines.

Rules:
- Answer only as an MLB analyst.
- Do not mention golf, NBA, NFL, F1, or tennis.
- Do not invent unrelated games or props.

Lead with the strongest grounded angle using verified lines from propLines. If a starter is still TBD in games[], say so and keep the lean conditional on confirmation.
`;
}

function buildMlbVerifiedPlayerListBlock(mlbContext) {
  const pitchers = [];
  const propListed = [];
  const pitSeen = new Set();
  const propSeen = new Set();
  const pitcherListLines = [];
  for (const g of mlbContext?.games || []) {
    const homeAbbr = String(g?.homeTeam?.abbr || "?").trim();
    const awayAbbr = String(g?.awayTeam?.abbr || "?").trim();
    const homePitcher = String(g?.homeTeam?.pitcher || "").trim() || "TBD";
    const awayPitcher = String(g?.awayTeam?.pitcher || "").trim() || "TBD";
    pitcherListLines.push(`${awayAbbr} @ ${homeAbbr}: ${awayPitcher} (away) vs ${homePitcher} (home)`);

    for (const side of ["homeTeam", "awayTeam"]) {
      const pit = g?.[side]?.pitcher;
      if (pit == null) continue;
      const n = String(pit).trim();
      if (n && !pitSeen.has(n)) {
        pitSeen.add(n);
        pitchers.push(n);
      }
    }
  }
  pitchers.sort();
  for (const pl of mlbContext?.propLines || []) {
    if (!pl?.player) continue;
    const n = String(pl.player).trim();
    if (n && !propSeen.has(n)) {
      propSeen.add(n);
      propListed.push(n);
    }
  }
  propListed.sort();
  const pitcherList = pitcherListLines.length > 0 ? pitcherListLines.join("\n") : "(no games in payload)";

  return `VERIFIED MLB PLAYERS TONIGHT:
Pitcher matchups:
${pitcherList}

Pitchers: ${pitchers.length ? pitchers.join(", ") : "(none in games array)"}
Prop-listed players: ${propListed.length ? propListed.join(", ") : "(none)"}

Do not name any batter or pitcher not on this list as playing tonight.
When a pitcher shows as "TBD", you MUST say: "starter TBD for [team] — Coors Field park factor analysis applies regardless"
for that team context, then give a venue-based read without inventing pitcher names.`;
}

function buildNflVerifiedPlayerListBlock(nflContextEffective) {
  const set = new Set();
  if (nflContextEffective && typeof nflContextEffective === "object" && !Array.isArray(nflContextEffective)) {
    const ui = nflContextEffective.uiPlayers;
    if (ui && typeof ui === "object") {
      for (const k of Object.keys(ui)) {
        const t = String(k).trim();
        if (t) set.add(t);
      }
    }
  }
  const sorted = [...set].sort();
  const staleNote =
    "This list is from the offseason knowledge base — treat as directional, not live-verified.";
  if (sorted.length === 0) {
    return `NO VERIFIED NFL PLAYERS (empty uiPlayers keys in context).

${staleNote}`;
  }
  return `VERIFIED NFL PLAYERS (uiPlayers keys):
${sorted.join(", ")}

${staleNote}

Do not name any NFL player not on this list as active on this slate.`;
}

function buildNflDraftProspectBlock(draftBundle) {
  const prospects = Array.isArray(draftBundle?.prospects) ? draftBundle.prospects : [];
  if (!prospects.length) {
    return `DRAFT PROSPECT ANCHORS: unavailable in active bundle.
If a user asks for a non-board name, label it "simulation-only (UDFA-range)" and do not present it as an official slot outcome.`;
  }
  const lines = prospects.map((p) => {
    const status =
      p?.boardStatus === "verified_pool"
        ? "verified_pool"
        : p?.boardStatus === "boarded"
          ? "boarded"
          : "simulation-only";
    let stats = "stats: n/a";
    if (typeof p?.nflGrade === "number" && Number.isFinite(p.nflGrade)) {
      stats = `NFL grade: ${p.nflGrade}`;
    } else if (p?.keyStats && typeof p.keyStats === "object") {
      stats = Object.entries(p.keyStats)
        .slice(0, 3)
        .map(([k, v]) => `${k}:${v}`)
        .join(" | ");
    }
    const band = p?.projectedRange ? `slot band ${p.projectedRange}` : "slot band n/a";
    const cr = p?.consensusRank != null ? `consensus #${p.consensusRank}` : "";
    return `- ${p.name} (${p.position}, ${p.school}) [${status}] — ${band}${cr ? `; ${cr}` : ""} — ${stats}`;
  });
  return `VERIFIED 2026 DRAFT PROSPECT ANCHORS:
${lines.join("\n")}

Roster-grounding rule for draft names:
- If a requested prospect is NOT in this list, you must label them exactly as "simulation-only (UDFA-range)".
- You may discuss fit hypotheticals, but you must not present them as locked pick outcomes in official board language.`;
}

function buildDraftProspectsByPositionBlock(draftBundle) {
  const prospects = Array.isArray(draftBundle?.prospects)
    ? draftBundle.prospects.filter((p) => Number(p?.projectedRound || 9) <= 4)
    : [];
  if (!prospects.length) return "(verified rounds 1-4 pool unavailable)";
  const grouped = {};
  for (const p of prospects) {
    const pos = String(p.position || "UNK").toUpperCase();
    if (!grouped[pos]) grouped[pos] = [];
    grouped[pos].push(p);
  }
  const lines = [];
  for (const pos of Object.keys(grouped).sort()) {
    const row = grouped[pos]
      .sort(
        (a, b) =>
          Number((a.consensusRank ?? a.overallRank) || 999) -
          Number((b.consensusRank ?? b.overallRank) || 999),
      )
      .slice(0, 10)
      .map((p) => `${p.name} (${p.school}) #${p.consensusRank ?? p.overallRank}`)
      .join(", ");
    lines.push(`${pos}: ${row}`);
  }
  return lines.join("\n");
}

function collectTennisVerifiedNames(players, liveMatches) {
  const set = new Set();
  for (const tour of ["atp", "wta"]) {
    const o = players?.[tour];
    if (o && typeof o === "object") {
      for (const k of Object.keys(o)) {
        const n = String(k).trim();
        if (n) set.add(n);
      }
    }
  }
  for (const m of liveMatches || []) {
    const h = String(m?.home_team || m?.raw?.home_team || m?.raw?.home || "").trim();
    const a = String(m?.away_team || m?.raw?.away_team || m?.raw?.away || "").trim();
    if (h) set.add(h);
    if (a) set.add(a);
  }
  return set;
}

function buildTennisVerifiedPlayerListBlock(players, liveMatches) {
  const set = collectTennisVerifiedNames(players, liveMatches);
  const sorted = [...set].sort();
  if (sorted.length === 0) {
    return `NO VERIFIED TENNIS PLAYERS in liveMatches (home_team/away_team) or ATP/WTA database keys. Do not invent players.`;
  }
  return `VERIFIED TENNIS PLAYERS (liveMatches home_team/away_team + ATP/WTA database keys):
${sorted.join(", ")}

For match-specific takes you may ONLY name players from this list.`;
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
  return set;
}

function buildGolfVerifiedPlayerListBlock(golfContext) {
  const set = collectGolfVerifiedNames(golfContext);
  const sorted = [...set].sort();
  if (sorted.length === 0) {
    return `NO VERIFIED GOLF PLAYERS in leaderboard or rankings payloads. Do not invent golfers.`;
  }
  return `VERIFIED GOLF PLAYERS:
${sorted.join(", ")}

You may ONLY name golfers from this list in golf takes.`;
}

function buildF1VerifiedDriverListBlock(f1Context) {
  const names = new Set();
  for (const row of f1Context?.standings || []) {
    const n = String(row?.full_name || "").trim();
    if (n) names.add(n);
  }
  const sorted = [...names].sort();
  if (sorted.length === 0) {
    return `NO VERIFIED F1 DRIVERS in standings payload. Do not invent drivers.`;
  }
  return `VERIFIED F1 DRIVERS:
${sorted.join(", ")}

You may ONLY name drivers from this list in F1 takes.`;
}

function buildMessagesForAnthropic({ userPrompt, history, intent, hasImage, image }) {
  const prior = intent === "slip_review" ? [] : normalizeIncomingChatHistory(history);

  if (hasImage) {
    const content = [];
    let textBlock = userPrompt;
    if (prior.length) {
      const transcript = prior
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
        .join("\n\n");
      textBlock = `Prior conversation (most recent last):\n${transcript}\n\n---\n\nCurrent message:\n${userPrompt}`;
    }
    content.push({ type: "text", text: textBlock });
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mediaType,
        data: image.base64,
      },
    });
    return [{ role: "user", content }];
  }

  return [...prior, { role: "user", content: userPrompt }];
}

// ── Main Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method === "OPTIONS") return res.status(200).end();

  const feedSnagResponse = (sportVal) => {
    const text =
      "The feed hit a snag on that one — try rephrasing or ask about a specific player or matchup and I'll work with what's available.";
    return res.status(200).json({
      response: text,
      take: text,
      confidence: "none",
      sport: sportVal || "unknown",
      fallback: true,
    });
  };

  if (req.method !== "POST") {
    return feedSnagResponse(null);
  }

  const clientIp = getClientIp(req);
  if (!allowRateLimit(`urtake:ip:${clientIp}`, ipLimit())) {
    return feedSnagResponse(null);
  }

  /** @type {{ ok: true, email: string | null, tier: string } | { ok: false, reason: string } | null} */
  let urAuth = null;
  if (shouldRequireUrTakeAuth()) {
    urAuth = verifyBearerForUrTake(req.headers.authorization);
    if (!urAuth.ok) {
      if (urAuth.reason === "server_misconfigured") {
        return feedSnagResponse(null);
      }
      return feedSnagResponse(null);
    }
    if (urAuth.email && !allowRateLimit(`urtake:email:${urAuth.email}`, emailLimit())) {
      return feedSnagResponse(null);
    }
  }

  const sanitized = sanitizeUrTakeBody(req.body);
  if (!sanitized.ok) {
    const hint =
      req.body && typeof req.body === "object" && req.body !== null && "sportHint" in req.body
        ? /** @type {{ sportHint?: string }} */ (req.body).sportHint
        : null;
    return feedSnagResponse(
      typeof hint === "string" && hint.trim() ? hint.trim() : null,
    );
  }
  req.body = sanitized.body;

  if (urAuth?.ok && urAuth.email) {
    req.body.userEmail = urAuth.email;
  }

  const userTier = urAuth?.tier ?? "free";
  const isPro = ["pro", "owner", "friend"].includes(userTier);

  const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";

  if (!ANTHROPIC_API_KEY) {
    return feedSnagResponse(
      typeof req.body?.sportHint === "string" && req.body.sportHint.trim()
        ? req.body.sportHint.trim()
        : null,
    );
  }

  const {
    question,
    userEmail,
    sportHint: incomingSportHint,
    teamHint,
    players,
    context,
    liveMatches,
    golfContext,
    nbaContext: nbaContextFromClient,
    mlbContext: mlbContextFromClient,
    f1Context,
    nflContext,
    matchupContext,
    image,
    history: incomingHistory,
  } = req.body || {};

  const normalizedUrTakeHistoryForGate = normalizeIncomingChatHistory(incomingHistory);
  const isConversationFollowUp = normalizedUrTakeHistoryForGate.length > 1;

  if (!question || !String(question).trim()) {
    return feedSnagResponse(
      typeof incomingSportHint === "string" && incomingSportHint.trim()
        ? incomingSportHint.trim()
        : null,
    );
  }

  const hasImage = !!image?.base64;

  const intent = detectIntent(question, hasImage);
  const chaseSignals = detectChaseSignals(question, incomingHistory);
  const shortMarketFollowUp = isShortMarketFollowUp(question);
  const hasLiveTranscriptContext = hasRecentLiveScreenshotContext(incomingHistory);
  if (chaseSignals.isChase) {
    console.log(
      JSON.stringify({
        event: "chase_detected",
        userEmail: userEmail || "anonymous",
        sameTopicCount: chaseSignals.sameTopicCount,
        hasChaseLanguage: chaseSignals.hasChaseLanguage,
        hasHedgingPanicLanguage: chaseSignals.hasHedgingPanicLanguage,
        question: String(question).slice(0, 200),
        ts: new Date().toISOString(),
      }),
    );
  }
  const liveSignals = detectLiveGameSignals(question, hasImage);

  let sportHint = resolveSportHint({
    incomingSportHint,
    question,
    matchupContext,
    hasImage,
    golfContext,
  });
  const firstSessionNoHistory = !Array.isArray(incomingHistory) || incomingHistory.length === 0;
  let firstSessionGuaranteeFeature = null;
  let preloadedNbaBoard = null;
  if (firstSessionNoHistory && (sportHint === "generic" || sportHint === "image_review")) {
    try {
      const fresh = await buildNbaUrTakeBoard(String(question || ""));
      const featured = selectTopNbaSlateGameForGuarantee(fresh);
      if (featured?.game) {
        preloadedNbaBoard = fresh;
        firstSessionGuaranteeFeature = featured;
        sportHint = "nba";
      }
    } catch (err) {
      console.warn("[ur-take] first-session guarantee board load failed:", err?.message || err);
    }
  }
  const detectedSport = sportHint;
  console.log("[ur-take] request:", {
    sport: detectedSport,
    questionSlice: question?.slice(0, 80),
  });
  const nbaDebugEnabled = isTruthyFlag(getEnv("UR_TAKE_NBA_DEBUG"));

  /** Server-authoritative slate for NBA — client payload can be stale (poll interval) or omit games. */
  let nbaContext = nbaContextFromClient;
  let mlbContext = mlbContextFromClient;
  let golfContextEffective = golfContext;
  if (sportHint === "nba") {
    try {
      const fresh = preloadedNbaBoard || (await buildNbaUrTakeBoard(String(question || "")));
      nbaContext = {
        ...fresh,
        question: String(question || ""),
        clientUiSurface: nbaContextFromClient?.clientUiSurface ?? fresh.clientUiSurface,
      };
      nbaContext.rosterGrounding = augmentNbaRosterGroundingWithUi(
        nbaContext.rosterGrounding,
        nbaContext.todaysGames || [],
      );
    } catch (err) {
      console.warn("[ur-take] buildNbaUrTakeBoard failed:", err?.message || err);
      nbaContext = nbaContextFromClient;
    }
    if (
      isConversationFollowUp &&
      nbaContextFromClient &&
      typeof nbaContextFromClient === "object"
    ) {
      const c = nbaContextFromClient;
      const overlays = {};
      const serverPlayoffSeries = Array.isArray(nbaContext?.playoffSeries) ? nbaContext.playoffSeries : [];
      if (
        serverPlayoffSeries.length === 0 &&
        Array.isArray(c.playoffSeries) &&
        c.playoffSeries.length > 0
      ) {
        overlays.playoffSeries = c.playoffSeries;
      }
      if (Array.isArray(c.injuries) && c.injuries.length > 0) {
        overlays.injuries = c.injuries;
      }
      if (Object.keys(overlays).length > 0) {
        nbaContext = { ...nbaContext, ...overlays };
      }
      const cPbt = c.rosterGrounding?.playersByTeamAbbrev;
      if (cPbt && typeof cPbt === "object" && !Array.isArray(cPbt) && Object.keys(cPbt).length > 0) {
        const sRg = nbaContext.rosterGrounding;
        const sPbt = (sRg && sRg.playersByTeamAbbrev) || {};
        const mergedPbt = { ...sPbt };
        for (const [k, val] of Object.entries(cPbt)) {
          if (!Array.isArray(val) || !val.length) continue;
          const key = String(k).toUpperCase();
          const prev = mergedPbt[key];
          if (!Array.isArray(prev) || !prev.length) {
            mergedPbt[key] = val.slice();
          } else {
            const seen = new Set(prev.map((n) => String(n).toLowerCase()));
            const add = prev.slice();
            for (const n of val) {
              const nm = String(n || "").trim();
              if (nm && !seen.has(nm.toLowerCase())) {
                seen.add(nm.toLowerCase());
                add.push(nm);
              }
            }
            mergedPbt[key] = add;
          }
        }
        nbaContext = {
          ...nbaContext,
          rosterGrounding: {
            ...(sRg && typeof sRg === "object" ? sRg : {}),
            playersByTeamAbbrev: mergedPbt,
          },
        };
      }
    }
  }

  if (sportHint === "nba" && nbaContext && !nbaContext.newsImpact) {
    nbaContext.newsImpact = buildNbaNewsImpact(nbaContext);
  }

  const oddsAvailable = resolveOddsAvailabilityForSport({
    sportHint,
    nbaContext,
    mlbContext,
    golfContext: golfContextEffective,
    f1Context,
    nflContext,
    liveMatches,
    context,
  });
  if (sportHint === "nba" && nbaContext && typeof nbaContext === "object") {
    nbaContext = { ...nbaContext, oddsAvailable };
  }
  if (sportHint === "mlb" && mlbContext && typeof mlbContext === "object") {
    mlbContext = { ...mlbContext, oddsAvailable };
  }
  if (sportHint === "golf" && golfContextEffective && typeof golfContextEffective === "object") {
    golfContextEffective = { ...golfContextEffective, oddsAvailable };
  }
  if (sportHint === "f1" && f1Context && typeof f1Context === "object") {
    f1Context.oddsAvailable = oddsAvailable;
  }
  if (sportHint === "nfl" && nflContext && typeof nflContext === "object") {
    nflContext.oddsAvailable = oddsAvailable;
  }

  const nbaNewsImpact = sportHint === "nba" ? nbaContext?.newsImpact || null : null;
  const nbaInvalidation =
    sportHint === "nba"
      ? applyNbaMarketInvalidation({
          question,
          board: nbaContext || {},
          newsImpact: nbaNewsImpact,
        })
      : {
          decisionMode: "normal",
          blocked: false,
          unresolved: false,
          targetedPlayer: null,
          statusClass: "unknown",
          statusDisplay: "",
          team: null,
          requiresStatusAcknowledgement: false,
        };

  const nbaAvailabilityIntent =
    sportHint === "nba"
      ? detectNbaAvailabilityIntent(question)
      : { isAvailabilityQuestion: false, asksBettingConsequence: false };
  const nbaDirectPropAsk = sportHint === "nba" ? isDirectNbaPropAsk(question) : false;
  const nbaDecisionMode =
    sportHint === "nba"
      ? resolveNbaDecisionMode({
          sportHint,
          availabilityIntent: nbaAvailabilityIntent,
          directPropAsk: nbaDirectPropAsk,
          invalidation: nbaInvalidation,
        })
      : "none";

  const mlbDecisionMode =
    sportHint === "mlb" ? resolveMlbDecisionMode(mlbContext || {}, String(question || "")) : null;

  const contextQuality = getContextQuality({
    sportHint,
    players,
    context,
    liveMatches,
    golfContext: golfContextEffective,
    nbaContext,
    mlbContext,
    nflContext,
    f1Context,
    matchupContext,
  });

  const baseDerivedConfidence = deriveConfidenceLabel({
    intent,
    sportHint,
    hasImage,
    matchupContext,
    question,
    contextQuality,
    isLive: liveSignals.isLive,
  });
  const nbaConfidenceModifier =
    sportHint === "nba"
      ? applyNbaConfidenceModifiers({
          baseConfidence: baseDerivedConfidence,
          invalidation: nbaInvalidation,
          nbaContext,
        })
      : { label: baseDerivedConfidence, reason: "" };
  const derivedConfidence = nbaConfidenceModifier.label;
  const nbaMatchup =
    sportHint === "nba" ? resolveNbaMatchupFromQuestion(question, nbaContext || {}) : null;
  const nbaMatchupPool =
    sportHint === "nba" && nbaMatchup
      ? buildAllowedMatchupPlayerPool(nbaMatchup, nbaContext || {})
      : null;
  const nbaMatchupGroundingBlock =
    sportHint === "nba" ? injectMatchupGroundingBlock(nbaMatchup, nbaMatchupPool) : "";
  const nbaMatchupGroundingApplied = sportHint === "nba" && Boolean(nbaMatchupGroundingBlock);
  const nbaOffMatchupPromptAcknowledgement =
    sportHint === "nba" ? buildOffMatchupPromptAcknowledgement(question, nbaMatchup, nbaMatchupPool) : "";

  const nbaGameStateGate =
    sportHint === "nba" ? buildNbaGameStateGateSnapshot(nbaContext || {}, nbaMatchup) : null;

  const nbaContextForModel =
    sportHint === "nba" && nbaContext && typeof nbaContext === "object"
      ? buildNbaContextForModel(nbaContext, nbaMatchup)
      : nbaContext;

  const tennisSystemPromptExtra = ``;

  const evidenceSparsityProfile = resolveEvidenceSparsityProfile({
    contextQuality,
    question: String(question || ""),
    hasMatchupContext: Boolean(matchupContext),
    sportHint,
    intent,
    hasImage,
  });
  const takeTrustUi = buildTakeTrustUiMetadata({
    contextQuality,
    evidenceSparsityProfile,
    sportHint,
  });
  const takeClientPayload = (takeRecord) => ({
    id: takeRecord.id,
    playLine: takeRecord.playLine,
    confidence: takeRecord.confidence,
    status: takeRecord.status,
    trust: takeTrustUi,
  });

  const systemPrompt = composeRegisteredUrTakeSystemPrompt({
    contextQuality,
    sportHint,
    chaseSignals,
    tennisSystemPromptExtra,
    nbaDecisionMode,
    mlbDecisionMode,
    question: String(question || ""),
    intent,
    hasImage,
    hasMatchupContext: Boolean(matchupContext),
    evidenceSparsityProfile,
    liveSignals,
  });

  const outputJsonMode = isConversationFollowUp
    ? "plain"
    : resolveOutputJsonMode({
        chaseSignals,
        intent,
        hasImage,
        liveSignals,
        question,
        matchupContext,
        sportHint,
      });
  const jsonContract = buildJsonOutputContract(outputJsonMode, sportHint, {
    requireStatusShift:
      sportHint === "nba" && Boolean(nbaInvalidation?.requiresStatusAcknowledgement),
  });
  const propProjectionModeBlock = intent === "prop_projection" ? `\n\n${PROP_PROJECTION_MODE_BLOCK}` : "";
  const spreadAndGameSideBlock = isSpreadOrGameSideQuestion(question)
    ? `\n\n${SPREAD_AND_GAME_SIDE_BLOCK}`
    : "";
  let systemPromptForModel =
    outputJsonMode !== "plain" && jsonContract
      ? `${systemPrompt}

JSON RESPONSE MODE (overrides conflicting FORMATTING / DEFAULT RESPONSE FORMAT rules above for this turn only)
For matchup, player prop, and "who wins" style questions when this contract applies, return JSON with summary (Tier 2.5) and deep (Tier 3 full format).
For factual Tier-1 questions, return JSON with only summary as a short string.
For live in-game Tier-2 questions, return JSON with only summary in the compressed live format.
For all other questions where no contract is attached, use plain text as already specified.

${jsonContract}${propProjectionModeBlock}${spreadAndGameSideBlock}`
      : `${systemPrompt}${propProjectionModeBlock}${spreadAndGameSideBlock}`;
  if (!oddsAvailable) {
    systemPromptForModel = `${systemPromptForModel}

${NBA_ODDS_UNAVAILABLE_MODE_BLOCK}`;
  }
  const nbaLiveNoPropSystemPromptBlock =
    sportHint === "nba" ? buildNbaLiveNoPropSystemPromptBlock(nbaGameStateGate, nbaContext) : "";
  if (nbaLiveNoPropSystemPromptBlock) {
    systemPromptForModel = `${systemPromptForModel}

${nbaLiveNoPropSystemPromptBlock}`;
  }
  if (isConversationFollowUp) {
    systemPromptForModel = buildUrTakeFollowUpCoreSystemPrompt();
    if (!oddsAvailable) {
      systemPromptForModel = `${systemPromptForModel}\n\n${NBA_ODDS_UNAVAILABLE_MODE_BLOCK}`;
    }
  }

  const priorTakesSummary = summarizePriorTakes(incomingHistory);
  const nbaImpactSummary =
    sportHint === "nba" ? summarizeNbaNewsImpact(nbaNewsImpact) : "";
  const nbaStatusShiftLine =
    sportHint === "nba"
      ? buildNbaStatusShiftSection(nbaNewsImpact, nbaInvalidation)
      : "";
  const nbaConditionalPayload =
    sportHint === "nba" && nbaDecisionMode === "conditional_wait"
      ? buildNbaConditionalPayload({
          invalidation: nbaInvalidation,
          nbaContext,
          newsImpact: nbaNewsImpact,
        })
      : null;
  const nbaPlayerResolutionBlock =
    sportHint === "nba" ? buildNbaPlayerResolutionBlock(nbaInvalidation) : "";
  let nbaPostValidationChecked = false;
  let nbaPostValidationTriggered = false;
  let nbaFallbackOrRepairUsed = false;

  if (
    sportHint === "nba" &&
    (nbaDecisionMode === "status_only" || nbaDecisionMode === "status_plus_consequence")
  ) {
    const availabilityPayload = buildNbaAvailabilityResponse({
      question,
      nbaContext,
      nbaInvalidation,
      derivedConfidence,
      nbaConfidenceModifier,
      decisionMode: nbaDecisionMode,
    });
    let takeRecord = extractTakeFromResponse({
      responseText: availabilityPayload.response,
      sport: "nba",
      intent,
      question,
    });
    takeRecord = ensureNbaTakeConfidenceConsistency({
      takeRecord,
      decisionMode: nbaDecisionMode,
      derivedConfidence,
      confidenceModifier: nbaConfidenceModifier,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    const nbaMeta = buildNbaObservabilityMeta({
      decisionMode: nbaDecisionMode,
      sport: "nba",
      matchupGroundingApplied: nbaMatchupGroundingApplied,
      postValidationChecked: false,
      postValidationTriggered: false,
      fallbackOrRepairUsed: false,
    });
    logNbaObservability(nbaMeta);
    return res.status(200).json({
      response: availabilityPayload.response,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: availabilityPayload.statusShift,
      decisionMode: nbaDecisionMode,
      ...(nbaDebugEnabled ? { nbaDebug: nbaMeta } : {}),
      sport: "nba",
      intent,
      take: takeClientPayload(takeRecord),
    });
  }

  if (
    sportHint === "nba" &&
    nbaDecisionMode === "blocked_unavailable" &&
    nbaInvalidation.targetedPlayer
  ) {
    const affected = (nbaNewsImpact?.affectedTeams || []).find(
      (t) => String(t?.team || "").toUpperCase() === String(nbaInvalidation.team || "").toUpperCase(),
    );
    const outPlan = buildNbaOutStatusShiftPlan({
      targetedPlayer: nbaInvalidation.targetedPlayer,
      teamAbbr: nbaInvalidation.team,
      nbaContext,
      teamImpact: affected,
    });
    const blockedLead = `${nbaInvalidation.targetedPlayer} is ${nbaInvalidation.statusDisplay || "out"}. Direct prop projection is invalid.`;
    const blockedHeader = "STATUS SHIFT";
    const blockedResponse = `${blockedHeader}
${blockedLead}

REPLACEMENT WATCHLIST
${outPlan.replacementLines}

PROP SHIFT
${outPlan.shiftLine}

LIVE TRIGGER
${outPlan.liveTrigger}

CONFIDENCE
${derivedConfidence}${nbaConfidenceModifier.reason ? ` — ${nbaConfidenceModifier.reason}` : ""}`;
    const blockedStatusShift = nbaStatusShiftLine || null;

    let takeRecord = extractTakeFromResponse({
      responseText: blockedResponse,
      sport: "nba",
      intent,
      question,
    });
    takeRecord = ensureNbaTakeConfidenceConsistency({
      takeRecord,
      decisionMode: nbaDecisionMode,
      derivedConfidence,
      confidenceModifier: nbaConfidenceModifier,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    const nbaMeta = buildNbaObservabilityMeta({
      decisionMode: nbaDecisionMode,
      sport: "nba",
      matchupGroundingApplied: nbaMatchupGroundingApplied,
      postValidationChecked: false,
      postValidationTriggered: false,
      fallbackOrRepairUsed: false,
    });
    logNbaObservability(nbaMeta);
    return res.status(200).json({
      response: blockedResponse,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: blockedStatusShift,
      decisionMode: nbaDecisionMode,
      ...(nbaDebugEnabled ? { nbaDebug: nbaMeta } : {}),
      sport: "nba",
      intent,
      take: takeClientPayload(takeRecord),
    });
  }

  if (sportHint === "mlb" && mlbDecisionMode === "no_data") {
    const responseText = buildMlbNoDataTerminalResponse({ derivedConfidence });
    let takeRecord = extractTakeFromResponse({
      responseText,
      sport: "mlb",
      intent,
      question,
    });
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }
    return res.status(200).json({
      response: responseText,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: null,
      decisionMode: "no_data",
      sport: "mlb",
      intent,
      take: takeClientPayload(takeRecord),
    });
  }

  let userPrompt = question;
  /** Scoped for Anthropic token budget — NFL TYPE_A draft simulation uses a higher max_tokens ceiling. */
  let draftTeamSimulationInject = false;

  if (intent === "slip_review") {
    userPrompt = buildSlipReviewPrompt({
      question,
      sportHint,
      nbaContext: nbaContextForModel,
      nflContext,
      mlbContext,
      golfContext: golfContextEffective,
      f1Context,
      derivedConfidence,
      priorTakesSummary,
    });
  } else if (sportHint === "tennis_wta_profile") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const surfaceKey = pickSurfaceKey({
      currentTournament: { surface: context?.currentTournament?.surface },
    });

    const wtaSnapshot = buildTennisPlayerSnapshot(players?.wta, surfaceKey, 40);

    const wtaPlayerNames = Object.keys(players?.wta || {});
    const questionLower = normalizeText(question);

    const mentionedPlayers = wtaPlayerNames.filter((name) => {
      const lower = normalizeText(name);
      if (!lower) return false;
      if (questionLower.includes(lower)) return true;
      const parts = lower.split(/\s+/).filter(Boolean);
      const lastName = parts[parts.length - 1];
      return lastName.length > 3 && questionLower.includes(lastName);
    });

    let matchupDigest = "";
    if (mentionedPlayers.length >= 2) {
      matchupDigest = buildMatchupTennisDigest(
        mentionedPlayers[0],
        mentionedPlayers[1],
        players,
        surfaceKey,
      );
    }

    userPrompt = `You are answering a WTA tennis question as Under Review.

TODAY
${getTodayStr()}

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}QUESTION
${question}

MODE
This is a profile-based WTA analysis. There is NO live fixtures feed for WTA.
Answer using ONLY the player database below. Do not invent live odds, scheduled
matches, or current draws. The user knows there is no live board — they want a
sharp, data-driven take based on the players' rally profiles, serve/return splits,
surface records, and tiebreak rates.

${matchupDigest ? `MATCHUP DIGEST (use this for head-to-head questions)
${matchupDigest}

` : ""}WTA PLAYER DATABASE (cite only these stats — do not fabricate)
${wtaSnapshot || "Not loaded"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
WTA mode is profile-based — confidence should generally be Medium or Speculative
unless the surface/style mismatch is truly obvious from the data.
oddsAvailable: ${oddsAvailable}

EXECUTION RULES — READ CAREFULLY
1. Lead with the take. First sentence is a concrete claim about a specific player
   or matchup using actual data from above.

2. NEVER say "no live data" or "feed unavailable" or anything about data limitations.
   Just answer the question with the profiles you have.

3. Cite specific stats from the database when justifying a take — rally splits,
   tiebreak rate, surface record, serve/return numbers. If a player isn't in the
   database, say so directly and pivot to who IS analyzable.

4. For head-to-head questions, identify the surface/style edge:
   - Who has the better rally profile for this surface?
   - Who has the tiebreak edge if it goes to a deciding set?
   - Who has the serve dominance on this surface?
   - Cite the actual numbers, not generic "X is better on clay."

5. Use the standard format (THE PLAY, MARKET MISTAKE, WHY MISPRICED, etc.) but
   for pure analytical questions ("who wins?"), THE PLAY can be the player you'd
   back if a price were available.

6. Add this exact line at the end of CONFIDENCE:
   SCOPE — WTA profile-based read; confirm live odds before sizing any bet.`;
  } else if (sportHint === "tennis") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const leagueStr = normalizeText(matchupContext?.league || "");
    const isWtaLeague =
      leagueStr.includes("wta") ||
      (leagueStr.includes("women") && leagueStr.includes("tennis"));

    const rawMx = matchupContext?.raw || {};
    const mxHome = String(rawMx.home || "").trim();
    const mxAway = String(rawMx.away || "").trim();
    const boardSurfaceHint =
      String(rawMx.bdl_tournament_surface || "").trim() ||
      context?.currentTournament?.surface ||
      "";

    const surfaceKey = pickSurfaceKey({
      currentTournament: {
        surface: boardSurfaceHint || context?.currentTournament?.surface,
      },
    });

    const atpSnapshot = buildTennisPlayerSnapshot(players?.atp, surfaceKey, 30);
    const wtaSnapshot = buildTennisPlayerSnapshot(players?.wta, surfaceKey, 30);

    const matchupDigest =
      mxHome && mxAway
        ? buildMatchupTennisDigest(mxHome, mxAway, players, surfaceKey)
        : "";

    const liveBoard = (liveMatches || [])
      .slice(0, 15)
      .map((m) => {
        const score =
          m.raw?.score && m.raw.score !== "-" ? ` | Score: ${m.raw.score}` : "";
        const live = String(m.raw?.live || "0") === "1" ? " [LIVE]" : "";
        const surfRaw = String(m.raw?.bdl_tournament_surface || "").trim();
        const surf =
          surfRaw.length > 0 ? ` | Surface: ${surfRaw}` : "";
        const snap =
          m.raw?.ur_static_snapshot || String(m.raw?.source || "").includes("ur_static_wta")
            ? " [WTA profile snapshot — not a confirmed draw time]"
            : "";
        return `${m.title}${live}${snap} | ${m.network || ""}${surf}${m.raw?.round ? ` | ${m.raw.round}` : ""}${score}`;
      })
      .join("\n");

    const cardTournamentName = String(rawMx.tournament_name || "").trim();
    const globalTournamentName = String(context?.currentTournament?.name || "").trim();
    const tournamentMismatch =
      !!cardTournamentName &&
      !!globalTournamentName &&
      normalizeText(cardTournamentName) !== normalizeText(globalTournamentName);

    const tournamentName =
      cardTournamentName || context?.currentTournament?.name || "Current Tournament";
    const tournamentSurface =
      boardSurfaceHint || context?.currentTournament?.surface || "Unknown";
    let tournamentContext = context?.currentTournament?.context || "";
    if (tournamentMismatch) {
      tournamentContext =
        `App active tournament filter is "${globalTournamentName}" but this MATCHUP CARD fixture is "${cardTournamentName}" — use the CARD tournament for venue, surface, altitude, and conditions. ` +
        tournamentContext;
    }
    const tournamentSpeed = context?.currentTournament?.speed || "";
    const breakingNews = String(context?.breaking || "").trim();

    const hasLiveBoard = liveBoard.trim().length > 0;
    const tennisVerifiedBlock = buildTennisVerifiedPlayerListBlock(players, liveMatches);
    const fixtureHome = mxHome || "HOME_PLAYER";
    const fixtureAway = mxAway || "AWAY_PLAYER";
    const matchFocusBlock =
      mxHome && mxAway
        ? `MATCH FOCUS — THIS OVERRIDES EVERYTHING ELSE

A specific match is on the card: ${fixtureHome} vs ${fixtureAway}

YOUR ENTIRE RESPONSE IS ABOUT THIS MATCH ONLY.

Rules:
1. Every section (THE PLAY, MATCH READ, PROP PROJECTIONS, FADE) must
   reference ${fixtureHome} or ${fixtureAway} by name. No exceptions.

2. Do NOT give tournament-level takes in place of match-level takes.
   "Alcaraz benefits most at Madrid" is NOT an answer to a question
   about ${fixtureHome} vs ${fixtureAway}.

3. Tournament context (surface, altitude, speed) is background only.
   It informs HOW you analyze this match. It is not the answer itself.

4. If the user asks "Clay — who benefits more?", answer: which of
   ${fixtureHome} or ${fixtureAway} benefits more from this surface, and why,
   using their specific stats from the player database.

5. If the user asks "what are the best props?", deliver prop projections
   for ${fixtureHome} and ${fixtureAway} specifically — aces, double faults,
   games, break points, scoreline. Not tournament outright recommendations.

6. The only time you may mention a player not named ${fixtureHome} or
   ${fixtureAway} is in the FADE section to establish relative value context,
   and only briefly.

7. TENNIS RESPONSE WORDING RULES:
   - Never mention database/profile depth/Elo-ranking availability in the body.
     Banned body phrases: "no dedicated UR profile row", "limited in profile depth",
     "database does not rank", "limited in the database", "profile is limited".
     Thin data belongs in CONFIDENCE only, one phrase.
   - WHY MISPRICED = market error only (1–2 sentences). WHY IT FITS = player-matchup reason only (1–2 sentences). No repetition.
   - Age/injury context that materially affects matchup should lead WHY IT FITS (sentence 1 or 2), not be buried.
   - CONFIDENCE format: "[High/Medium/Speculative] — [one phrase basis]", max 15 words after dash.

VIOLATION: Responding about Alcaraz, Zverev, Swiatek, or any other
player when the question is about ${fixtureHome} vs ${fixtureAway} is a
critical failure. Do not do this under any circumstances.`
        : "";
    const tennisPropProjectionUserBlock =
      intent === "prop_projection" && mxHome && mxAway
        ? `DIRECT PROP REQUEST — MANDATORY OUTPUT FOR THIS MATCH

The user asked for props on ${fixtureHome} and ${fixtureAway}. Your summary must include:
- Match winner lean with threshold
- Total games projection (OVER/UNDER + number)
- Aces projection for ${fixtureHome} and ${fixtureAway} (per set and total)
- Double-fault projection for ${fixtureHome} and ${fixtureAway}
- Break points saved projection for each
- Scoreline projection

If data is thin, use tour/surface baselines, but still produce all projections.`
        : "";

    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    userPrompt = `You are answering a tennis betting question as Under Review.

TODAY
${getTodayStr()}

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}QUESTION
${question}

${matchFocusBlock ? `${matchFocusBlock}\n\n` : ""}${breakingNews ? `BREAKING NEWS — READ FIRST AND ADJUST ALL ANSWERS ACCORDINGLY
${breakingNews}

` : ""}TOURNAMENT CONTEXT
Name: ${tournamentName}
Surface: ${tournamentSurface}
Speed: ${tournamentSpeed}
Context: ${tournamentContext}

${tennisVerifiedBlock}

${tennisPropProjectionUserBlock ? `${tennisPropProjectionUserBlock}\n` : ""}

FIXTURE vs FILTER (mandatory)
TOURNAMENT CONTEXT applies to the CURRENT FIXTURE on the card, not the app's active tournament filter alone.
If the match card shows a different tournament than the global filter, use the MATCH tournament and its surface.
Example: Munich BMW Open (ATP 250) is medium clay at low altitude; Madrid Mutua Madrid Open (Masters 1000) is medium-slower clay at altitude — they play very differently. Never mix them.

${matchupDigest ? `MATCHUP CARD — PLAYER DIGEST (use in WHY MISPRICED / WHY IT FITS — cite only these signals; do not invent stats)
Official event surface on card (ATP feed): ${boardSurfaceHint || "not on card — use tournament context above"}
${matchupDigest}

` : ""}${hasLiveBoard ? `LIVE MATCH BOARD
${liveBoard}

` : ""}ATP PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${atpSnapshot || "Not loaded"}

WTA PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${wtaSnapshot || "Not loaded"}

PROP GUIDE DIGEST — ACE / SERVE VOLUME (canonical; must match app Prop Guide card text)
${buildAcePropsDigest(context?.ace_props, tournamentSurface)}

ACE_PROPS_JSON (verbatim — same source as digest; use for field-level checks only)
${context?.ace_props ? JSON.stringify(context.ace_props, null, 2) : "{}"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
Only go above that if the data strongly justifies it.
oddsAvailable: ${oddsAvailable}

EXECUTION RULES — READ CAREFULLY
1. Opener authority is Step 1 of THE UNDERREVIEW RESPONSE FRAMEWORK above. The first sentence states the trigger condition (line threshold, surface/lineup status, game script). Do not open with a limitation, disclaimer, or pipeline note.

2. Never say "in data-only mode", "live feed unavailable", "based on available data",
   or any variation. The user does not care about your data pipeline. They want a call.

3. If breaking news is present above, it overrides everything else. Adjust the entire
   response to account for it — withdrawals, injuries, scheduling changes. Do not
   recommend a player who has withdrawn. Do not ignore news that changes the board.

4. Name specific players. Use the player database above.
   Do not give generic archetype-only answers — "clay specialist" is not a play unless tied to a named player and threshold.

5. Use the stats in the database rows: cElo, serve/hold hints, DR, surface notes, form strings.
   Reference them in WHY MISPRICED. Do not invent statistics.

6. Price discipline is mandatory on every answer.
   Every play must include a price threshold: "only at +150 or better",
   "only if implied probability is under 40%", "value entry under -120".
   Never recommend a play without a price anchor (bands are OK — do not invent a precise book quote).

7. If the live board has matches, use them.
   Name the players, round context, and what the board implies.

8. If no live board is shown, execute from the player database snapshot.
   Surface + cElo + serve/hold + surface notes + form = a specific, justified play.

9. For match bets: name player, market, price threshold, and one key statistical reason from the snapshot.
   For futures: name player, market (outright / top-4 / top-8), price threshold,
   why the surface profile justifies it, and one player or price to fade with reasoning.

10. For withdrawal or injury questions: immediately redirect to who benefits most.
    Reprice the field. Name the new favorite and the value plays that opened up.

11. Confidence must cite what data it rests on in CONFIDENCE line.
    High = specific snapshot stats + surface match + price discipline.
    Medium = surface model without live board confirmation.
    Speculative = thin data.
    Never call something High without citing the specific signals that justify it.

NO-MARKET FALLBACK RULE (ATP — mandatory when live board is thin, ace_props is empty, or match pricing is missing but tournament/player context is loaded)

You are NOT allowed to respond with "wait for lines" or "come back when books post"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: match winner framing or side market
   (games/sets) using surface Elo bands from the player database snapshot rows
   (cElo / hElo / gElo as provided) — no fabricated odds; use price-threshold language.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each player (only when at least two verified names exist on the VERIFIED TENNIS PLAYERS list above), state:
   - Market shape to watch (match winner band, spread in games, over/under games, ace prop)
   - A threshold in words ("only playable if implied favorite is under 65%")
   - Reasoning from surface Elo, serve/hold hints, DR, form strings, or round context on the board

4. When PROP GUIDE DIGEST / ace_props is present, tie ace overs/unders to named players using
   ONLY the numbers printed in PROP GUIDE DIGEST (or verbatim in ACE_PROPS_JSON). When the
   tournament surface is clay, the digest foregrounds avg_aces_clay — cite that value with label
   "clay aces/gm" exactly as shown. Do not substitute a different per-game ace average from memory.
   When liveMatches lists rounds or live flags, reference them explicitly.

5. End with a live trigger: set, break, or stat pace that would confirm or break the lean.

Never open with "no board pricing." Give named players, surface-backed ranges,
and something to watch from liveMatches or the snapshot.

REQUIRED RESPONSE FORMAT
Plain text only. No markdown. No bold. No asterisks.

One sharp opening sentence that is the call itself.

Then:

THE PLAY
[specific player + market + price threshold — one line]

MARKET MISTAKE
[what the book is mispricing and why — one to two lines]

WHY MISPRICED
[cite specific stats from the snapshot rows — one to two lines]

TIMING EDGE
[when to bet and why — one line]

WHY IT FITS
[surface + tournament fit + player profile — one to two lines]

FADE
[one explicit player or market to avoid, with one-line reason]

CONFIDENCE
[High / Medium / Speculative — followed by one phrase citing what data this rests on]

TIMING
[one line: bet now / wait for price / live trigger]${
      isWtaLeague
        ? `

SCOPE (mandatory extra line — WTA matchup or card)
SCOPE — Under Review is deepest on ATP markets; this WTA read uses tour-level profiles and live card context — confirm prices before sizing.`
        : ""
    }`;
  } else if (sportHint === "golf") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const golfState = String(golfContextEffective?.currentEvent?.state || "").toLowerCase();
    const golfIsFinal = golfState === "post" || golfState === "final";
    const golfVerifiedBlock = buildGolfVerifiedPlayerListBlock(golfContextEffective);
    const golfHasVerifiedNames = collectGolfVerifiedNames(golfContextEffective).size > 0;

    if (golfIsFinal) {
      userPrompt = `You are answering a golf question after the tournament has FINISHED.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Golf context:
${JSON.stringify(golfContextEffective || {}, null, 2)}

${golfVerifiedBlock}

TOURNAMENT STATUS: FINAL (currentEvent.state is post/final)
- Do NOT frame this as live betting, pre-market, or "wait for lines / tee times."
- Do NOT tell the user the event has not started or is scheduled for a future date.
- Answer from currentEvent.leaderboard and recentResults (if present) only — cite winner, final scores, and narrative of how the event unfolded.
- If the user asked for a "live" or "best bet" angle, reframe: there is no live market edge after the final putt; give a concise results recap and what the board says about who won and why.
- Name specific golfers from the leaderboard rows. Never invent a golfer not on the board.

FINAL RECAP — BETTING INTELLIGENCE (mandatory; narrative alone is incomplete)
When the tournament status is Final, the recap MUST include all of the following that the JSON can support (skip a bullet only if that slice is truly absent):
1) Which pre-tournament outright prices in odds.outrights would have CASHED versus the final leaderboard (name golfer + printed price from context only).
2) Which top-5 / top-10 / top-20 style prices in odds.topFinish (or related slices) would have cashed — cite the structure present in JSON.
3) Which make-cut prices in odds.makeCut cashed or lost for named golfers — only if those rows exist.
4) One concrete lesson for handicapping a future event at this course (field / setup / volatility) tied to what the final board showed.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.

Use the standard Under Review sections (THE PLAY can be PASS or a retrospective note — not a new bet recommendation).`;
    } else {
      userPrompt = `You are answering a golf betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Golf context:
${JSON.stringify(golfContextEffective || {}, null, 2)}

${golfVerifiedBlock}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.
oddsAvailable: ${oddsAvailable}
${nbaConfidenceModifier.reason ? `- Confidence modifier: ${nbaConfidenceModifier.reason}` : ""}

Rules:
- Answer only as a golf analyst.
- Do not mention NBA, NFL, MLB, F1, or tennis.
- Use the tournament, odds, rankings, and player names in the provided golf context.
- currentEvent.leaderboard is the full tournament field when the data feed provides it — find any golfer's position and scores there before claiming they are missing from the board.
- Short follow-ups ("any sleepers?", "who else?", "best value longshot?") still apply to this same Golf context JSON — use the leaderboard and odds here; never tell the user to re-paste a screenshot or resend the board when this payload includes field data.
- If data is limited, still stay within golf and give the best golf lean from the available board.
${
  golfHasVerifiedNames
    ? `- Always name at least one specific golfer whose name appears in the VERIFIED GOLF PLAYERS list above.
- For outright questions, THE PLAY must begin with one specific golfer name and market (example: "Collin Morikawa outright +2200") — golfer must be on the verified list.`
    : `- There are no verified golfer names in this payload — do NOT invent golfers. Give course-, field-, or odds-structure analysis only.`
}
- Never return a generic team-level or archetype-only answer when the verified golfer list is non-empty without using a named golfer from that list.
- Do not invent unrelated teams, games, or props.

NO-MARKET FALLBACK RULE (mandatory when odds.outrights is empty or thin but leaderboard or event context exists)

You are NOT allowed to respond with "wait for book prices" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market angle: top-10, top-20, make-cut, or
   matchup H2H — using leaderboard position, strokes-gained narrative from
   context, and course fit.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each golfer (only when at least two verified names exist on the VERIFIED GOLF PLAYERS list above), state:
   - The market shape to watch (top-10 / top-20 / make cut / first-round leader)
   - A verbal price band or "only if outright is +X or longer" when odds rows exist;
     if no numbers, give a range in words tied to world ranking and form
   - Reasoning from courseStats, recent rounds, or fit notes in context

4. Tie reads to leaderboard position and volatility: chasing vs protecting a lead.

5. End with a live trigger: what hole range or round split would flip the lean.

Never open with market-availability throat-clearing. Give monitoring hooks; name only verified golfers when the VERIFIED GOLF PLAYERS list above is non-empty.`;
    }
  } else if (sportHint === "nba") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const nbaQuestionForModel = sanitizeNbaQuestionForGeneration(question, nbaContext);

    if (isConversationFollowUp) {
      const compactNbaFollowUpContext = buildNbaFollowUpCompactContextLines({
        nbaMatchup,
        nbaContextForModel,
        incomingHistory,
        question,
      });
      userPrompt = `You are answering a short NBA betting follow-up.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${nbaQuestionForModel}

COMPACT NBA CONTEXT (follow-up turn — full nbaContext JSON intentionally omitted server-side)
${compactNbaFollowUpContext}

oddsAvailable: ${oddsAvailable}
Default confidence should be ${derivedConfidence}.`;
    } else {
    const nbaRosterListBlock = buildNbaRosterProminentInjection(nbaContextForModel, {
      hasImage,
      question,
      matchup: nbaMatchup,
    });
    const firstSessionGuaranteeBlock = buildFirstSessionGuaranteeInjection(firstSessionGuaranteeFeature);

    userPrompt = `You are answering an NBA betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${nbaQuestionForModel}

${sportHint === "nba" ? `INTERNAL NBA CONTROL (DO NOT QUOTE OR REPEAT VERBATIM)
- decisionMode: ${nbaDecisionMode}
- Obey the NBA DECISION MODE SPINE appended to the system prompt for this mode (substance + avoidance). User prompt rules below still apply where they do not conflict.
- Never print internal labels, control headers, or mode names to the user.

` : ""}${firstSessionGuaranteeBlock ? `${firstSessionGuaranteeBlock}

` : ""}${sportHint === "nba" && nbaGameStateGate ? `${buildNbaGameStateAuthorityBlock(nbaGameStateGate)}

` : ""}${sportHint === "nba" && nbaPlayerResolutionBlock ? `${nbaPlayerResolutionBlock}

` : ""}${nbaConditionalPayload ? `INTERNAL CONDITIONAL PAYLOAD (DO NOT QUOTE OR REPEAT VERBATIM)
- targetPlayer: ${nbaConditionalPayload.player}
- currentStatus: ${nbaConditionalPayload.status}
- listedMarket: ${nbaConditionalPayload.listedMarkets}
- IF ACTIVE: ${nbaConditionalPayload.ifActive}
- IF OUT: ${nbaConditionalPayload.ifOut}
- IF UNRESOLVED: ${nbaConditionalPayload.ifUnresolved}

` : ""}${nbaImpactSummary ? `HIGH-PRIORITY NBA NEWS IMPACT (SERVER-COMPUTED — READ FIRST)
${nbaImpactSummary}

` : ""}${nbaInvalidation.unresolved && nbaInvalidation.targetedPlayer ? `UNRESOLVED AVAILABILITY FLAG
Target player: ${nbaInvalidation.targetedPlayer}
Status: ${nbaInvalidation.statusDisplay || nbaInvalidation.statusClass}
Rule: Do not give false certainty. Keep any take contingent on confirmed status.

` : ""}${nbaMatchupGroundingBlock ? `${nbaMatchupGroundingBlock}\n\n` : ""}${
      nbaContextForModel?.focusedSeriesSnapshot?.serverSummaryOneLiner
        ? `FOCUSED PLAYOFF SERIES (board-verified — mirror this in series framing; do not invent wins/game number)\n${nbaContextForModel.focusedSeriesSnapshot.serverSummaryOneLiner}\n\n`
        : ""
    }NBA context:
${JSON.stringify(nbaContextForModel || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.
oddsAvailable: ${oddsAvailable}

${nbaRosterListBlock}

IMPORTANT: playerStatsText may contain season-average rows with stale team
assignments. A player listed as ATL in playerStatsText may have been traded.
The INTERNAL authorized-name roster block above overrides playerStatsText for team assignments.
If a name appears in playerStatsText but not under that team in playersByTeamAbbrev / the authorized list,
do not cite them as being on that team tonight.

When using the Tier-3 format (opener prefixed with ">> ", then THE PLAY and following sections),
no preamble, no roster disclaimer, no source caveat — nothing before the opener sentence.
The opener content is governed by Step 1 of the framework; the ">> " prefix is formatting only.

TEAM-LEVEL READ REQUIREMENTS (mandatory when named players are unavailable)

When you cannot name specific players, you MUST anchor the response to
verifiable team-level data from the provided nbaContext. Specifically:

1. Series context from playoffSeries — what is the current series record?
   Who has home court? What were the scores of prior games in this series?
   This is MORE useful than player names for series betting.

2. Pace and scoring from gameTotals — what is the total line for this game?
   Is this a high-pace or low-pace matchup based on available data?

3. Injury context from injuries array — are any key players listed as out
   or doubtful? This directly affects every prop on the slate.

4. Season context from seasonContext — are we in playoffs? What phase?
   Playoff basketball has specific patterns that change prop values.

Generic statements like "bench guys either explode or vanish" or "home
court helps the home team" are FORBIDDEN when specific series data,
injury reports, or game totals are available in the context.

If the injuries array shows a star player is out, LEAD WITH THAT.
If the series is 3-0, LEAD WITH THAT — series pressure changes everything.
If the game total is 215.5, that tells you something specific about pace
expectations. USE IT.

${nbaInvalidation.requiresStatusAcknowledgement && nbaStatusShiftLine ? `STATUS SHIFT ACKNOWLEDGMENT — MANDATORY
You must explicitly acknowledge this status shift in the response:
${nbaStatusShiftLine}
If output is JSON Tier 2.5, include this in "statusShift" and keep it decisive.

` : ""}

The goal: a user reading this response should learn something specific
about ATL vs NYK tonight that they couldn't get from a generic sports
column. If the response could apply to any two playoff teams, rewrite it.

${ROSTER_ENFORCEMENT_NBA}

Rules:
- Answer only as an NBA analyst.
- Do not mention golf, NFL, MLB, F1, or tennis.
- Do not invent unrelated games or props.
- Stats in the nbaContext are the ONLY stats you may cite with confidence.
  Never cite a specific percentage or compression rate unless it appears in the provided context payload. If grounded data does not contain a percentage, describe the pattern qualitatively instead. Do not apply estimated compression rates to multiple players in the same response — that is a fabrication pattern regardless of whether the percentages differ.
- If the question references a live game (contains score, time remaining, or
  an attached screenshot), ALWAYS acknowledge the current game state first.
  Never declare a prop a winner while the game is still in progress.
- If a player mentioned in the question is not in today's injury report or
  game list, reflect uncertainty only in CONFIDENCE — never lead the answer with data-availability throat-clearing.
- When a player row includes "tonightGame", that matchup string comes from today's prop board (Odds API) and is more current than the "team" field from BallDontLie after trades — use it for who plays in which game tonight.
- When "playerStatsText" is present and statsSource is "game_box", treat it as the primary roster truth for who played for which team today (from game box scores). When statsSource is "season_average", do not treat team abbreviations as tonight's lineup — they may lag trades.
- If todaysGamesSlateNote is set, todaysGames is empty for the reason given (e.g. BallDontLie returned no games for that ET date). Trust that note instead of guessing a pipeline failure.
- PROP BOARD HYGIENE: propLines are filtered server-side to drop games that are
  already final (Odds event.completed and/or todaysGames.state === "post").
  Never use a prop row for a matchup that is Final in todaysGames as a "tonight"
  lean — treat those as stale. If the market snapshot still includes completed
  games, ignore those rows and apply the fallback below.

FALLBACK RULE (mandatory when active player prop markets are unavailable for an upcoming/live game the user cares about)

Do not treat unavailable markets as an excuse for thin analysis. The user is here because tip is close.

FALLBACK FORMAT (mandatory when markets are unavailable for a matchup you can see in context):

Same ROSTER DISCLOSURE RULE as above — never mention partial rosters, loading, or which names are "verified."

Open with the sharpest matchup observation you can ground in playerStats, rosterGrounding,
injuries, playoffSeries, or gameTotals — not a dismissal.

Then deliver, in prose (no bullets): (1) primary player-prop angle from season averages
plus matchup; (2) game-total framework with explicit numeric thresholds when gameTotals or
season pace context supports it; (3) one live trigger tied to pace, foul trouble, rotation,
or a stat clip — this IS the edge; deliver it now, not as homework for later.

Do NOT use "Watch for:" as a section header.
Do NOT use player names as headers (no "JALEN BRUNSON —").
Do NOT open with empty-slate throat-clearing about data availability.
${NBA_UNIFIED_MARKET_CLOSING_RULE}

LIVE NBA OVERRIDE: Never surface technical errors, variable names, array names, HTTP status codes, or API details to users. Ever. No exceptions.
When prop lines are unavailable, do not mention it. Do not apologize. Do not explain. Pivot to the strongest angle from live game state: minutes played, pace, foul trouble, rotation patterns, early stat lines, and matchup dynamics.
Lead with the angle, not the caveat. Never open with what you don't have.
When analyzing a live game, close the response with a one-line signature in this format: TEAM1 SCORE, TEAM2 SCORE · Q? TIME · Live. This replaces the need to announce "the game is live" in the opening.

Ignore unrelated injury callouts from the raw user text when they do not match the targeted player/team in this take.

Hard cap: keep the entire answer under 200 words.

Internal structure (do not print these labels):

[Opening line — one sentence, sharpest matchup observation you can defend from context]

[Paragraph 1 — primary player prop angle from averages vs this matchup. LEAD WITH THE EDGE,
then reasoning. Put numeric threshold bands in this paragraph. Max 3 sentences.]

[Paragraph 2 — game total / pace framework with specific thresholds from context when available.
Max 2 sentences. Tie opinions to scheme, pace data, injuries, or series facts from context when you explain why.]

[Paragraph 3 — live trigger: one concrete thing that changes the lean during the game or at
posting — name a player, a number, or an event. Max 2 sentences. Cut filler like "rosters shift fast."]

When the INTERNAL authorized-name block lists names for both sides of the matchup, prefer weaving in one player per team across the answer when it fits naturally — not a hard rule. Never invent a player name.
Use only players who appear in that authorized-name block above (unless Question/image authorizes otherwise).

LEAD WITH THE EDGE, NOT THE SETUP.

Every paragraph must start with the conclusion, not the context.

Wrong: "Brunson in playoff home games typically runs high usage. Look for his line in the 24–28 range and lean under if it opens at 27.5."

Right: "Brunson under is the lean if his line opens 27.5 or higher — Knicks depth means he doesn't need to carry at home."

The edge comes first. The reason comes second. Always.

Example shape (ATL vs NYK — adapt names and numbers to verified context only):

Brunson under is the lean if his line opens 27.5 or higher — Knicks depth means he doesn't need to carry at home in the playoffs.

KAT's 3PM line is the other read. Atlanta's perimeter scheme runs him off the arc in high-leverage possessions — under 3.5 is the play if it posts at even money or better.

If gameTotals in context shows 214.5, that band is the pace read: a line that low usually means both sides expect a grind — lean under on big player overs. If the same block shows 222+, plan for a track meet and nudge player overs. Use the number in the JSON, not a wait for the book.`;
    }
  } else if (sportHint === "mlb") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const mlbVerifiedBlock = buildMlbVerifiedPlayerListBlock(mlbContext);

    userPrompt =
      mlbDecisionMode === "pre_market_framework"
        ? buildMlbPreMarketUserPrompt({
            question,
            mlbContext,
            derivedConfidence,
            priorTakesSummary,
            mlbVerifiedBlock,
          })
        : buildMlbActionableUserPrompt({
            question,
            mlbContext,
            derivedConfidence,
            priorTakesSummary,
            mlbVerifiedBlock,
          });
  } else if (sportHint === "f1") {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const f1VerifiedBlock = buildF1VerifiedDriverListBlock(f1Context);

    userPrompt = `You are answering a Formula 1 betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

F1 context:
${JSON.stringify(f1Context || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.
oddsAvailable: ${oddsAvailable}

${f1VerifiedBlock}

Rules:
- Answer only as an F1 analyst.
- Do not mention golf, NBA, NFL, MLB, or tennis.
- Do not invent unrelated drivers, races, or props.

NO-MARKET FALLBACK RULE (mandatory when betting markets in context are thin or odds blocks are empty but the next race or weekend is upcoming)

You are NOT allowed to respond with "wait for prices" or "check back when
markets post" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-race angle: podium finish lean, top-6, or
   head-to-head constructor pairing — grounded in driver standings and session
   data you actually have.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each driver (only when at least two verified names exist on the VERIFIED F1 DRIVERS list above), tie to:
   - Podium or top-N finish framing from current points / form
   - Qualifying-to-race correlation when session data lists practice or qual gaps
   - Constructor teammate dynamic when both appear in context

4. Use schedule.races and sessions: reference next race name, track type, and
   weather or format notes only if present in context — never invent session times.

5. End with a live trigger: what to watch in FP3/qualifying or lap 1 that would
   confirm or break the lean.

Never open with "no odds yet." Give them a monitoring plan and a priced band
in words (e.g. "podium only makes sense at +400 or better — watch qual gap").`;
  } else if (sportHint === "nfl") {
    const canonicalNfl = await buildCanonicalNflContext({ question, matchupContext });
    const nflContextEffective =
      nflContext && String(nflContext).trim()
        ? nflContext
        : canonicalNfl.promptContext;

    const nflDataFreshness =
      typeof nflContext === "object" &&
      nflContext !== null &&
      !Array.isArray(nflContext) &&
      nflContext.dataFreshness
        ? nflContext.dataFreshness
        : canonicalNfl.dataFreshness;

    const availableNflPlayers = extractNflPlayersFromContext(nflContextEffective);
    const subject = extractNflQuestionSubject(question);
    const matchedPlayer = findNflPlayerMatch(subject, availableNflPlayers);

    // Audit note: tennis previously had a static "data-only" shortcut (removed). NFL is the only
    // intentional non-Anthropic short-circuit here — guardrail when the question names a player
    // absent from verified context. Golf / NBA / MLB / F1 always reach callAnthropic.
    if (
      shouldApplyNflUnsupportedGuard(question) &&
      !isNflDraftAngleQuestion(question) &&
      subject &&
      availableNflPlayers.length > 0 &&
      !matchedPlayer
    ) {
      const unsupportedResponse = `THE PLAY
PASS — no verified edge on ${subject}

MARKET MISTAKE
The question targets a player not present in the current verified NFL board context.

WHY MISPRICED
I cannot validate this line with the provided player usage dataset, so forcing a side would be speculation.

TIMING EDGE
Wait until this player is in the board context or share a trusted line source.

WHY IT FITS
This protects bankroll quality by avoiding unsupported assumptions.

FADE
Fade any confident over/under call here until verified context is available.

CONFIDENCE
Speculative

TIMING
No bet now; re-run once verified player context is loaded.`;

      const takeRecord = extractTakeFromResponse({
        responseText: unsupportedResponse,
        sport: sportHint || "generic",
        intent,
        question,
      });

      if (userEmail) {
        appendTakeForUser(userEmail, takeRecord).catch((e) => {
          console.warn("take logging failed:", e?.message || e);
        });
      }

      return res.status(200).json({
        response: unsupportedResponse,
        sport: sportHint || "generic",
        intent,
        take: takeClientPayload(takeRecord),
      });
    }

    const nflDraftAngle = isNflDraftAngleQuestion(question);
    const draftBundleForPrompt = getActiveDraftBundle();
    const draftPhase = getNflDraftPhase(new Date(), draftBundleForPrompt);
    const nflDraftWindowActive =
      nflDraftAngle && (draftPhase === "pre_draft" || draftPhase === "during_draft");
    const draftProspectBlock = buildNflDraftProspectBlock(draftBundleForPrompt);
    const focusTeamFromQuestion = resolveNflTeamFromQuestion(question);
    const nflTeamAbbrFromQuestionMap = detectNflTeamHint(question);
    const focusTeam =
      focusTeamFromQuestion ||
      (nflTeamAbbrFromQuestionMap
        ? getNflTeamNameFromAbbr(nflTeamAbbrFromQuestionMap)
        : null) ||
      getNflTeamNameFromAbbr(teamHint);
    const focusTeamAbbr = focusTeam
      ? getNflTeamAbbrFromName(focusTeam)
      : String(teamHint || "").toUpperCase() || null;
    const focusTeamAbbrFromResolvedName = focusTeamFromQuestion
      ? getNflTeamAbbrFromName(focusTeamFromQuestion)
      : null;
    const teamHintAbbrRaw = String(teamHint || "").trim().toUpperCase();
    const focusTeamAbbrFromClient =
      teamHintAbbrRaw && getNflTeamNameFromAbbr(teamHintAbbrRaw)
        ? teamHintAbbrRaw
        : null;
    /** Regex-extracted franchise name → abbr; else nickname/city map on question text; else validated client tab hint. TYPE_B league-wide wins inside route() before TYPE_A. */
    const focusTeamAbbrForRoute =
      focusTeamAbbrFromResolvedName ||
      nflTeamAbbrFromQuestionMap ||
      focusTeamAbbrFromClient ||
      null;
    const nflDraftRoute = nflDraftWindowActive
      ? getNflDraftQuestionRoute(question, focusTeamAbbrForRoute)
      : null;
    draftTeamSimulationInject =
      nflDraftWindowActive && nflDraftRoute === "TYPE_A";
    const teamState = focusTeamAbbr ? draftBundleForPrompt?.teams?.[focusTeamAbbr] : null;
    const teamPickList = (teamState?.picks || [])
      .filter((p) => Number(p?.round || 9) <= 3)
      .sort((a, b) => Number(a.overall || 0) - Number(b.overall || 0))
      .map((p) => `R${p.round} #${p.overall}`)
      .join(", ");
    const teamNeedPriority = (teamState?.needPriority || teamState?.needs || []).join(", ") || "best-player-available";
    const sensibleSimulation =
      draftTeamSimulationInject && focusTeamAbbr
        ? simulateDraftRounds({ teamAbbr: focusTeamAbbr, rounds: 3, chaosMode: false })
        : null;
    const chaosSimulation =
      draftTeamSimulationInject && focusTeamAbbr
        ? simulateDraftRounds({ teamAbbr: focusTeamAbbr, rounds: 3, chaosMode: true })
        : null;
    const prospectsFormattedByPosition = buildDraftProspectsByPositionBlock(draftBundleForPrompt);
    const teamCapitalBlock =
      nflDraftAngle && focusTeam
        ? buildTeamDraftFocusBlock(focusTeam, draftBundleForPrompt)
        : "";
    const nflContextForPrompt =
      (typeof nflContextEffective === "string"
        ? nflContextEffective
        : JSON.stringify(nflContextEffective || {}, null, 2)) +
      (teamCapitalBlock ? `\n\n---\n\n${teamCapitalBlock}` : "");
    const nflVerifiedBlock = buildNflVerifiedPlayerListBlock(nflContextEffective);

    userPrompt = `You are answering an NFL betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

DATA FRESHNESS — READ FIRST
${nflDataFreshness != null ? JSON.stringify(nflDataFreshness, null, 2) : "Staleness metadata not available"}

NFL context:
${nflContextForPrompt}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.
oddsAvailable: ${oddsAvailable}

${nflVerifiedBlock}

${draftProspectBlock}

${
  nflDraftWindowActive
    ? `DRAFT QUESTION CLASSIFICATION — read the question and pick exactly one route (THIS REQUEST: ${nflDraftRoute}):

TEAM NAME EXTRACTION (mandatory before asking for clarification):

Before responding "Which team?", scan the user's question for NFL team nicknames and cities (cowboys, eagles, chiefs, patriots, ravens, kansas city, green bay, etc.).

Server-resolved team abbreviation for this request: ${focusTeamAbbrForRoute || "NONE"}.

Examples: "simulate the cowboys draft" → teamHint DAL → Dallas simulation; "what should the chiefs do?" → KC; "jets mock draft" → NYJ.

Only ask "Which team?" if NO team name or city appears anywhere in the question AND the resolved abbreviation above is NONE. If ANY team reference exists in the question OR the server resolved an abbreviation, run the simulation immediately — no clarification interrogatives.

TYPE A — TEAM SIMULATION
Signals: "simulate [team]", "Cowboys draft", "what will [team] do", "[team] mock",
"[team] rounds 1-3", "my team's picks", "pick by pick", "mock draft"
Response: Run sensible board + chaos branch only when a franchise is resolved below.
Never ask for a team when the question is Type B or Type C.

TYPE B — LEAGUE-WIDE DRAFT ANALYSIS
Signals: "biggest sleepers", "best value picks", "who falls", "who rises",
"best prospect at [position]", "most interesting situation", "who goes top 5",
"best players available", "which team wins the draft"
Response: Answer directly from the VERIFIED prospect pool above. No team required.
Never ask which team the user means. Never route this to simulation.

TYPE C — PROSPECT PROFILE
Signals: player + "draft", "where does [player] go", "grade on [player]",
"[player] fit", draft stock/range/projection questions
Response: projectedRange, positionalRank/EDGE (or position rank), strengths/concerns if in pool, and 2–3 best-fit teams grounded in TEAM DRAFT CAPITAL needs when context exists.

RULE: Never ask for a franchise when the route is TYPE B or TYPE_C.
RULE: Never use numbered clarification lists ("1. Give me...", "2. Tell me...").
RULE — DRAFT TONE (Types A/B/C): Never open with what you need ("I need...", "Give me:",
"Once you X I'll Y"). Lead with insight; if you genuinely lack one fact, ask in one neutral sentence — never transactional or bossy.

`
    : ""
}${
  nflDraftWindowActive && !draftTeamSimulationInject
    ? `NFL DRAFT — ANALYSIS MODE (${nflDraftRoute}, not team simulation):
Answer the user's question outright. Pull every prospect name from VERIFIED anchors / pool rows only — cite projectedRange, consensusRank, nflGrade there and compare to positional value tiers.
Do NOT append team-mock simulations unless they asked for a team's picks.

TYPE B — OPEN / LEAGUE QUESTIONS:
If which team wins the draft / most interesting capital / league-wide sleeper questions: answer with concrete teams or prospects plus reasoning — zero clarification interrogatives.

TYPE B — SLEEPERS ("sleepers", "best value vs ADP/board", falls):
Use this layout (titles optional; keep tight):

DRAFT SLEEPERS — 2026

[Player], [Position], [School] — one line tying undervaluation to likely draft slot vs where their traits say they belong (use pool ranges).
[repeat for 5–7 names drawn from verified pool rows — not memorized scouting]

ROUND VALUE NOTE
One sentence naming which round clusters have the richest mispriced traits this year based on POOL tiers (example pattern only: Round 3 interior depth depressing Day 2 IOL valuations).

Define sleeper using POOL cues: consensus/projected band clearly later than traits suggest, multi-team fits underpriced versus consensus landing spot, medical/character noise — always cite pool fields instead of invented hype.

TYPE C — PROSPECT PROFILE:
Structured answer: positional rank vs class, projectedRange + source bands in pool, strengths/concerns arrays when present, then 2–3 teams whose TEAMS needs + picks map cleanly.

`
    : ""
}${
  draftTeamSimulationInject
    ? `NFL DRAFT 2026 — TEAM SIMULATION MODE ONLY (TYPE_A)

Team: ${focusTeamAbbr || "UNKNOWN"}
Picks: ${teamPickList || "No rounds 1-3 picks found in active state"}
Priority needs: ${teamNeedPriority}
Draft location: ${draftBundleForPrompt?.event?.location || "Pittsburgh, PA"}

VERIFIED PROSPECT POOL (rounds 1-4 only — do not name prospects outside this list):
${prospectsFormattedByPosition}

SIMULATION BASELINE (engine output — align narrative; validate slot realism — only when Team is NOT UNKNOWN below)
SENSIBLE: ${sensibleSimulation ? JSON.stringify(sensibleSimulation) : "(no franchise resolved — skip baseline)"}
CHAOS: ${chaosSimulation ? JSON.stringify(chaosSimulation) : "(no franchise resolved — skip baseline)"}

SIMULATION RULES (mandatory — TYPE A team resolved only):
1. Target under 400 words total.
2. Never open with inability hedges — open directly with the simulation header.
3. Only detail picks for the anchored team — use slot numbers under Picks.
4. No league-wide mock of picks 1–11 unless one short clause ties to YOUR pick.
5. Labels for missing pool names: "Day 3 / UDFA range" — never invent prospects.

TYPE A — TEAM UNKNOWN (mandatory stop):
If Team shows UNKNOWN OR no NFL franchise was resolved AND the route is TYPE_A, respond with ONLY this exact sentence — nothing before or after, no apologies, no lists:

Which team? Drop the franchise and I'll run the board — sensible scenario plus a chaos branch.

MY TEAM wording with no franchise also maps here — identical single-line reply.

TYPE A — TEAM RESOLVED:
Use baseline JSON only if SENSIBLE/CHAOS rows exist above; otherwise synthesize obeying slot validation.

PROSPECT SLOT VALIDATION (mandatory before finalizing any simulation):
- Each prospect must appear in VERIFIED anchors / pool.
- Respect projectedRange + consensusRank + projectedRound — no absurd reaches vs bands (David Bailey ≠ top 12 profile on this board).
- POSITION_VALUE_MAP & economics still apply.

FOCUS TEAM: Only ${focusTeam || focusTeamAbbr || "[named team]"} slots/needs unless question names another trade partner.`
    : ""
}

Rules:
- Answer only as an NFL analyst.
- Do not mention golf, NBA, MLB, F1, or tennis.
- Use only players/teams/roles that exist in the provided NFL context — **except** the "NFL DRAFT BOARD" section: Round 1 pick numbers, team slot holders, trade notes on those slots, and OFFICIAL ROUND 1 PICKS (when populated) are authoritative for draft questions.
- If the asked player is not in provided context, return PASS and explain missing context in one line — **unless** the question is draft-centric (see DRAFT / GM MODE below); then you may discuss well-known prospects qualitatively but must not fabricate who was selected at which slot.
- Draft identity enforcement: for draft-centric questions, any prospect name outside VERIFIED 2026 DRAFT PROSPECT ANCHORS must be labeled "simulation-only (UDFA-range)" before analysis.
- Do not invent unrelated games, props, role changes, or target-share claims.

- Data staleness: If DATA FRESHNESS above shows isCurrentSeason: false, you MUST include exactly one short line acknowledging the limitation — **except in NFL DRAFT TEAM SIMULATION (see below)**, where staleness belongs only in the single CONFIDENCE block at the end. Example phrasings: "Working off 2024 QB stats and offseason tier data — this gets sharper once Week 1 posts." / "Offseason snapshot, not live 2026 — flagging uncertainty accordingly." Do not let this line dominate the answer, but do not omit it when the snapshot is not current-season.

${
  draftTeamSimulationInject
    ? `NFL DRAFT SIMULATION — RESPONSE FORMAT (mandatory; omit fully if you already returned the single-line franchise prompt for UNKNOWN team)

CRITICAL RULES BEFORE WRITING ANYTHING:

1. Do not open with "I can't" or "without live war-room intel" or any hedge. Everyone knows mocks are speculation. Skip that entirely. Open directly with the simulation.

2. No board-flow paragraphs. Do not list who goes at picks 1–11 in a wall of text. The user asked about their team, not the entire draft. The only prospect names you list in depth are the picks for the team being simulated.

3. Board context belongs in ONE line per pick maximum (under the pick line). Not a separate "BOARD FLOW" section.

4. The CHAOS BRANCH must be:
   - ONE sentence describing the disruptive event (specific, plausible — trade-up, medical flag, run at a position, rival reach).
   - Then 2–3 lines showing how the team adapts and why it still works.
   - Chaos means the board shifts — not absurd reaches or profiles that violate PROSPECT SLOT VALIDATION.

5. BOARD WATCH BEFORE THURSDAY is 2–3 specific pre-draft storylines that directly affect THIS team's picks — not generic draft advice.

6. CONFIDENCE: ONE appearance only, at the end. Do not repeat simulation disclaimers elsewhere. No duplicate "offseason snapshot" lines outside CONFIDENCE.

7. Only name prospects from the verified 2026 draft pool. Honor PROSPECT SLOT VALIDATION above.

REQUIRED FORMAT — use this structure (replace brackets with real picks/slots for the requested rounds):

[TEAM] DRAFT SIMULATION — 2026

SENSIBLE BOARD

Pick [overall #]: [Player], [Position], [School]
[One line — why this pick at this slot]

Pick [overall #]: [Player], [Position], [School]
[One line — why]

(add lines for each pick the user asked for — must match this team's actual slots from Picks above)

---

CHAOS BRANCH

[One sentence: the disruptive event]
[2–3 lines: how the team adapts and why it still works — may reference different prospect names if slots change, still validated]

---

BOARD WATCH BEFORE THURSDAY
• [Specific storyline — direct impact on this team's board]
• [Another specific storyline]
• [Optional third]

CONFIDENCE
Simulation. Pre-draft consensus board + verified prospect pool. Accuracy sharpens once live trades and day-of decisions are known.[If DATA FRESHNESS requires it, append one short staleness clause here only — nowhere else.]`
    : teamCapitalBlock
      ? `TEAM PICK-BY-PICK SIMULATION:
- Anchored team: ${focusTeam}. Use TEAM DRAFT CAPITAL rows in order when user asks for pick-by-pick outcomes.
- Never present a name as a locked-in league selection pre-draft; frame as likely paths.`
      : ""
}

${
  draftTeamSimulationInject
    ? ""
    : nflDraftAngle && nflDraftWindowActive
    ? ""
    : nflDraftAngle
    ? `NO-MARKET / DRAFT ANGLE (when the question is draft-centric, not a priced prop, and you are outside the pre/during-draft windowed analysis above):
You are NOT allowed to stall with "wait until the draft" as the whole answer.

Instead:
1. Open with board truth: their Round 1 slot(s) from NFL DRAFT BOARD and any trade-note capital.
2. Map roster need → 2–3 realistic target buckets (position/archetype), without claiming a player "will" go at a specific pick unless clearly hypothetical.
3. Name one trade-up or trade-back lever that fits their slot + needs.
4. End with a live trigger: what combine / medical / pro-day / smoke-screen signal would flip the lean.

Skip the generic "two active NFL players from the prop board" requirement when this block applies.`
    : `NO-MARKET FALLBACK RULE (mandatory when prop boards or weekly lines are empty in context but games or usage data imply an upcoming slate)

You are NOT allowed to respond with "wait for lines" or "come back when props drop"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: anytime TD, passing yards, rushing
   yards, or receptions — anchored to defense tier data and player role from
   nflContext.

${NO_MARKET_VERIFIED_PLAYER_STEP_2}

3. For each player (only when at least two verified names exist on the VERIFIED NFL PLAYERS list above), state:
   - The prop type to watch
   - A pre-market band in words ("fade yards if the line opens above 275")
   - Reasoning from matchup defense tiers, red-zone role, or snap context in the payload

4. Tie offense to opposing defense tiers and game environment when those fields exist.

5. End with a live trigger: quarter or script cue that would confirm the lean
   (e.g. "If they're trailing early, check live pass attempts over").

Never open with "props aren't out." Give named players and monitoring hooks.`
}`;
  } else if (matchupContext) {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    userPrompt = `You are answering a betting question about this matchup.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Matchup context:
${JSON.stringify(matchupContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Stay within the matchup and its sport.
- Do not drift into unrelated sports.
- Do not invent unrelated teams, players, or props.`;
  } else {
    // DATA FRESHNESS: this sport reads from live APIs — no staleness injection needed.
    // If you ever add hardcoded fallbacks, add dataFreshness to the payload.
    const continuationRule =
      shortMarketFollowUp && hasLiveTranscriptContext
        ? `
CONTINUATION RULE — SHORT LIVE FOLLOW-UP
- Recent transcript includes live/screenshot game context. Reuse that game context instead of cold-starting.
- Give a provisional conditional lean now (not a locked bet): "Lean X if number/scope condition holds."
- Ask exactly ONE compact clarifier for the decision-critical missing input (usually exact live number + full game vs 1H).
- Acknowledge uncertainty once, then move to analysis. Do not repeat cannot-assess phrasing and do not output long missing-input checklists.
- Do not fabricate an exact live total/line and do not imply certainty when price/scope is missing.
- If you reference arithmetic (pace math, current score totals, points needed, possession projections), show the exact calculation inline so users can verify it instantly. Format example: "Score: 78 + 72 = 150. Points needed: 219.5 - 150 = 69.5."
`
        : "";

    userPrompt = `You are answering a sports betting question.

${priorTakesSummary ? priorTakesSummary + "\n\n" : ""}Question:
${question}

Available context:
${JSON.stringify({
  sportHint,
  matchupContext: matchupContext || null,
  hasImage,
  shortMarketFollowUp,
  hasLiveTranscriptContext,
}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Stay within the sport most clearly implied by the question.
- If the sport is ambiguous, answer conservatively and do not invent specifics.
- Do not make up games, players, or props that are not supported by the prompt.
${continuationRule}`;
  }

  const messages = buildMessagesForAnthropic({
    userPrompt,
    history: incomingHistory,
    intent,
    hasImage,
    image,
  });

  const hasNoChatHistory = normalizedUrTakeHistoryForGate.length === 0;
  const nbaHasUsableContext =
    !!nbaContext &&
    (Array.isArray(nbaContext?.todaysGames) && nbaContext.todaysGames.length > 0 ||
      Array.isArray(nbaContext?.playerStats) && nbaContext.playerStats.length > 0 ||
      Array.isArray(nbaContext?.propLines) && nbaContext.propLines.length > 0 ||
      !!nbaContext?.liveBoxscore);
  if (sportHint === "nba" && hasNoChatHistory && !nbaHasUsableContext) {
    const response =
      "The NBA feed is loading — check back closer to tip-off or ask about a specific player or matchup and I'll work with what's available.";
    const fallbackTake = extractTakeFromResponse({
      responseText: response,
      sport: "nba",
      intent,
      question,
    });
    return res.status(200).json({
      response,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: null,
      decisionMode: nbaDecisionMode,
      sport: "nba",
      intent,
      take: takeClientPayload(fallbackTake),
      fallbackReason: "empty_nba_context",
    });
  }

  if (sportHint === "golf" && hasNoChatHistory && !golfContextEffective) {
    const response =
      "Golf context is still loading. Ask about a specific tournament, player, or matchup and I'll work with what's available.";
    const fallbackTake = extractTakeFromResponse({
      responseText: response,
      sport: "golf",
      intent,
      question,
    });
    return res.status(200).json({
      response,
      responseDeep: null,
      responseFormat: "plain",
      statusShift: null,
      decisionMode: null,
      sport: "golf",
      intent,
      take: takeClientPayload(fallbackTake),
      fallbackReason: "empty_golf_context",
    });
  }

  try {
    const factualQuestion = isSettledFactQuestion(question);
    const selectedTemperature = factualQuestion ? 0.2 : 0.45;

    const tokenBudget =
      draftTeamSimulationInject
        ? 2600
        : outputJsonMode === "tier2_5_json"
          ? 4200
          : outputJsonMode === "tier2_live_json"
            ? 2200
            : outputJsonMode === "tier1_json"
              ? 700
              : isPro ? 1400 : 800;

    // Pro depth guidance only for plain-text full cards — never override JSON contracts,
    // follow-up brevity rules, or draft simulation routes.
    const shouldApplyProDepthAppendix =
      isPro &&
      outputJsonMode === "plain" &&
      !isConversationFollowUp &&
      !draftTeamSimulationInject;

    const proDepthAppendix = shouldApplyProDepthAppendix ? `

[PRO SESSION — DEPTH UNLOCKED]
You are responding to a Pro subscriber. Apply the following:
- Complete the full five-step framework without truncating the structural anchor or close. Do not compress reasoning to meet brevity targets.
- End every analysis card with an explicit verdict block. Use the format appropriate to odds availability:

  If odds ARE available:
  THE PLAY: [lean/fade/pass] · [High/Medium/Speculative] confidence · [one sharp sentence on why]

  If odds are NOT available (no live lines in context):
  THE PLAY: [lean/fade/pass] · [High/Medium/Speculative] confidence · [one sharp sentence on why] — when the line posts, watch for [specific player + specific stat threshold]

- If session history exists, open with one sentence that connects this query to the prior take before building the new card. Do not repeat full prior reasoning — reference it, then advance.
- If evidence is thin, say so plainly in the verdict block rather than omitting it. Thin context, capped confidence, honest close is better than a padded card.
- Never fabricate a line, spread, or total that is not present in the context payload. If odds are unavailable, the verdict close must be directional only — no invented numbers.
` : "";

    const systemPromptWithProAppendix = `${systemPromptForModel}${proDepthAppendix}`;

    if (sportHint === "nba" && nbaContext?.rosterGrounding) {
      console.log(
        "[ur-take] NBA rosterGroundingQuality:",
        nbaContext.rosterGrounding.rosterGroundingQuality ?? "absent",
      );
    }
    const nbaCtxJsonChars =
      sportHint === "nba"
        ? JSON.stringify(nbaContextForModel ?? {}).length
        : null;
    console.log(
      `[ur-take] context: sport=${String(
        sportHint || "unknown",
      )} systemPromptChars=${systemPromptWithProAppendix.length} contextPayloadChars=${userPrompt.length}${
        nbaCtxJsonChars != null ? ` nbaContextJsonChars=${nbaCtxJsonChars}` : ""
      }`,
    );

    const result = await callAnthropic({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_MODEL,
      system: systemPromptWithProAppendix,
      messages,
      temperature: selectedTemperature,
      max_tokens: tokenBudget,
    });

    // TODO: post-response validation
    // Scan Claude response text for player names not in verifiedPlayerNames.
    // If hallucinated names found, either retry with stronger enforcement or
    // flag in the UI with a warning. This is the nuclear option if prompt
    // enforcement alone proves insufficient. Track hallucination rate in logs.

    if (!result.ok) {
      if (result.rateLimitedExhausted) {
        const fallbackResponse = buildRateLimitFallbackResponse({
          sportHint,
          question,
          derivedConfidence,
          nbaContext: nbaContextForModel,
          mlbContext,
          golfContext: golfContextEffective,
          f1Context,
        });
        const fallbackTake = extractTakeFromResponse({
          responseText: fallbackResponse,
          sport: sportHint || "generic",
          intent,
          question,
        });
        return res.status(200).json({
          response: fallbackResponse,
          responseDeep: null,
          responseFormat: "plain",
          statusShift: null,
          decisionMode:
            sportHint === "nba"
              ? nbaDecisionMode
              : sportHint === "mlb"
                ? mlbDecisionMode
                : null,
          sport: sportHint || "generic",
          intent,
          take: takeClientPayload(fallbackTake),
          requestId: result.requestId,
          fallbackReason: "upstream_rate_limit",
        });
      }

      console.error("Anthropic error:", {
        status: result.status,
        requestId: result.requestId,
        model: ANTHROPIC_MODEL,
        data: result.data,
      });

      const upstreamType = result.data?.error?.type || "anthropic_error";
      console.error("[ur-take] upstream Anthropic error:", {
        status: result.status,
        type: upstreamType,
        message: result.data?.error?.message || result.data?.message || null,
        requestId: result.requestId,
      });

      return feedSnagResponse(sportHint);
    }

    const text = extractAnthropicText(result.data);

    if (!text) {
      return feedSnagResponse(sportHint);
    }

    let responseText = text;
    let responseDeep = null;
    let responseFormat = "plain";
    let responseStatusShift = null;
    if (outputJsonMode !== "plain") {
      const parsed = tryParseJsonObject(text) || tryExtractSummaryDeepFromLooseText(text);
      if (parsed && typeof parsed.summary === "string" && parsed.summary.trim()) {
        const normalized = normalizeSummaryDeepPayload(parsed.summary, parsed.deep);
        responseText = normalized.summary;
        responseDeep = normalized.deep;
        if (typeof parsed.statusShift === "string" && parsed.statusShift.trim()) {
          responseStatusShift = parsed.statusShift.trim();
        }
        responseFormat = outputJsonMode;
      } else if (outputJsonMode === "tier2_5_json") {
        // Fallback normalization for malformed / embedded JSON turns:
        // keep response usable instead of dumping raw pseudo-JSON into UI.
        const normalized = normalizeSummaryDeepPayload(text, null);
        responseText = normalized.summary || text;
        responseDeep = normalized.deep;
      }
    }

    if (sportHint === "nba") {
      responseText = stripNbaLeadInDisclosure(responseText);
      if (responseDeep) responseDeep = stripNbaLeadInDisclosure(responseDeep);
      responseText = stripNbaInternalControlLabels(responseText);
      if (responseDeep) responseDeep = stripNbaInternalControlLabels(responseDeep);
      if (isNbaNoMarketUpcomingSlate(nbaContext) && hasNbaNoMarketHardFail(responseText)) {
        responseText = buildNbaNoMarketHardFallback(question, nbaContext);
        responseDeep = null;
        responseFormat = "plain";
        nbaFallbackOrRepairUsed = true;
      }
      if (nbaInvalidation.requiresStatusAcknowledgement && !responseStatusShift && nbaStatusShiftLine) {
        responseStatusShift = nbaStatusShiftLine;
      }
      if (nbaDecisionMode === "conditional_wait" && !/\b(wait|contingen|status|confirm)\b/i.test(responseText)) {
        responseText = `Status is unresolved. Wait for final availability before locking a prop.\n\n${responseText}`;
      }
      if (
        nbaMatchupGroundingApplied &&
        nbaOffMatchupPromptAcknowledgement &&
        !responseText.includes(nbaOffMatchupPromptAcknowledgement)
      ) {
        responseText = `${nbaOffMatchupPromptAcknowledgement}\n\n${responseText}`;
      }
      if (nbaMatchup && nbaMatchupPool && nbaMatchupPool.allowedTeams.length === 2) {
        nbaPostValidationChecked = true;
        const allowedTeamSet = new Set(
          nbaMatchupPool.allowedTeams.map((t) => String(t || "").toUpperCase()),
        );
        const knownMap = nbaMatchupPool.knownPlayerToTeam;
        const mentionsSummary = extractMentionedPlayersFromOutput(responseText, knownMap);
        const mentionsDeep = extractMentionedPlayersFromOutput(responseDeep || "", knownMap);
        const invalidSummary = validatePlayersAgainstMatchup(
          mentionsSummary,
          allowedTeamSet,
          knownMap,
        );
        const invalidDeep = validatePlayersAgainstMatchup(
          mentionsDeep,
          allowedTeamSet,
          knownMap,
        );
        const invalidAll = [...invalidSummary, ...invalidDeep].filter(
          (v, i, arr) =>
            arr.findIndex(
              (x) => x.player.toLowerCase() === v.player.toLowerCase() && x.team === v.team,
            ) === i,
        );
        if (invalidAll.length > 0) {
          nbaPostValidationTriggered = true;
          nbaFallbackOrRepairUsed = true;
          responseText = repairOrRegenerateInvalidMatchupOutput({
            matchup: nbaMatchup,
            pool: nbaMatchupPool,
            invalidPlayers: invalidAll,
          });
          responseDeep = null;
          responseFormat = "plain";
          responseStatusShift = null;
        }
      }
    }

    responseText = stripBannedDataAvailabilityOpener(responseText);
    if (responseDeep) responseDeep = stripBannedDataAvailabilityOpener(responseDeep);
    responseText = stripBannedPerformanceTrackerLines(responseText);
    if (responseDeep) responseDeep = stripBannedPerformanceTrackerLines(responseDeep);

    if (!responseText || responseText.trim().length < 50) {
      responseText = responseDeep || responseText;
    }

    let takeRecord = extractTakeFromResponse({
      responseText,
      sport: sportHint || "generic",
      intent,
      question,
    });
    if (sportHint === "nba") {
      takeRecord = ensureNbaTakeConfidenceConsistency({
        takeRecord,
        decisionMode: nbaDecisionMode,
        derivedConfidence,
        confidenceModifier: nbaConfidenceModifier,
      });
      // Post-gen vocabulary normalizer — runs on every NBA response, not gated on missing confidence.
      responseText = normalizeConfidenceVocabularyInText(responseText);
      if (responseDeep) responseDeep = normalizeConfidenceVocabularyInText(responseDeep);
      if (takeRecord && typeof takeRecord === "object" && takeRecord.confidence) {
        takeRecord = {
          ...takeRecord,
          confidence: normalizeConfidenceVocabularyInText(String(takeRecord.confidence)),
        };
      }
    }
    const nbaMeta =
      sportHint === "nba"
        ? buildNbaObservabilityMeta({
            decisionMode: nbaDecisionMode,
            sport: "nba",
            matchupGroundingApplied: nbaMatchupGroundingApplied,
            postValidationChecked: nbaPostValidationChecked,
            postValidationTriggered: nbaPostValidationTriggered,
            fallbackOrRepairUsed: nbaFallbackOrRepairUsed,
          })
        : null;
    if (nbaMeta) logNbaObservability(nbaMeta);

    // Non-critical side effect: never fail the response if take logging fails.
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }

    if (!responseText || responseText.trim().length === 0) {
      console.error("[ur-take] Empty response after processing — question:", question?.slice(0, 100));
      return feedSnagResponse(sportHint);
    }

    return res.status(200).json({
      response: responseText,
      responseDeep,
      responseFormat,
      statusShift: responseStatusShift,
      decisionMode:
        sportHint === "nba"
          ? nbaDecisionMode
          : sportHint === "mlb"
            ? mlbDecisionMode
            : null,
      ...(nbaDebugEnabled && nbaMeta ? { nbaDebug: nbaMeta } : {}),
      sport: sportHint || "generic",
      intent,
      take: takeClientPayload(takeRecord),
    });
  } catch (err) {
    console.error("UR TAKE error:", err);
    const s =
      req.body && typeof req.body.sportHint === "string" ? req.body.sportHint.trim() : null;
    return feedSnagResponse(s);
  }
}
