/**
 * Fixture-anchored UR Take follow-ups — cite the take, contrarian / build / stress-test.
 * Chips and next lines are projections of WcTurnArtifact (no NL re-parsing).
 */

import { extractWcTurnArtifact, extractWcTurnArtifactsFromHistory } from "./wcTurnArtifact.js";
import {
  projectWcFollowUpChips,
  projectWcNextLine,
} from "./wcTurnArtifactProjections.js";

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @returns {string | null}
 */
export function buildWcTakeAwareNextLine(message, userQuestion = "") {
  const structured =
    message?.structured && typeof message.structured === "object" ? message.structured : null;
  if (!structured) return null;
  void userQuestion;
  const artifact = extractWcTurnArtifact(structured);
  return artifact ? projectWcNextLine(artifact) : null;
}

/**
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @param {object[]} [history]
 * @returns {string[]}
 */
export function buildWcTakeAwareFollowUpChips(message, userQuestion = "", history = []) {
  const structured =
    message?.structured && typeof message.structured === "object" ? message.structured : null;
  if (!structured) return [];
  void userQuestion;
  const artifact = extractWcTurnArtifact(structured);
  if (!artifact) return [];
  const prior = extractWcTurnArtifactsFromHistory(history);
  return projectWcFollowUpChips(artifact, prior);
}

/**
 * @param {string | null | undefined} baseNext
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 */
export function resolveWcTakeAwareNextLine(baseNext, message, userQuestion = "") {
  return buildWcTakeAwareNextLine(message, userQuestion) || baseNext || null;
}

/**
 * @param {string[]} baseChips
 * @param {object | null | undefined} message
 * @param {string} [userQuestion]
 * @param {object[]} [history]
 */
export function prependWcTakeAwareFollowUpChips(baseChips, message, userQuestion = "", history = []) {
  const aware = buildWcTakeAwareFollowUpChips(message, userQuestion, history);
  if (!aware.length) return baseChips;
  const out = [];
  const seen = new Set();
  for (const chip of [...aware, ...(baseChips || [])]) {
    const s = String(chip || "").trim();
    if (!s) continue;
    const k = s.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
    if (out.length >= 3) break;
  }
  return out;
}
