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
    .filter(block => block.type === "text" && block.text)
    .map(block => block.text)
    .join("\n");
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
    return res.status(405).json({ error: "Method not allowed", response: "Only POST is supported." });
  }

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  // Hardcoded working model instead of process.env.ANTHROPIC_MODEL
  const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({
      error: "Missing ANTHROPIC_API_KEY",
      response: "Backend is missing ANTHROPIC_API_KEY in Vercel Production.",
    });
  }

  const { question } = req.body || {};

  if (!question || !String(question).trim()) {
    return res.status(400).json({ error: "Missing question", response: "No question was provided." });
  }

  // Simple system prompt for testing
  const systemPrompt = `You are Under Review -- a sharp sports betting intelligence tool.

IDENTITY: Lead with the take. Never hedge. Never open with a limitation. Plain text only.

FORMATTING: NEVER use markdown. Plain text only.

RESPONSE FORMAT:
One sharp opening sentence.

THE PLAY: [bet or lean]
FADE: [one line]
CONFIDENCE: [High/Medium/Speculative]
TIMING: [one line]`;

  const messages = [{ role: "user", content: question }];

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

    let text = extractAnthropicText(result.data);

    if (!text) {
      return res.status(500).json({
        error: "Empty AI response",
        response: "AI returned an empty response. Try again.",
      });
    }

    return res.status(200).json({
      response: text,
      sport: "generic",
    });
  } catch (err) {
    console.error("UR TAKE error:", err);
    return res.status(500).json({
      error: "Request failed",
      response: `Request failed: ${err?.message || "Unknown server error"}`,
    });
  }
}
