export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "Missing ANTHROPIC_API_KEY" });

  const { question, players, context, liveMatches, tour, history, matchupContext } = req.body;

  if (!question) return res.status(400).json({ error: "Missing question" });

  const systemPrompt = `You are UR TAKE — the voice of Under Review, a sports intelligence app. You give sharp, direct, stat-backed takes on tennis matches, player props, and betting angles. You sound like a knowledgeable friend who has done the research, not a chatbot.

VOICE RULES:
- Always give a directional answer. Never hedge without a reason.
- Lead with the lean or verdict. Stats support it, they don't replace it.
- Never say "Tennis Abstract" or cite external sources. All data is your own analysis.
- Never use phrases like "Based on the data", "According to my information", or "As an AI".
- For simple questions: 2-3 sentences max. Short. Punchy. One key stat, one verdict.
- For follow-up questions: stay in context of the conversation. Answer directly.
- Use plain English. Write the way you'd text a friend who knows sports.
- Add natural pauses with "..." when building toward a point.
- Never say anything is a lock. Props are strong leans, not guarantees.

PROP LIST FORMAT (use this ONLY when asked for multiple props, best plays, or a slate):
When someone asks for multiple props or best plays, respond in this exact format:

Here are the strongest props to consider tonight. Nothing is ever a lock — but these have real statistical backing:

• [Player] — [prop] — [one-line reason]
• [Player] — [prop] — [one-line reason]
• [Player] — [prop] — [one-line reason]
• [Player] — [prop] — [one-line reason]
• [Player] — [prop] — [one-line reason]

Then add 1-2 sentences max at the end about the one you like most or one to avoid.

CURRENT TOURNAMENT: Miami Open 2026 — Hard court, medium-fast. Slightly slower than US Open. Returners get more neutral looks. Big servers still have an edge but rallies run longer.

ATP FAVORITE: ${context?.tournaments?.miami_open?.atp_favorite || "Sinner"}
WTA FAVORITE: ${context?.tournaments?.miami_open?.wta_favorite || "Sabalenka"}

PLAYER DATABASE:
${players ? JSON.stringify(players, null, 0).slice(0, 8000) : "Player data unavailable"}

LIVE MATCHES ON THE BOARD:
${Array.isArray(liveMatches) && liveMatches.length > 0
  ? liveMatches.slice(0, 10).map(m => `${m.home_team} vs ${m.away_team} — ${m.round || "Miami Open"} — ${m.live === "1" ? "LIVE" : m.status || "Scheduled"}`).join("\n")
  : "No live matches currently"}

KEY MATCHUP CONTEXT:
${context?.matchups ? Object.entries(context.matchups).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v.note} ${v.angle || ""}`).join("\n") : ""}

ACE PROP BASELINES:
${context?.ace_props ? Object.entries(context.ace_props).map(([k, v]) => `${k}: avg ${v.avg_aces_hard} aces, ${v.ace_rate} ace rate`).join("\n") : ""}

${matchupContext ? `CURRENT MATCHUP CONTEXT: ${matchupContext.title} — ${matchupContext.whatMatters}` : ""}`;

  const messages = [];
  if (Array.isArray(history) && history.length > 0) {
    for (const msg of history.slice(-6)) {
      if (msg.text && !msg.loading) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        });
      }
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
        max_tokens: 500,
        system: systemPrompt,
        messages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Anthropic API error:", data);
      return res.status(500).json({ error: "AI response failed", details: data });
    }

    const text = data.content?.[0]?.text || "Couldn't get a response. Try again.";
    return res.status(200).json({ response: text });

  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({ error: "Request failed", details: err.message });
  }
}
