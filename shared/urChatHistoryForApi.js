/**
 * UR Take chat history payload — shared field slice for client → API.
 */

import { stripUrTakeDeadEndCopy } from "./urTakeSportRouting.js";
import {
  isWcNumberedPlayerPropLean,
  WC_PLAYER_PROP_LIST_LEAN_MAX_CHARS,
  LEAN_MAX_CHARS,
} from "./urTakeLean.js";

/**
 * @param {string} input
 */
export function sanitizeChatHistoryContent(input) {
  let s = String(input || "").trim();
  if (!s) return "";
  s = s.replace(/^This is a .*? confidence take\.[^\n]*\n?/i, "");
  return stripUrTakeDeadEndCopy(s);
}

/**
 * Prose for model history — prefer bubble text, fall back to structured call/lean/why.
 * @param {object | null | undefined} message
 */
export function chatHistoryContentFromMessage(message) {
  const direct = sanitizeChatHistoryContent(message?.text ?? message?.content ?? "");
  if (direct) return direct.slice(0, 3500);

  const s = message?.structured;
  if (!s || typeof s !== "object") return "";

  const fallback = sanitizeChatHistoryContent(
    [s.call, s.lean, s.whyNow].filter((x) => x != null && String(x).trim()).join(" — "),
  );
  return fallback.slice(0, 3500);
}

/**
 * @param {object | null | undefined} structured
 */
/** Strip verbose card sections — keep lean line for Anthropic history. */
function stripAssistantCardBoilerplate(prose) {
  let s = String(prose || "").trim();
  if (!s) return "";
  s = s.replace(/\bTHE PLAY\b[\s\S]*?(?=\n\n|\bCONFIDENCE\b|$)/gi, "").trim();
  s = s.replace(
    /\b(WHY MISPRICED|MARKET MISTAKE|WATCH FOR|DEEP BREAKDOWN|BREAKDOWN)\b[\s\S]*?(?=\n\n[A-Z][A-Z ]{2,}\n|$)/gi,
    "",
  ).trim();
  return s;
}

/**
 * Slim turn text for Anthropic `messages` — full bubble prose can exceed 3k chars/turn
 * and multiply input tokens on follow-ups; gate/QA still use full normalizeIncoming rows.
 * @param {{ role?: string, content?: string, structured?: object }} row
 */
export function compactHistoryContentForAnthropic(row) {
  const role = row?.role;
  if (role === "user") {
    return String(row.content || "").trim().slice(0, 1000);
  }
  if (role === "assistant") {
    const s = row?.structured;
    if (s && typeof s === "object") {
      const parts = [
        s.lean != null ? String(s.lean).slice(0, 160) : "",
        s.call != null ? String(s.call).slice(0, 280) : "",
        s.whyNow != null ? String(s.whyNow).slice(0, 240) : "",
      ].filter((x) => String(x).trim());
      if (parts.length) return parts.join(" · ").slice(0, 520);
    }
    const prose = stripAssistantCardBoilerplate(row.content);
    const leanMatch = prose.match(/\bLean:\s*[^\n]+/i);
    if (leanMatch) return leanMatch[0].slice(0, 520);
    return prose.slice(0, 480);
  }
  return String(row.content || "").trim().slice(0, 1000);
}

export function sliceChatHistoryStructured(structured) {
  if (!structured || typeof structured !== "object") return undefined;

  const s = structured;
  const leanRaw = s.lean != null ? String(s.lean) : "";
  const leanCap = isWcNumberedPlayerPropLean(leanRaw)
    ? WC_PLAYER_PROP_LIST_LEAN_MAX_CHARS
    : LEAN_MAX_CHARS;
  const row = {
    call: s.call != null ? String(s.call).slice(0, 400) : undefined,
    lean: leanRaw ? leanRaw.slice(0, leanCap) : undefined,
    whyNow: s.whyNow != null ? String(s.whyNow).slice(0, 600) : undefined,
    edge: s.edge != null ? String(s.edge).slice(0, 600) : undefined,
    callType: s.callType != null ? String(s.callType).slice(0, 64) : undefined,
    confidence: s.confidence != null ? String(s.confidence).slice(0, 32) : undefined,
    groupLetter: s.groupLetter != null ? String(s.groupLetter).slice(0, 2) : undefined,
    runnerUpGroupLetter:
      s.runnerUpGroupLetter != null ? String(s.runnerUpGroupLetter).slice(0, 2) : undefined,
    runnerUpTeamAbbr:
      s.runnerUpTeamAbbr != null ? String(s.runnerUpTeamAbbr).slice(0, 8) : undefined,
    primaryMispriceGroupLetter:
      s.primaryMispriceGroupLetter != null
        ? String(s.primaryMispriceGroupLetter).slice(0, 2)
        : undefined,
    fixtureHome: s.fixtureHome != null ? String(s.fixtureHome).slice(0, 8) : undefined,
    fixtureAway: s.fixtureAway != null ? String(s.fixtureAway).slice(0, 8) : undefined,
    wcEventId: s.wcEventId != null ? String(s.wcEventId).slice(0, 16) : undefined,
  };

  const pruned = Object.fromEntries(
    Object.entries(row).filter(([, v]) => v !== undefined && String(v).trim() !== ""),
  );
  return Object.keys(pruned).length ? pruned : undefined;
}

/**
 * @param {object[]} msgs
 * @param {{ maxMessages?: number }} [opts]
 */
export function buildChatHistoryForApi(msgs, { maxMessages = 6 } = {}) {
  if (!Array.isArray(msgs)) return [];
  const cleaned = [];
  for (const m of msgs) {
    if (!m || m.loading) continue;
    const role = m.role === "ai" ? "assistant" : m.role === "user" ? "user" : null;
    const content = chatHistoryContentFromMessage(m);
    if (!role || !content || /^ANALYZING/i.test(content)) continue;

    const row = { role, content };
    const sport = String(m.sport || "").trim().toLowerCase();
    if (sport) row.sport = sport;

    const structured = sliceChatHistoryStructured(m.structured);
    if (structured) row.structured = structured;

    if (m.wcMatchTeams?.home && m.wcMatchTeams?.away) {
      row.wcMatchTeams = {
        home: String(m.wcMatchTeams.home).trim(),
        away: String(m.wcMatchTeams.away).trim(),
      };
    }
    if (m.wcEventId != null && String(m.wcEventId).trim()) {
      row.wcEventId = String(m.wcEventId).trim();
    } else if (structured?.wcEventId != null && String(structured.wcEventId).trim()) {
      row.wcEventId = String(structured.wcEventId).trim();
    }

    cleaned.push(row);
  }
  return cleaned.slice(-maxMessages);
}
