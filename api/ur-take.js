export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

import { applyCors } from "./_cors.js";
import { appendTakeForUser, extractTakeFromResponse } from "./_takeLedger.js";
import { buildCanonicalNflContext } from "./_nflContext.js";

// Kept for compatibility with older references
const NBA_PLAYERS = {};

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

function buildTennisContextSummary({ players, context, liveMatches }) {
  const surfaceKey = pickSurfaceKey(context);
  const atpTop = buildTourShortlist(players?.atp, surfaceKey, 8);
  const wtaTop = buildTourShortlist(players?.wta, surfaceKey, 8);
  const tournament = context?.currentTournament || null;

  return {
    mode: Array.isArray(liveMatches) && liveMatches.length > 0 ? "live_board" : "data_only",
    surfaceFocus: surfaceKey,
    tournament: tournament
      ? {
          name: tournament.name || null,
          surface: tournament.surface || null,
          speed: tournament.speed || null,
          location: tournament.location || null,
          atp_favorite: tournament.atp_favorite || null,
          wta_favorite: tournament.wta_favorite || null,
        }
      : null,
    liveMatchCount: Array.isArray(liveMatches) ? liveMatches.length : 0,
    atpTop,
    wtaTop,
  };
}

function buildTennisDataOnlyFallback({ question, summary, confidence }) {
  const q = normalizeText(question);
  const preferWta = q.includes("wta") || q.includes("women");
  const tournament = summary?.tournament || {};
  const atpTop = summary?.atpTop || [];
  const wtaTop = summary?.wtaTop || [];
  const candidateList = preferWta ? wtaTop : atpTop;
  const favoriteName = preferWta
    ? tournament?.wta_favorite
    : tournament?.atp_favorite;

  const fallbackName =
    favoriteName ||
    candidateList?.[0]?.name ||
    (!preferWta ? wtaTop?.[0]?.name : atpTop?.[0]?.name) ||
    "top surface-rated player";

  const surface = tournament?.surface || summary?.surfaceFocus || "current surface";
  const eventName = tournament?.name || "current tournament board";

  return `Live match feed is unavailable, so the edge comes from your loaded player/surface model and tournament context.

THE PLAY
${fallbackName} tournament future — only at plus money (or implied probability <= 45%)

MARKET MISTAKE
Market prices brand/name momentum more than surface-fit and hold/break profile stability.

WHY MISPRICED
In data-only mode, the strongest signal is surface-adjusted player strength plus tournament fit, not single-match noise.

TIMING EDGE
Pre-round placement/futures window before live feed-driven narrative reprices the board.

WHY IT FITS
${eventName} on ${surface} favors profile consistency from the loaded dataset, and ${fallbackName} sits in the top tier for that profile.

FADE
Fade blind same-day match bets without confirmed live board and line context.

CONFIDENCE
${confidence === "High" ? "Medium" : confidence}

TIMING
Use this as a pre-match/futures angle now; switch to matchup-specific calls once live board returns.`;
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
    /\bwill\s+([a-z][a-z'\-]*(?:\s+[a-z][a-z'\-]*){0,2})\s+(throw|pass|rush|run|score|catch|record|have)\b/;
  const overUnderPattern =
    /\b([a-z][a-z'\-]*(?:\s+[a-z][a-z'\-]*){0,2})\s+(over|under)\s+\d/;

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

function detectIntent(question, hasImage) {
  const q = normalizeText(question);

  if (
    hasImage &&
    (
      q.includes("thoughts") ||
      q.includes("what do you think") ||
      q.includes("analyze") ||
      q.includes("analysis") ||
      q.includes("slip") ||
      q.includes("parlay") ||
      q.includes("entry") ||
      q.includes("pick em") ||
      q.includes("pick'em") ||
      q.includes("picks") ||
      q.includes("ticket")
    )
  ) {
    return "slip_review";
  }

  if (q.includes("fade")) return "fade";
  if (q.includes("sleeper")) return "sleeper";
  if (q.includes("outright")) return "outright";
  if (q.includes("prop")) return "prop";

  return "general";
}

function resolveSportHint({ incomingSportHint, question, matchupContext, hasImage }) {
  if (incomingSportHint) return incomingSportHint;

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
  if (q.includes("mlb") || q.includes("strikeout") || q.includes("home run")) return "mlb";
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

  if (hasImage) return incomingSportHint || "generic";

  return "generic";
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

  if (score >= 6) return "High";
  if (score >= 3) return "Medium";
  return "Low";
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
}) {
  let relevantContext = "";

  if (sportHint === "nba") {
    relevantContext = `NBA context:
${JSON.stringify({
  seasonContext: nbaContext?.seasonContext || null,
  todaysGames: nbaContext?.todaysGames || [],
  propLines: (nbaContext?.propLines || []).slice(0, 80),
  injuries: nbaContext?.injuries || [],
  recentForm: nbaContext?.recentForm || "",
  gameTotals: nbaContext?.gameTotals || {},
  playerStats: (nbaContext?.playerStats || []).slice(0, 60),
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

User request:
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

// ── Anthropic call wrapper ──────────────────────────────────────────────────
async function callAnthropic({
  apiKey,
  model,
  system,
  messages,
  temperature = 0.45,
  max_tokens = 800,
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens,
        temperature,
        system,
        messages,
      }),
    });

    const requestId =
      response.headers.get("request-id") ||
      response.headers.get("anthropic-request-id") ||
      null;

    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      requestId,
      data,
    };
  } finally {
    clearTimeout(timeout);
  }
}

// ── Main Handler ────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  if (!applyCors(req, res, { methods: "POST, OPTIONS" })) return;
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      response: "Only POST is supported.",
    });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Missing ANTHROPIC_API_KEY",
      response: "Backend is missing ANTHROPIC_API_KEY in Vercel Production.",
    });
  }

  const {
    question,
    userEmail,
    sportHint: incomingSportHint,
    players,
    context,
    liveMatches,
    golfContext,
    nbaContext,
    mlbContext,
    f1Context,
    nflContext,
    matchupContext,
    image,
  } = req.body || {};

  if (!question || !String(question).trim()) {
    return res.status(400).json({
      error: "Missing question",
      response: "No question was provided.",
    });
  }

  const systemPrompt = `You are Under Review -- a sharp sports betting intelligence tool.

TODAY
${getTodayStr()}

IDENTITY
Lead with the take.
Never hedge.
Never open with a limitation.
Plain text only.

FORMATTING
NEVER use markdown.
Plain text only.

DEFAULT RESPONSE FORMAT
Start with one sharp opening sentence.

Then use exactly this format with blank lines between sections:

THE PLAY
[one line]

MARKET MISTAKE
[one line]

WHY MISPRICED
[one to two lines focused on price/probability gap]

TIMING EDGE
[one line: bet now / wait / live trigger]

WHY IT FITS
[one to two lines]

FADE
[one explicit pass/fade line]

CONFIDENCE
[High / Medium / Speculative]

TIMING
[one line]

EDGE MODE RULES
- Frame every answer as a market inefficiency, not a generic "best play".
- Explicitly reference price quality (fair / stale / inflated / discounted) when context supports it.
- Be decisive: one primary play, one explicit pass/fade.
- If no edge exists, say PASS and explain why.
- Do not claim line movement or book-specific movement unless context supports it.

Do not put multiple labels on one line.
Keep each section short.
Plain text only.`;

  const hasImage = !!image?.base64;

  const intent = detectIntent(question, hasImage);

  const sportHint = resolveSportHint({
    incomingSportHint,
    question,
    matchupContext,
    hasImage,
  });

  const contextQuality = getContextQuality({
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
  });

  const derivedConfidence = deriveConfidenceLabel({
    intent,
    sportHint,
    hasImage,
    matchupContext,
    question,
    contextQuality,
  });

  if (
    sportHint === "tennis" &&
    (!Array.isArray(liveMatches) || liveMatches.length === 0) &&
    players
  ) {
    const tennisSummary = buildTennisContextSummary({
      players,
      context,
      liveMatches,
    });
    const fallbackResponse = buildTennisDataOnlyFallback({
      question,
      summary: tennisSummary,
      confidence: derivedConfidence,
    });

    const takeRecord = extractTakeFromResponse({
      responseText: fallbackResponse,
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
      response: fallbackResponse,
      sport: sportHint || "generic",
      intent,
      take: {
        id: takeRecord.id,
        playLine: takeRecord.playLine,
        confidence: takeRecord.confidence,
        status: takeRecord.status,
      },
    });
  }

  let userPrompt = question;

  if (intent === "slip_review") {
    userPrompt = buildSlipReviewPrompt({
      question,
      sportHint,
      nbaContext,
      nflContext,
      mlbContext,
      golfContext,
      f1Context,
      derivedConfidence,
    });
  } else if (sportHint === "tennis") {
    const tennisSummary = buildTennisContextSummary({
      players,
      context,
      liveMatches,
    });

    userPrompt = `You are answering a tennis betting question.

Question:
${question}

Tennis context:
${JSON.stringify(
  {
    currentTournament: context?.currentTournament || null,
    tournaments: context?.tournaments || null,
    liveMatches: (liveMatches || []).slice(0, 16),
    playersLoaded: players
      ? {
          atpCount: Object.keys(players?.atp || {}).length,
          wtaCount: Object.keys(players?.wta || {}).length,
        }
      : null,
  },
  null,
  2
)}

Tennis model summary (use this heavily):
${JSON.stringify(tennisSummary, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as a tennis analyst.
- Do not mention NFL, NBA, MLB, F1, or golf.
- You already have tournament + live board context above. Use it directly.
- Do not ask the user for tournament/match details already present in context.
- If context is missing for a specific requested match, say exactly what is missing in one line.
- Do not invent players, rounds, scores, or market movement.
- If mode is "data_only" (no live matches), still provide one concrete tennis angle using named players from atpTop/wtaTop and tournament info.
- In data_only mode, prefer futures/placement/style angles (not fake tonight matchup edges).
- If no market line is provided, state the play with price discipline language (example: "only at plus money" or "only if line <= X"), never invent a specific book line.`;
  } else if (sportHint === "golf") {
    userPrompt = `You are answering a golf betting question.

Question:
${question}

Golf context:
${JSON.stringify(golfContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as a golf analyst.
- Do not mention NBA, NFL, MLB, F1, or tennis.
- Use the tournament, odds, rankings, and player names in the provided golf context.
- If data is limited, still stay within golf and give the best golf lean from the available board.
- Always name at least one specific golfer from the provided context.
- For outright questions, THE PLAY must begin with one specific golfer name and market (example: "Collin Morikawa outright +2200").
- Never return a generic team-level or archetype-only answer without a named golfer.
- Do not invent unrelated teams, games, or props.`;
  } else if (sportHint === "nba") {
    userPrompt = `You are answering an NBA betting question.

Question:
${question}

NBA context:
${JSON.stringify(nbaContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as an NBA analyst.
- Do not mention golf, NFL, MLB, F1, or tennis.
- Do not invent unrelated games or props.`;
  } else if (sportHint === "mlb") {
    userPrompt = `You are answering an MLB betting question.

Question:
${question}

MLB context:
${JSON.stringify(mlbContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as an MLB analyst.
- Do not mention golf, NBA, NFL, F1, or tennis.
- Do not invent unrelated games or props.`;
  } else if (sportHint === "f1") {
    userPrompt = `You are answering a Formula 1 betting question.

Question:
${question}

F1 context:
${JSON.stringify(f1Context || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as an F1 analyst.
- Do not mention golf, NBA, NFL, MLB, or tennis.
- Do not invent unrelated drivers, races, or props.`;
  } else if (sportHint === "nfl") {
    const canonicalNfl = buildCanonicalNflContext();
    const nflContextEffective =
      nflContext && String(nflContext).trim()
        ? nflContext
        : canonicalNfl.promptContext;

    const availableNflPlayers = extractNflPlayersFromContext(nflContextEffective);
    const subject = extractNflQuestionSubject(question);
    const matchedPlayer = findNflPlayerMatch(subject, availableNflPlayers);

    if (
      shouldApplyNflUnsupportedGuard(question) &&
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
        take: {
          id: takeRecord.id,
          playLine: takeRecord.playLine,
          confidence: takeRecord.confidence,
          status: takeRecord.status,
        },
      });
    }

    userPrompt = `You are answering an NFL betting question.

Question:
${question}

NFL context:
${typeof nflContextEffective === "string" ? nflContextEffective : JSON.stringify(nflContextEffective || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as an NFL analyst.
- Do not mention golf, NBA, MLB, F1, or tennis.
- Use only players/teams/roles that exist in the provided NFL context.
- If the asked player is not in provided context, return PASS and explain missing context in one line.
- Do not invent unrelated games, props, role changes, or target-share claims.`;
  } else if (matchupContext) {
    userPrompt = `You are answering a betting question about this matchup.

Question:
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
    userPrompt = `You are answering a sports betting question.

Question:
${question}

Available context:
${JSON.stringify({
  sportHint,
  matchupContext: matchupContext || null,
  hasImage,
}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Stay within the sport most clearly implied by the question.
- If the sport is ambiguous, answer conservatively and do not invent specifics.
- Do not make up games, players, or props that are not supported by the prompt.`;
  }

  const messages = hasImage
    ? [
        {
          role: "user",
          content: [
            { type: "text", text: userPrompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: image.mediaType,
                data: image.base64,
              },
            },
          ],
        },
      ]
    : [{ role: "user", content: userPrompt }];

  try {
    const result = await callAnthropic({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_MODEL,
      system: systemPrompt,
      messages,
      temperature: 0.45,
      max_tokens: 800,
    });

    if (!result.ok) {
      console.error("Anthropic error:", {
        status: result.status,
        requestId: result.requestId,
        model: ANTHROPIC_MODEL,
        data: result.data,
      });

      const upstreamType = result.data?.error?.type || "anthropic_error";
      const upstreamMessage =
        result.data?.error?.message ||
        result.data?.message ||
        `Anthropic request failed (${result.status})`;

      return res.status(result.status).json({
        error: upstreamType,
        response: `AI request failed: ${upstreamMessage}`,
        requestId: result.requestId,
        debug: {
          status: result.status,
          model: ANTHROPIC_MODEL,
        },
        details: result.data || null,
      });
    }

    const text = extractAnthropicText(result.data);

    if (!text) {
      return res.status(500).json({
        error: "Empty AI response",
        response: "AI returned an empty response. Try again.",
      });
    }

    const takeRecord = extractTakeFromResponse({
      responseText: text,
      sport: sportHint || "generic",
      intent,
      question,
    });

    // Non-critical side effect: never fail the response if take logging fails.
    if (userEmail) {
      appendTakeForUser(userEmail, takeRecord).catch((e) => {
        console.warn("take logging failed:", e?.message || e);
      });
    }

    return res.status(200).json({
      response: text,
      sport: sportHint || "generic",
      intent,
      take: {
        id: takeRecord.id,
        playLine: takeRecord.playLine,
        confidence: takeRecord.confidence,
        status: takeRecord.status,
      },
    });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({
      error: "Request failed",
      response: `Request failed: ${err?.message || "Unknown server error"}`,
    });
  }
}
