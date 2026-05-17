import { formatAmericanOddsDisplay } from "../../shared/pgaChampionshipOddsLeaders.js";
import { buildStructuralEdgeChipModel } from "../../shared/urTakeSessionStructuralEdge.js";

/** @param {object[]} msgs @param {number} msgIndex */
export function msgsToSessionHistoryBefore(msgs, msgIndex) {
  if (!Array.isArray(msgs) || msgIndex <= 0) return [];
  return msgs.slice(0, msgIndex).flatMap((m) => {
    if (!m || m.loading) return [];
    const role = m.role === "ai" ? "assistant" : m.role === "user" ? "user" : null;
    if (!role) return [];
    const content = String(m.text ?? m.content ?? "").trim();
    if (!content) return [];
    const row = { role, content: content.slice(0, 3500) };
    const sport = String(m.sport || "").trim().toLowerCase();
    if (sport) row.sport = sport;
    if (m.structured && typeof m.structured === "object") {
      const s = m.structured;
      row.structured = {
        call: s.call != null ? String(s.call).slice(0, 400) : undefined,
        whyNow: s.whyNow != null ? String(s.whyNow).slice(0, 600) : undefined,
        edge: s.edge != null ? String(s.edge).slice(0, 600) : undefined,
        callType: s.callType != null ? String(s.callType).slice(0, 64) : undefined,
        confidence: s.confidence != null ? String(s.confidence).slice(0, 32) : undefined,
      };
    }
    return [row];
  });
}

/**
 * @param {object} opts
 * @param {object[]} opts.msgs
 * @param {number} opts.msgIndex
 * @param {string} [opts.sport]
 * @param {{ leaderboard?: object[], outrights?: object[] } | null} [opts.golfSessionBoard]
 */
export function resolveStructuralEdgeChipForMessage(opts) {
  const sport = String(opts.sport || "").trim().toLowerCase();
  if (sport !== "golf") return null;
  const board = opts.golfSessionBoard;
  if (!board) return null;

  const sessionHistory = msgsToSessionHistoryBefore(opts.msgs, opts.msgIndex);
  return buildStructuralEdgeChipModel({
    sessionHistory,
    sportHint: "golf",
    leaderboard: board.leaderboard,
    outrights: board.outrights,
    formatOdds: formatAmericanOddsDisplay,
  });
}
