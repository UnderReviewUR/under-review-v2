export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

import { applyCors } from "./_cors.js";

/*
  NOTE:
  - NBA_PLAYERS intentionally left empty because you said players.js was removed
    and NBA should rely on live data from nba.js / frontend context.
  - This rewrite preserves your backend shape, fixes sport routing, adds a real
    generic fallback, improves Anthropic error handling, and returns user-visible
    error text even on backend failures so your current frontend can surface it.
*/
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
  if (!data || !data.content || !Array.isArray(data.content)) return "";
  return data.content
    .filter((block) => block.type === "text" && block.text)
    .map((block) => block.text)
    .join("\n");
}

// ── Intent + sport helpers ─────────────────────────────────────────────────
function normalizeText(v) {
  return String(v || "").trim().toLowerCase();
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
    if (league.includes("golf")) return "golf";
    if (league.includes("pga")) return "golf";
    if (league.includes("nba")) return "nba";
    if (league.includes("mlb")) return "mlb";
    if (league.includes("nfl")) return "nfl";
    if (league.includes("f1")) return "f1";
    if (league.includes("formula 1")) return "f1";
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

  if (hasImage) return "image_review";

  return "generic";
}

function getContextQuality({
  sportHint,
  golfContext,
  nbaContext,
  mlbContext,
  nflContext,
  f1Context,
  matchupContext,
}) {
  if (matchupContext) return "high";

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
  derivedConfidence = "Medium",
}) {
  let relevantContext = "";

  if (sportHint === "nba") {
    relevantContext = `NBA context:\n${JSON.stringify(nbaContext || {}, null, 2)}`;
  } else if (sportHint === "nfl") {
    relevantContext = `NFL context:\n${typeof nflContext === "string" ? nflContext : JSON.stringify(nflContext || {}, null, 2)}`;
  } else if (sportHint === "mlb") {
    relevantContext = `MLB context:\n${JSON.stringify(mlbContext || {}, null, 2)}`;
  } else if (sportHint === "golf") {
    relevantContext = `Golf context:\n${JSON.stringify(golfContext || {}, null, 2)}`;
  } else if (sportHint === "f1") {
    relevantContext = `F1 context:\n${JSON.stringify(f1Context || {}, null, 2)}`;
  }

  return `You are reviewing a betting slip or pick entry.

User request:
${question}

${relevantContext}

Critical rules:
- Prioritize the image/slip content over generic betting advice.
- Identify what the user actually submitted.
- Do NOT invent games, teams, players, or props that are not visible in the image or supported by provided context.
- If the slip looks weak, say so directly.
- Focus on structure, correlation, weak legs, strongest leg, and whether the payout justifies the risk.
- If details are partially unreadable, say what you can confirm and do not guess beyond that.
- Stay inside the sport shown by the slip when possible.

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Do not call something High unless the visible slip and context clearly support it.

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
    sportHint: incomingSportHint,
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

WHY IT FITS
[one to two lines]

FADE
[one line]

CONFIDENCE
[High / Medium / Speculative]

TIMING
[one line]

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
    userPrompt = `You are answering an NFL betting question.

Question:
${question}

NFL context:
${typeof nflContext === "string" ? nflContext : JSON.stringify(nflContext || {}, null, 2)}

Confidence guidance:
- Default confidence should be ${derivedConfidence}.
- Only go above that if the input strongly justifies it.

Rules:
- Answer only as an NFL analyst.
- Do not mention golf, NBA, MLB, F1, or tennis.
- Do not invent unrelated games or props.`;
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

    return res.status(200).json({
      response: text,
      sport: sportHint || "generic",
      intent,
    });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({
      error: "Request failed",
      response: `Request failed: ${err?.message || "Unknown server error"}`,
    });
  }
}
