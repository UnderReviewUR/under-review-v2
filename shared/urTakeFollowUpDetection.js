/**
 * UR Take multi-turn follow-up detection — shared client recap marker + API gate.
 * The recap prefix is machine-generated only (buildContextualQuestion); never treat
 * bare "follow-up" phrasing in user text as a thread continuation.
 */

/** Client-only delimiter between recap and the live user turn (buildContextualQuestion). */
export const UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER = "\n\nFollow-up:\n";

const CLIENT_RECAP_USER_LINE_RE = /(?:^|\n)User:\s+/;

/** Latest user utterance for follow-up gates — avoids importing urTakeSportRouting (cycle). */
function latestUserTurnForFollowUpGate(question) {
  const q = String(question || "").trim();
  const idx = q.lastIndexOf(UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER);
  if (idx >= 0) {
    return q.slice(idx + UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER.length).trim();
  }
  return q;
}

/**
 * True when `question` contains the client recap block before the follow-up marker.
 * Requires at least one `User: …` line — blocks natural "Follow-up:" user prose.
 * @param {string} question
 */
export function hasUrTakeClientRecapBeforeFollowUp(question) {
  const q = String(question || "");
  const idx = q.lastIndexOf(UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER);
  if (idx < 0) return false;
  return CLIENT_RECAP_USER_LINE_RE.test(q.slice(0, idx));
}

/**
 * Machine-generated contextual follow-up (client prepended prior user turns).
 * @param {string} question
 */
export function isUrTakeContextualFollowUpQuestion(question) {
  const q = String(question || "");
  if (!q.includes(UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER)) return false;
  return hasUrTakeClientRecapBeforeFollowUp(q);
}

/**
 * Count `User: …` recap lines before the follow-up marker (0 when not contextual).
 * @param {string} question
 */
export function countUrTakeClientRecapUserLines(question) {
  const q = String(question || "");
  const idx = q.lastIndexOf(UR_TAKE_CONTEXTUAL_FOLLOW_UP_MARKER);
  if (idx < 0) return 0;
  const head = q.slice(0, idx);
  return (head.match(/^User:\s+/gm) || []).length;
}

/**
 * @param {object[]} history
 */
function historyUserTurnCount(history) {
  if (!Array.isArray(history)) return 0;
  return history.filter((t) => {
    const role = String(t?.role || "").toLowerCase();
    return role === "user";
  }).length;
}

/**
 * Resolve whether this request continues an in-thread conversation.
 * @param {string} question
 * @param {object[]} [normalizedHistory]
 * @returns {{ isFollowUp: boolean, reason: string }}
 */
export function resolveUrTakeConversationFollowUp(question, normalizedHistory = []) {
  const q = String(question || "");
  const history = Array.isArray(normalizedHistory) ? normalizedHistory : [];

  if (history.length > 1) {
    return { isFollowUp: true, reason: "history_length" };
  }

  if (isUrTakeContextualFollowUpQuestion(q)) {
    return { isFollowUp: true, reason: "contextual_recap" };
  }

  if (history.length === 1) {
    const sole = history[0];
    const role = String(sole?.role || "").toLowerCase();
    const recapUsers = countUrTakeClientRecapUserLines(q);

    if (recapUsers > 0 && recapUsers > historyUserTurnCount(history)) {
      return { isFollowUp: true, reason: "thin_history_recap_overflow" };
    }

    if (role === "user") {
      const latest = latestUserTurnForFollowUpGate(q).trim();
      const prior = String(sole.content || sole.text || "").trim();
      if (latest && prior && latest.toLowerCase() !== prior.toLowerCase()) {
        return { isFollowUp: true, reason: "thin_history_routing_mismatch" };
      }
    }

    if (role === "assistant" || role === "ai") {
      const latest = latestUserTurnForFollowUpGate(q).trim();
      const assistantBlob = String(sole.content || sole.text || "").trim();
      if (latest && assistantBlob && !assistantBlob.toLowerCase().includes(latest.toLowerCase().slice(0, 48))) {
        return { isFollowUp: true, reason: "thin_history_assistant_only" };
      }
    }
  }

  if (history.length === 0 && countUrTakeClientRecapUserLines(q) > 0) {
    return { isFollowUp: true, reason: "empty_history_recap" };
  }

  return { isFollowUp: false, reason: "opening_turn" };
}

/**
 * @param {string} question
 * @param {object[]} [normalizedHistory]
 */
export function isUrTakeConversationFollowUp(question, normalizedHistory = []) {
  return resolveUrTakeConversationFollowUp(question, normalizedHistory).isFollowUp;
}
