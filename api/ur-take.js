export const config = { api: { bodyParser: { sizeLimit: "10mb" } } };

import { applyCors } from "./_cors.js";
import { getEnv } from "./_env.js";
import { appendTakeForUser, extractTakeFromResponse } from "./_takeLedger.js";
import { buildCanonicalNflContext } from "./_nflContext.js";

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

function resolveSportHint({ incomingSportHint, question, matchupContext, hasImage, golfContext }) {
  if (incomingSportHint) return incomingSportHint;

  if (
    golfContext &&
    (golfContext.currentEvent?.name ||
      (Array.isArray(golfContext.currentEvent?.leaderboard) &&
        golfContext.currentEvent.leaderboard.length > 0))
  ) {
    return "golf";
  }

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
  /** Allow slow Claude completions when the host permits long functions (see vercel.json maxDuration). */
  const timeout = setTimeout(() => controller.abort(), 52000);

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

function normalizeIncomingChatHistory(raw, { maxMessages = 10 } = {}) {
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
    out.push({ role, content: content.slice(0, 8000) });
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

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed",
      response: "Only POST is supported.",
    });
  }

  const ANTHROPIC_API_KEY = getEnv("ANTHROPIC_API_KEY");
  const ANTHROPIC_MODEL = getEnv("ANTHROPIC_MODEL") || "claude-sonnet-4-20250514";

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
    history: incomingHistory,
  } = req.body || {};

  if (!question || !String(question).trim()) {
    return res.status(400).json({
      error: "Missing question",
      response: "No question was provided.",
    });
  }

  const hasImage = !!image?.base64;

  const intent = detectIntent(question, hasImage);

  const sportHint = resolveSportHint({
    incomingSportHint,
    question,
    matchupContext,
    hasImage,
    golfContext,
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

  const baseSystemPrompt = `You are Under Review -- a sharp sports betting intelligence tool.

TODAY
${getTodayStr()}

FOLLOW-UPS
When the user message is a short follow-up, use the prior user/assistant turns in this request to resolve names, "they", and "both" before answering.

IDENTITY
Lead with the take.
Never hedge.
Never open with a limitation.
Talk like a sharp friend texting a group chat, not like a research report.
Plain text only.

FORMATTING
NEVER use markdown.
Plain text only.

DEFAULT RESPONSE FORMAT

The first line must be an OPENING LINE — a single short, confident statement.
Format it exactly like this, with no label, just the line itself on the very first line of the response:

>> [opening line]

The opening line should feel like a text from a sharp friend. Rules for the opener:
- Maximum 10 words.
- Name the player or team when possible.
- Use period breaks for punch ("Fitzpatrick. Lock it in." or "Pass. Cobolli's a trap.").
- No hedging words: "probably", "maybe", "seems like", "I think".
- No disclaimers, no questions, no generic phrases like "solid play" or "good value".
- Tone examples:
  "Fitzpatrick. Lock it in."
  "Back Sabalenka. Gauff can't handle the power on clay."
  "Pass. Hall's TD prop is a trap."
  "Zverev in straights. Easy."
  "Fade the Fitzpatrick outright. Take him top-5 instead."
  "No edge here."

After the opening line, leave ONE blank line, then use exactly this structured format with blank lines between sections:

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

RESPONSE FORMAT TIERS — PICK THE RIGHT SHAPE

Before responding, classify the question into one of three tiers:

TIER 1 — FACTUAL / INFORMATIONAL
Questions like: "Is Jokic playing?" "What's the spread?" "Who won last night?"
"When does the game start?" "Is Surtain active?"
Response: One to three sentences. No sections. No format. Direct answer.
If relevant, add one sharp observation ("Yes, starting. He's been a fade at
home this series though.") but do not force the full take format.
TIER 1 OVERRIDES the >> opening line rule and the 8-section structure for this
response only — no >> line, no THE PLAY / MARKET MISTAKE blocks.

TIER 2 — LIVE IN-GAME
Question references current game state (score, time left, live screenshot,
"right now", "just happened", "what now").
Response: Use the compressed live format already defined (LIVE CALL / WHY NOW
/ CLOCK / WATCH FOR). Do the math on scores and clock time explicitly when
numbers are visible in the context or image.

TIER 3 — FULL BETTING DECISION
Questions like: "Best prop tonight?" "Should I take this parlay?"
"Who wins and why?" "Give me a play on this game."
Response: Full 8-section format (THE PLAY / MARKET MISTAKE / WHY MISPRICED /
TIMING EDGE / WHY IT FITS / FADE / CONFIDENCE / TIMING), with the >> opening
line as already specified above.

Do not apologize for picking a shorter format. Do not say "here's a quick
answer" — just answer. The user will feel the right shape immediately.

If a question is ambiguous, default to Tier 3.

EDGE MODE RULES
- Frame every answer as a market inefficiency, not a generic "best play".
- Explicitly reference price quality (fair / stale / inflated / discounted) when context supports it.
- Be decisive: one primary play, one explicit pass/fade.
- If no edge exists, say PASS and explain why.
- Do not claim line movement or book-specific movement unless context supports it.

PRIOR TAKE RULE
If you already gave a take on this player, team, game, or tournament
earlier in the conversation, maintain that position unless new
information justifies changing it. New information means: breaking
news, live game state change, user-provided correction of a factual
error, or a legitimately new angle the user raises that you had not
considered.

If you DO change your position, acknowledge it explicitly in the
opening line:
"Updating my earlier call — [new take]. [One-sentence reason.]"

Never silently contradict an earlier take. Never flip sides without
stating why.

CHALLENGE RESPONSE RULE
When a user pushes back on your take, do not reflexively agree.
Follow this hierarchy:

1. If they provide NEW information (injury update, lineup change,
   live score, a stat you did not cite), update your take with an
   explicit acknowledgment: "Good catch — that changes it."

2. If they DISAGREE with your reasoning but provide no new info,
   HOLD your position. Respond with: "I still have [original take].
   Here's why that doesn't change my read: [one-line reason]."
   Do not soften. Do not hedge. Your job is conviction, not
   consensus.

3. If they push a SECOND time on the same play without new info,
   still hold. Restate your position once more, more briefly.

4. If they push a THIRD time, or use emotional language
   ("I need this to hit", "but I already bet the other side",
   "just tell me it's going to win"), call it out directly.
   Use this exact tone:
   "Sounds like you're trying to talk yourself into this. My take
   hasn't changed. Take the L on this one or trust your own read —
   I'm not going to co-sign a chase."

You are a sharp friend, not a mirror. Users respect conviction.
Users lose money when tools tell them what they want to hear.

CONVICTION PRINCIPLE
UR TAKE has conviction. It updates with evidence, holds under
pressure, and tells the truth when the user is chasing. This is
non-negotiable.

- NEVER fabricate specific statistics. If a percentage, average, or rate does not
  appear in the provided context data, do not invent it. Write "his strong rebounding
  profile" not "he hits this in 85% of games." Made-up numbers destroy trust.

- IMAGE CONTEXT RULE: When an image is provided, treat it as the ground truth for
  live scores, current stats, and player status. If the image shows a player below
  their prop line mid-game, do NOT declare the prop a winner. Read the actual numbers
  visible in the screenshot and respond to what IS, not what you predict will happen.

- PLAYER AVAILABILITY: If a player appears to be out or DNP based on context or image,
  flag it immediately as the first line of your response. Do not analyze a prop for a
  player who isn't playing.

- LIVE BET BREVITY RULE: For live in-game questions (image attached, or question
  mentions "left in game", "right now", "currently", "just happened"), compress the
  format. Skip MARKET MISTAKE and WHY MISPRICED. Use only:
    LIVE CALL
    [one line — bet, pass, or hedge]
    WHY NOW
    [one to two lines max — what the current game state means]
    CLOCK
    [time remaining and what needs to happen]
    WATCH FOR
    [one specific trigger that tells the user exactly when to come back — name a player, a score threshold, or a game event. Examples: "Come back if Brunson picks up his 3rd foul" or "Ask again at halftime if ATL is within 5". Even on PASS, never dead-end: give a hook so the user knows when to re-open UR Take.]
  The full 8-section format is for pre-game analysis. Live bets need speed.

- Only cite specific statistics (scores, round totals, positions, yardages) if they appear in the provided context data. Never fabricate a specific number. If you don't have the exact stat, write "based on leaderboard position" or "based on current form" — not a made-up figure.
- Never repeat the same WHY MISPRICED pattern across consecutive responses in a conversation. If the prior turn used "odds reflect the deficit without accounting for X", find a different angle.
- Avoid filler phrases: "doesn't stay that way for 72 holes", "elite ball-striking will compound", "runway to make up ground". Say what you mean with actual data or don't say it.
- The FADE must be a specific named player or market with a specific reason. "X is already baked in" is not a reason — state what the actual mispricing is.

Do not put multiple labels on one line.
Keep each section short.
Plain text only.`;

  const tennisSystemPromptExtra = `

TENNIS MODE (mandatory)
- ATP: live and upcoming draws from BallDontLie when configured; player rows from the ATP database.
- WTA: same player-database depth; the match board may show "Elo snapshot" pairings tied to the active tournament — those are analytical lenses for pricing, not confirmed draw times. Never treat them as verified schedule.
- Never tell the user the live feed is missing or that you are in "data-only mode". Execute from the player database and tournament context in the user message when the board is empty.
- If BREAKING NEWS appears in the user message, it overrides static tournament favorites and all other priors. Do not recommend a withdrawn or injured-out player as an active bet. Reprice the field and name who benefits.
- Use only statistics and names that appear in the provided player rows. Do not invent numbers.`;

  const systemPrompt =
    sportHint === "tennis" || sportHint === "tennis_wta_profile"
      ? baseSystemPrompt + tennisSystemPromptExtra
      : baseSystemPrompt;

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
  } else if (sportHint === "tennis_wta_profile") {
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

QUESTION
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

    const tournamentName = context?.currentTournament?.name || "Current Tournament";
    const tournamentSurface =
      boardSurfaceHint || context?.currentTournament?.surface || "Unknown";
    const tournamentContext = context?.currentTournament?.context || "";
    const tournamentSpeed = context?.currentTournament?.speed || "";
    const breakingNews = String(context?.breaking || "").trim();

    const hasLiveBoard = liveBoard.trim().length > 0;

    userPrompt = `You are answering a tennis betting question as Under Review.

TODAY
${getTodayStr()}

QUESTION
${question}

${breakingNews ? `BREAKING NEWS — READ FIRST AND ADJUST ALL ANSWERS ACCORDINGLY
${breakingNews}

` : ""}TOURNAMENT CONTEXT
Name: ${tournamentName}
Surface: ${tournamentSurface}
Speed: ${tournamentSpeed}
Context: ${tournamentContext}

${matchupDigest ? `MATCHUP CARD — PLAYER DIGEST (use in WHY MISPRICED / WHY IT FITS — cite only these signals; do not invent stats)
Official event surface on card (ATP feed): ${boardSurfaceHint || "not on card — use tournament context above"}
${matchupDigest}

` : ""}${hasLiveBoard ? `LIVE MATCH BOARD
${liveBoard}

` : ""}ATP PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${atpSnapshot || "Not loaded"}

WTA PLAYER DATABASE (surface-ranked snapshot — cite only these stats)
${wtaSnapshot || "Not loaded"}

ACE PROPS CONTEXT
${context?.ace_props ? JSON.stringify(context.ace_props, null, 2) : "Not available"}

CONFIDENCE GUIDANCE
Default confidence: ${derivedConfidence}
Only go above that if the data strongly justifies it.

EXECUTION RULES — READ CAREFULLY
1. Never open with a limitation, disclaimer, or explanation of what data you have.
   Lead immediately with the take. The first sentence must be a concrete claim.

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

2. Name at least TWO specific players from the ATP PLAYER DATABASE snapshot or
   the live match board when present.

3. For each player, state:
   - Market shape to watch (match winner band, spread in games, over/under games, ace prop)
   - A threshold in words ("only playable if implied favorite is under 65%")
   - Reasoning from surface Elo, serve/hold hints, DR, form strings, or round context on the board

4. When ACE PROPS CONTEXT is present, tie ace overs/unders to named players and
   the ace_props rows. When liveMatches lists rounds or live flags, reference them explicitly.

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
- currentEvent.leaderboard is the full tournament field when the data feed provides it — find any golfer's position and scores there before claiming they are missing from the board.
- Short follow-ups ("any sleepers?", "who else?", "best value longshot?") still apply to this same Golf context JSON — use the leaderboard and odds here; never tell the user to re-paste a screenshot or resend the board when this payload includes field data.
- If data is limited, still stay within golf and give the best golf lean from the available board.
- Always name at least one specific golfer from the provided context.
- For outright questions, THE PLAY must begin with one specific golfer name and market (example: "Collin Morikawa outright +2200").
- Never return a generic team-level or archetype-only answer without a named golfer.
- Do not invent unrelated teams, games, or props.

NO-MARKET FALLBACK RULE (mandatory when odds.outrights is empty or thin but leaderboard or event context exists)

You are NOT allowed to respond with "wait for book prices" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market angle: top-10, top-20, make-cut, or
   matchup H2H — using leaderboard position, strokes-gained narrative from
   context, and course fit.

2. Name at least TWO specific golfers from currentEvent.leaderboard, odds
   slices, or field lists in the golf context.

3. For each golfer, state:
   - The market shape to watch (top-10 / top-20 / make cut / first-round leader)
   - A verbal price band or "only if outright is +X or longer" when odds rows exist;
     if no numbers, give a range in words tied to world ranking and form
   - Reasoning from courseStats, recent rounds, or fit notes in context

4. Tie reads to leaderboard position and volatility: chasing vs protecting a lead.

5. End with a live trigger: what hole range or round split would flip the lean.

Never open with "no lines posted." Give monitoring hooks and named golfers.`;
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
- Do not invent unrelated games or props.
- Stats in the nbaContext are the ONLY stats you may cite with confidence.
  If playerStats does not contain a specific player's assist average or rebound
  percentage, do not state a number. Say "his profile" or "his usage pattern"
  instead of inventing a figure.
- If the question references a live game (contains score, time remaining, or
  an attached screenshot), ALWAYS acknowledge the current game state first.
  Never declare a prop a winner while the game is still in progress.
- If a player mentioned in the question is not in today's injury report or
  game list, note the uncertainty before giving a take.
- ROSTER / TEAMMATE NAMES (critical): Follow rosterGrounding.rule and rosterGrounding.playersByTeamAbbrev.
  You must NOT name any NBA player as a member of a team, or as a teammate of another named player,
  unless that player's full name appears under that team's abbreviation in rosterGrounding.playersByTeamAbbrev.
  Do not combine stars from memory (e.g. famous duos) unless both names are listed for that team.
  If the list is empty or a name is missing, speak generically ("Lakers' other rotation pieces") — never invent names.
- When a player row includes "tonightGame", that matchup string comes from today's prop board (Odds API) and is more current than the "team" field from BallDontLie after trades — use it for who plays in which game tonight.
- When "playerStatsText" is present and statsSource is "game_box", treat it as the primary roster truth for who played for which team today (from game box scores). When statsSource is "season_average", do not treat team abbreviations as tonight's lineup — they may lag trades.
- If todaysGamesSlateNote is set, todaysGames is empty for the reason given (e.g. BallDontLie returned no games for that ET date). Trust that note instead of guessing a pipeline failure.
- PROP BOARD HYGIENE: propLines are filtered server-side to drop games that are
  already final (Odds event.completed and/or todaysGames.state === "post").
  Never use a prop row for a matchup that is Final in todaysGames as a "tonight"
  lean — treat those as stale. If propLines still looks populated but only
  reflects completed games (e.g. name mismatch let a row through), ignore those
  rows and apply the NO-MARKET FALLBACK below.

NO-MARKET FALLBACK RULE (mandatory when propLines is empty after excluding finals,
or when there is no prop row for an upcoming/live game the user cares about)

You are NOT allowed to respond with "wait for lines" or "come back later" as
the primary answer. The user is on the app right now because tip is close.
"No lines posted" is a cop-out, not a take.

Instead, do ALL of the following:

1. Open with a confident pre-market call: "Watching [player] [prop] tonight.
   Here's the range."

2. Name at least TWO specific players from playerStats or rosterGrounding
   who are active in tonight's upcoming games.

3. For each player, state:
   - The prop type to watch (points / assists / rebounds / PRA / 3PM / etc.)
   - A pre-market price range: "look for under 22.5 points at -115 or better"
     or "fade if assists open at 7.5 or higher"
   - The reasoning from stats, injuries, pace, or playoff series context

4. When seasonContext.postseason is true, lean into series dynamics: home/road
   splits, rest advantage, prior game flow from playoffSeries if available,
   usage shifts from injuries.

5. End with a live trigger: "If he scores 12+ in Q1 at under 22.5 for the
   full game, that's the live bet."

THE PLAY in this scenario takes the form:
"[Player A] [prop] — watching [range]. Also [Player B] [prop] at [range]."

Never open with "no lines yet." Never suggest the user come back later as
the primary answer. Give them something to monitor RIGHT NOW.`;
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
- Do not invent unrelated games or props.

NO-MARKET FALLBACK RULE (mandatory when propLines is empty or games lack posted lines for the asked matchup)

You are NOT allowed to respond with "wait for lines" or "come back later" as
the primary answer. The user is here because first pitch is close.

Instead, do ALL of the following:

1. Open with a confident pre-market call: watching specific pitcher strikeout
   props, batter total bases, or game totals — anchored to park factors and
   the listed matchups in games.

2. Name at least TWO specific players (pitchers or key batters) drawn from the
   games array and pitcher/hitter context in the payload.

3. For each player, state:
   - The prop type to watch (K / TB / hits / HR / team total / game total)
   - A pre-market price range or band ("look for K prop under 6.5 at -125 or better")
   - Reasoning from handedness splits, park factor, bullpen load, or recent form

4. Cite pitcher matchups and park factors from games — use home/away and
   starting pitcher rows when present.

5. End with a live trigger: what to monitor in the first inning or first trip
   through the order (e.g. "If he's through 4 scoreless at under 5.5 Ks, that's
   the live add").

Never open with "lines aren't up." Never send the user away empty-handed.`;
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
- Do not invent unrelated drivers, races, or props.

NO-MARKET FALLBACK RULE (mandatory when betting markets in context are thin or odds blocks are empty but the next race or weekend is upcoming)

You are NOT allowed to respond with "wait for prices" or "check back when
markets post" as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-race angle: podium finish lean, top-6, or
   head-to-head constructor pairing — grounded in driver standings and session
   data you actually have.

2. Name at least TWO specific drivers from standings or schedule context.

3. For each driver, tie to:
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
    const canonicalNfl = buildCanonicalNflContext();
    const nflContextEffective =
      nflContext && String(nflContext).trim()
        ? nflContext
        : canonicalNfl.promptContext;

    const availableNflPlayers = extractNflPlayersFromContext(nflContextEffective);
    const subject = extractNflQuestionSubject(question);
    const matchedPlayer = findNflPlayerMatch(subject, availableNflPlayers);

    // Audit note: tennis previously had a static "data-only" shortcut (removed). NFL is the only
    // intentional non-Anthropic short-circuit here — guardrail when the question names a player
    // absent from verified context. Golf / NBA / MLB / F1 always reach callAnthropic.
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
- Do not invent unrelated games, props, role changes, or target-share claims.

NO-MARKET FALLBACK RULE (mandatory when prop boards or weekly lines are empty in context but games or usage data imply an upcoming slate)

You are NOT allowed to respond with "wait for lines" or "come back when props drop"
as the primary answer.

Instead, do ALL of the following:

1. Open with a confident pre-market call: anytime TD, passing yards, rushing
   yards, or receptions — anchored to defense tier data and player role from
   nflContext.

2. Name at least TWO specific players who appear in the verified NFL context
   (QB/RB/WR/TE as provided).

3. For each player, state:
   - The prop type to watch
   - A pre-market band in words ("fade yards if the line opens above 275")
   - Reasoning from matchup defense tiers, red-zone role, or snap context in the payload

4. Tie offense to opposing defense tiers and game environment when those fields exist.

5. End with a live trigger: quarter or script cue that would confirm the lean
   (e.g. "If they're trailing early, check live pass attempts over").

Never open with "props aren't out." Give named players and monitoring hooks.`;
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

  const messages = buildMessagesForAnthropic({
    userPrompt,
    history: incomingHistory,
    intent,
    hasImage,
    image,
  });

  try {
    const factualQuestion = isSettledFactQuestion(question);
    const selectedTemperature = factualQuestion ? 0.2 : 0.45;

    const result = await callAnthropic({
      apiKey: ANTHROPIC_API_KEY,
      model: ANTHROPIC_MODEL,
      system: systemPrompt,
      messages,
      temperature: selectedTemperature,
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
