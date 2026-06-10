/** Early-session UX: first answer + one follow-up — hide retention/dashboard chrome. */

export function countUrUserTurns(msgs) {
  if (!Array.isArray(msgs)) return 0;
  return msgs.filter((m) => m && m.role === "user").length;
}

/** True while thread is in the first one or two user questions (subscription trial window). */
export function isUrFocusSession(msgs) {
  const turns = countUrUserTurns(msgs);
  return turns >= 1 && turns <= 2;
}

/** Index of the user message that preceded AI message at `msgIndex`. */
export function urUserTurnNumberAtAiIndex(msgs, msgIndex) {
  if (!Array.isArray(msgs) || msgIndex < 0) return 0;
  return msgs.slice(0, msgIndex + 1).filter((m) => m && m.role === "user").length;
}

/** First completed AI reply in thread (not loading). */
export function isUrFirstAnswerRow(msgs, msgIndex, message) {
  if (!message || message.role !== "ai" || message.loading) return false;
  return urUserTurnNumberAtAiIndex(msgs, msgIndex) === 1;
}
