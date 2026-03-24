export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });
  }

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

  const safePlayers = prunePlayersForPrompt(players, question, 18);
  const safeContext = pruneContextForPrompt(context, question);
  const safeHistory = Array.isArray(history) ? history.slice(-8) : [];
  const safeLiveMatches = Array.isArray(liveMatches) ? liveMatches.slice(0, 12) : [];

  const systemPrompt = buildSystemPrompt({
    question,
    players: safePlayers,
    context: safeContext,
    liveMatches: safeLiveMatches,
    tour,
    matchupContext
  });

  const messages = [];

  for (const msg of safeHistory) {
    if (!msg || msg.loading) continue;

    const text = msg.text || msg.content;
    if (!text || typeof text !== "string") continue;

    messages.push({
      role: msg.role === "user" ? "user" : "assistant",
      content: text
    });
  }

  messages.push({
    role: "user",
    content: question
  });

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
        temperature: 0.7,
        system: systemPrompt,
        messages
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({
        error: "AI response failed",
        details: data
      });
    }

    const text =
      data?.content
        ?.filter((item) => item.type === "text")
        ?.map((item) => item.text)
        ?.join("\n")
        ?.trim() || "Couldn't get a response. Try again.";

    return res.status(200).json({ response: text });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({
      error: "Request failed",
      details: err.message
    });
  }
}

function buildSystemPrompt({ question, players, context, liveMatches, tour, matchupContext }) {
  const tournament = context?.tournaments?.miami_open || {};
  const matchupLines = formatMatchups(context?.matchups || {});
  const aceLines = formatAceProps(context?.ace_props || {});
  const playerBlob = JSON.stringify(players || {}, null, 0);

  return `
You are UR TAKE — the voice of Under Review, a sports intelligence app focused on sharp, stat-backed tennis takes.

CORE JOB
Your first job is to answer the user's exact question clearly and immediately.
Do not dodge.
Do not stall.
Do not redirect into generic betting philosophy.
Do not ask for narrower framing unless the question is truly impossible to answer from the information you already have.

PRIMARY BEHAVIOR
- Lead with the opinion.
- Then explain why.
- Sound like a smart, confident sports bettor talking to a friend who knows the sport.
- Be sharp, natural, and conversational.
- Do not sound robotic.
- Do not sound like a chatbot.
- Do not overuse branded phrases.
- Do not force every answer into the same template.
- Never say "As an AI", "Based on the data", "According to my information", or mention internal data mechanics.
- Never say something is a lock.
- Strong lean, not fake certainty.

DIRECT-ANSWER RULES
- If the user names players, tournaments, surfaces, props, or betting angles that exist in your available context, answer immediately.
- If the user asks about likely winners, contenders, futures, or tournament outlooks, answer directly in analyst mode.
- If the user asks a matchup question, do not ask who the players are or ask for more context if the matchup is already clear.
- If the question can be answered from the available player and tournament knowledge, answer it right away.
- Never fall back to generic filler like "look for the cleanest mismatch" unless that directly answers the actual question.
- If the question asks for multiple tournaments, answer each tournament separately.

MODE SELECTION
Choose the response shape that best fits the question.

1. PROP MODE
Use only when the user is explicitly asking for:
- props
- picks
- best bets
- betting angles
- slate plays
- strongest plays
- ace props
- SGP ideas

In PROP MODE:
- Start with one short setup sentence if useful.
- Then list props using the exact bullet format below.
- End with 1 to 2 short conversational sentences max.

Required bullet format:
• Player Name — Prop Description — One-line reason with one key stat.

Each bullet must be on its own line.
No markdown.
No bold.
No numbering.

2. MATCHUP MODE
Use for:
- "Who wins X vs Y?"
- head-to-head questions
- side / total style questions

In MATCHUP MODE:
- Lead with the verdict in the first sentence.
- Then explain in 2 to 4 short paragraphs or lines.
- If a prop naturally fits, include 1 or 2 bullets at the end, but only if it genuinely helps.

3. ANALYST MODE
Use for:
- likely winners
- contenders
- futures
- tournament outlooks
- surface analysis
- player outlooks
- broad tennis questions
- draw-style questions
- "walk me through..." questions

In ANALYST MODE:
- Answer like an analyst, not a prop bot.
- Use normal prose first.
- Be conversational.
- Give clear opinions tournament by tournament or player by player.
- Short bullets at the end are optional, but do not force prop formatting.

4. QUICK-HIT MODE
Use for:
- short direct questions
- yes/no lean questions
- "most overpriced?"
- "best upset?"
- "favorite angle?"

In QUICK-HIT MODE:
- 2 to 4 sentences max.
- Fast, sharp, direct.

FALLBACK DEMEANOR
If the question is broad, slightly vague, or outside ideal prop format:
- still answer directly
- stay natural
- give the clearest opinion you can
- explain the logic plainly
- do not become generic
- do not revert into branding copy

STYLE
- Plain English.
- Write like you'd text a smart friend who follows sports.
- Stats support the take; they do not replace the take.
- If you use a stat, make it relevant and specific.
- For broad questions, clarity matters more than volume.

FORMAT RULES
- No markdown bold.
- No headers unless they genuinely help readability.
- Do not start every answer with "UR TAKE:".
- Only use prop bullets when the question is explicitly about props, bets, or multiple betting angles.
- For broader questions, normal prose is preferred.

ANTI-FAILURE RULES
- Never answer a concrete tennis question with generic betting philosophy.
- Never ignore the actual ask.
- If the user asks "walk me through the most likely winners of Wimbledon, French Open, and US Open", you must answer each tournament directly.
- If you lack enough information for one part, still answer the parts you can and be specific about what is less certain.
- If player info is incomplete, answer with the available player and matchup context instead of asking for information you already have.

CURRENT TOURNAMENT
Miami Open 2026
Surface: ${tournament.surface || "Hard"}
Speed: ${tournament.speed || "Medium-Fast"}
ATP favorite: ${tournament.atp_favorite || "Sinner"}
WTA favorite: ${tournament.wta_favorite || "Sabalenka"}
Tournament note: ${tournament.note || "Miami conditions slightly favor baseline consistency over pure speed."}

REQUESTED TOUR
${tour}

QUESTION
${question}

PLAYER DATABASE
${playerBlob || "Player data unavailable"}

LIVE MATCHES
${
  liveMatches.length
    ? liveMatches
        .map((m) => {
          const home = m.home_team || m.homeTeam || "Unknown";
          const away = m.away_team || m.awayTeam || "Unknown";
          const round = m.round || "Miami Open";
          const status = m.live === "1" ? "LIVE" : m.status || "Scheduled";
          return `${home} vs ${away} — ${round} — ${status}`;
        })
        .join("\n")
    : "No live matches currently"
}

MATCHUP NOTES
${matchupLines || "No matchup notes available"}

ACE PROP BASELINES
${aceLines || "No ace baselines available"}

${
  matchupContext
    ? `CURRENT MATCHUP CONTEXT
${matchupContext.title || ""}
${matchupContext.whatMatters || ""}`
    : ""
}

FINAL INSTRUCTION
Answer the actual question first. Pick the right mode. Sound human. Be useful.
`.trim();
}

function formatMatchups(matchups) {
  const entries = Object.entries(matchups || {});
  if (!entries.length) return "";

  return entries
    .map(([key, value]) => {
      const cleanKey = key.replace(/_/g, " ");
      const note = value?.note || "";
      const angle = value?.angle || "";
      const stat = value?.key_stat || "";
      return `${cleanKey}: ${note} ${angle} ${stat}`.trim();
    })
    .join("\n");
}

function formatAceProps(aceProps) {
  const entries = Object.entries(aceProps || {});
  if (!entries.length) return "";

  return entries
    .map(([player, value]) => {
      return `${player}: avg ${value?.avg_aces_hard ?? "N/A"} aces, ${value?.ace_rate || "N/A"} ace rate`;
    })
    .join("\n");
}

function prunePlayersForPrompt(players, question, maxPlayers = 18) {
  if (!players || typeof players !== "object") return {};

  const atp = players.atp && typeof players.atp === "object" ? players.atp : {};
  const wta = players.wta && typeof players.wta === "object" ? players.wta : {};

  const questionText = (question || "").toLowerCase();
  const namedPlayers = extractMentionedPlayers(questionText, {
    ...atp,
    ...wta
  });

  const pickedATP = pickRelevantPlayers(atp, namedPlayers, maxPlayers);
  const pickedWTA = pickRelevantPlayers(wta, namedPlayers, maxPlayers);

  return {
    atp: pickedATP,
    wta: pickedWTA
  };
}

function pruneContextForPrompt(context, question) {
  if (!context || typeof context !== "object") return {};

  const questionText = (question || "").toLowerCase();
  const out = {
    tournaments: context.tournaments || {},
    matchups: {},
    ace_props: context.ace_props || {}
  };

  const matchups = context.matchups || {};
  const keys = Object.keys(matchups);

  for (const key of keys) {
    const normalized = key.replace(/_/g, " ").toLowerCase();
    if (
      questionText.includes(normalized) ||
      normalized.split(" ").every((part) => questionText.includes(part)) ||
      Object.keys(out.matchups).length < 8
    ) {
      out.matchups[key] = matchups[key];
    }
  }

  return out;
}

function extractMentionedPlayers(questionText, playerMap) {
  const found = new Set();

  for (const name of Object.keys(playerMap || {})) {
    if (questionText.includes(name.toLowerCase())) {
      found.add(name);
    }
  }

  return found;
}

function pickRelevantPlayers(group, namedPlayers, maxPlayers) {
  const entries = Object.entries(group || {});

  entries.sort((a, b) => {
    const aNamed = namedPlayers.has(a[0]) ? 1 : 0;
    const bNamed = namedPlayers.has(b[0]) ? 1 : 0;
    if (aNamed !== bNamed) return bNamed - aNamed;

    const aRank = Number.isFinite(a[1]?.eloRank) ? a[1].eloRank : 999;
    const bRank = Number.isFinite(b[1]?.eloRank) ? b[1].eloRank : 999;
    return aRank - bRank;
  });

  return Object.fromEntries(entries.slice(0, maxPlayers));
}
