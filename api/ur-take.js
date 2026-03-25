export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const {
    question,
    players = {},
    context = {},
    liveMatches = [],
    tour = "general tennis",
    history = [],
    matchupContext = null
  } = req.body || {};

  if (!question || typeof question !== "string") {
    return res.status(400).json({ error: "Missing question" });
  }

  const isPropQuestion = detectPropIntent(question);
  const safePlayers = prunePlayersForPrompt(players, question, 16);
  const safeContext = pruneContextForPrompt(context, question);
  const safeHistory = Array.isArray(history)
    ? history.filter(m => m && !m.loading && (m.text || m.content)).slice(-6)
    : [];
  const safeLiveMatches = Array.isArray(liveMatches) ? liveMatches.slice(0, 8) : [];

  const systemPrompt = buildSystemPrompt({
    question,
    players: safePlayers,
    context: safeContext,
    liveMatches: safeLiveMatches,
    tour,
    matchupContext,
    isPropQuestion
  });

  const messages = safeHistory.map(msg => ({
    role: msg.role === "user" ? "user" : "assistant",
    content: msg.text || msg.content
  }));

  messages.push({ role: "user", content: question });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        temperature: 0.35,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({ error: "AI response failed", details: data });
    }

    const rawText = data?.content
      ?.filter(item => item.type === "text")
      ?.map(item => item.text)
      ?.join("\n")
      ?.trim() || "Couldn't get a response. Try again.";

    // If prop question, try to parse structured prop cards out of the response
    const propCards = isPropQuestion ? extractPropCards(rawText) : [];

    return res.status(200).json({
      response: rawText,
      propCards,
      isPropQuestion
    });

  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}

// ─── PROP INTENT DETECTION ───────────────────────────────────────────────────

function detectPropIntent(question) {
  const q = question.toLowerCase();
  const propKeywords = [
    "prop", "pick", "bet", "best bet", "angle", "slate", "plays",
    "aces", "over", "under", "lean", "lock", "parlay", "sgp",
    "first set", "handicap", "spread", "favorite", "dog"
  ];
  return propKeywords.some(k => q.includes(k));
}

// ─── PROP CARD EXTRACTION ─────────────────────────────────────────────────────
// Parses bullet lines like: • Sinner — Over 6.5 Aces — Averages 7.2 aces on hard courts

function extractPropCards(text) {
  const lines = text.split("\n");
  const cards = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("•")) continue;

    // Format: • Player Name — Prop — Reason
    const parts = trimmed.replace("•", "").trim().split("—").map(s => s.trim());
    if (parts.length >= 3) {
      cards.push({
        player: parts[0],
        prop: parts[1],
        reason: parts.slice(2).join(" — ")
      });
    } else if (parts.length === 2) {
      cards.push({
        player: parts[0],
        prop: parts[1],
        reason: ""
      });
    }
  }

  return cards;
}

// ─── SYSTEM PROMPT ────────────────────────────────────────────────────────────

function buildSystemPrompt({ question, players, context, liveMatches, tour, matchupContext, isPropQuestion }) {
  const tournament = context?.tournaments?.miami_open || {};
  const playerBlob = formatPlayersForPrompt(players);
  const matchupLines = formatMatchups(context?.matchups || {});
  const aceLines = formatAceProps(context?.ace_props || {});

  return `You are UR TAKE — sharp, confident tennis betting intelligence. You work for Under Review.

RULES
- Answer the question immediately. No stalling. No generic filler.
- Lead with your opinion. Then back it with stats.
- Sound like a smart bettor texting a friend. Not a chatbot.
- Never say "As an AI", "Based on the data", or mention internal mechanics.
- No markdown bold. No headers unless they genuinely help.
- Never guarantee a result. Strong lean, not false certainty.

${isPropQuestion ? `PROP FORMAT — USE THIS EXACTLY
When listing props, use this bullet format on its own line for each pick:
- Player Name — Prop Description — One key stat or reason

Example:
- Sinner — Over 6.5 Aces — Averages 7.4 on hard courts, facing a weak return squad
- Gauff — First Set Winner -115 — Won first set in 8 of last 10 matches

Do not deviate from this format. Each bullet on its own line. No bold. No numbering.
After the bullets, 1-2 sentences max of closing commentary.` 
: `RESPONSE FORMAT
For matchup questions: verdict first sentence, then 2-4 lines of reasoning.
For analyst questions: prose first, opinions per player or tournament, bullets only if they help.
For quick questions: 2-4 sentences max.`}

CURRENT TOURNAMENT
${tournament.name || "Miami Open 2026"} — ${tournament.surface || "Hard"} — ${tournament.speed || "Medium-Fast"}
ATP lean: ${tournament.atp_favorite || "Sinner"} | WTA lean: ${tournament.wta_favorite || "Sabalenka"}
Note: ${tournament.note || "Baseline consistency rewarded over raw power."}

TOUR: ${tour}

PLAYER DATA
${playerBlob || "Player data unavailable"}

LIVE MATCHES
${liveMatches.length
  ? liveMatches.map(m => `${m.home_team || m.homeTeam} vs ${m.away_team || m.awayTeam} — ${m.round || "Miami Open"} — ${m.live === "1" ? "LIVE" : m.status || "Scheduled"}`).join("\n")
  : "None currently"}

MATCHUPS
${matchupLines || "None available"}

ACE BASELINES
${aceLines || "None available"}

${matchupContext ? `MATCHUP CONTEXT\n${matchupContext.title || ""}\n${matchupContext.whatMatters || ""}` : ""}

Answer the question. Pick the right mode. Sound human. Be useful.`.trim();
}

// ─── PLAYER FORMATTER ─────────────────────────────────────────────────────────
// Only sends betting-relevant fields, not the full object

function formatPlayersForPrompt(players) {
  const atp = players.atp || {};
  const wta = players.wta || {};
  const lines = [];

  const formatGroup = (group, tour) => {
    for (const [name, p] of Object.entries(group)) {
      const rank = p.rank || p.eloRank || "?";
      const surface = p.surfaceNote || p.hardNote || "";
      const serve = p.serveRating || "";
      const hElo = p.hElo || "";
      const note = p.fullNote || p.miNote || "";
      lines.push(`[${tour}] ${name} #${rank} | hElo:${hElo} | serve:${serve} | ${surface} | ${note}`.trim());
    }
  };

  formatGroup(atp, "ATP");
  formatGroup(wta, "WTA");
  return lines.join("\n");
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function formatMatchups(matchups) {
  return Object.entries(matchups)
    .map(([key, v]) => `${key.replace(/_/g, " ")}: ${v?.note || ""} ${v?.angle || ""} ${v?.key_stat || ""}`.trim())
    .join("\n");
}

function formatAceProps(aceProps) {
  return Object.entries(aceProps)
    .map(([player, v]) => `${player}: avg ${v?.avg_aces_hard ?? "N/A"} aces on hard, ${v?.ace_rate || "N/A"} ace rate`)
    .join("\n");
}

function prunePlayersForPrompt(players, question, maxPlayers = 16) {
  if (!players || typeof players !== "object") return {};
  const atp = players.atp || {};
  const wta = players.wta || {};
  const questionText = question.toLowerCase();
  const named = extractMentionedPlayers(questionText, { ...atp, ...wta });
  return {
    atp: pickRelevantPlayers(atp, named, maxPlayers),
    wta: pickRelevantPlayers(wta, named, maxPlayers)
  };
}

function pruneContextForPrompt(context, question) {
  if (!context || typeof context !== "object") return {};
  const q = question.toLowerCase();
  const matchups = context.matchups || {};
  const filtered = {};
  let count = 0;
  for (const [key, val] of Object.entries(matchups)) {
    const norm = key.replace(/_/g, " ").toLowerCase();
    if (count < 8 || norm.split(" ").every(p => q.includes(p))) {
      filtered[key] = val;
      count++;
    }
  }
  return {
    tournaments: context.tournaments || {},
    matchups: filtered,
    ace_props: context.ace_props || {}
  };
}

function extractMentionedPlayers(questionText, playerMap) {
  const found = new Set();
  for (const name of Object.keys(playerMap || {})) {
    if (questionText.includes(name.toLowerCase())) found.add(name);
  }
  return found;
}

function pickRelevantPlayers(group, namedPlayers, maxPlayers) {
  return Object.fromEntries(
    Object.entries(group)
      .sort((a, b) => {
        const aNamed = namedPlayers.has(a[0]) ? 1 : 0;
        const bNamed = namedPlayers.has(b[0]) ? 1 : 0;
        if (aNamed !== bNamed) return bNamed - aNamed;
        return (a[1]?.eloRank || 999) - (b[1]?.eloRank || 999);
      })
      .slice(0, maxPlayers)
  );
}
