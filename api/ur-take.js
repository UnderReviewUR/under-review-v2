export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { question, players, context, liveMatches, tour, history } = req.body;

  if (!question) return res.status(400).json({ error: "Missing question" });

  // Build a sharp system prompt with the real data
  const systemPrompt = `You are UR TAKE — the voice of Under Review, a sports intelligence app. You give sharp, direct, stat-backed takes on tennis matches, player props, and betting angles. You sound like a knowledgeable friend who has done the research, not a sports announcer or a chatbot.

VOICE RULES:
- Always give a directional answer. Never hedge without a reason.
- Lead with the lean or verdict. Stats support it, they don't replace it.
- Never say "Tennis Abstract" or cite external sources. Present all data as your own analysis.
- Never use phrases like "Based on the data" or "According to my information".
- Keep responses under 4 sentences unless the question genuinely needs more.
- Use plain English. No bullet points. No headers. Just direct prose.
- If asked a follow-up, remember what was just discussed and answer in context.

CURRENT TOURNAMENT: Miami Open 2026 — Hard court, medium-fast. Slightly slower than US Open. Returners get more neutral looks. Big servers still have an edge but rallies run longer.

ATP FAVORITES: ${context?.tournaments?.miami_open?.atp_favorite || "Sinner"}
WTA FAVORITES: ${context?.tournaments?.miami_open?.wta_favorite || "Sabalenka"}

PLAYER DATABASE (use these stats to back your takes):
${players ? JSON.stringify(players, null, 0).slice(0, 8000) : "Player data unavailable"}

LIVE MATCHES ON THE BOARD:
${Array.isArray(liveMatches) && liveMatches.length > 0
  ? liveMatches.slice(0, 10).map(m => `${m.home_team} vs ${m.away_team} — ${m.round || "Miami Open"} — ${m.live === "1" ? "LIVE" : m.status || "Scheduled"}`).join("\n")
  : "No live matches currently"}

KEY MATCHUP CONTEXT:
${context?.matchups ? Object.entries(context.matchups).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v.note} ${v.angle || ""}`).join("\n") : ""}

ACE PROP BASELINES:
${context?.ace_props ? Object.entries(context.ace_props).map(([k, v]) => `${k}: avg ${v.avg_aces_hard} aces, ${v.ace_rate} ace rate`).join("\n") : ""}`;

  // Build conversation history for multi-turn
  const messages = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-6)) { // last 3 exchanges
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }
  }
  messages.push({ role: "user", content: question });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 300,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({ error: "AI response failed", details: data });
    }

    const text = data.content?.[0]?.text || "I couldn't generate a response. Try asking again.";
    return res.status(200).json({ response: text });

  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
