/**
 * Repo-static PGA strokes-gained (tier-3 fallback after BDL live stats).
 */
import { PGA_PLAYERS } from "../src/components/data/golf/players.js";

/**
 * @param {string} playerName
 * @returns {{ sg_total, sg_app, sg_putt }|null}
 */
export function getStaticPlayerSG(playerName) {
  const raw = String(playerName || "").trim();
  if (!raw) return null;
  if (PGA_PLAYERS[raw]) {
    const sg = PGA_PLAYERS[raw]?.sg;
    if (!sg || typeof sg !== "object") return null;
    return {
      sg_total: sg.total ?? null,
      sg_app: sg.app ?? null,
      sg_putt: sg.putt ?? null,
    };
  }
  const rl = raw.toLowerCase();
  for (const [canonical, row] of Object.entries(PGA_PLAYERS)) {
    if (canonical.toLowerCase() === rl) {
      const sg = row?.sg;
      if (!sg || typeof sg !== "object") return null;
      return {
        sg_total: sg.total ?? null,
        sg_app: sg.app ?? null,
        sg_putt: sg.putt ?? null,
      };
    }
  }
  const parts = raw.split(/\s+/).filter(Boolean);
  const last = parts.length ? parts[parts.length - 1].toLowerCase() : "";
  if (!last || last.length < 3) return null;
  for (const [canonical, row] of Object.entries(PGA_PLAYERS)) {
    const ck = canonical.split(/\s+/).pop()?.toLowerCase() || "";
    if (ck === last) {
      const sg = row?.sg;
      if (!sg || typeof sg !== "object") return null;
      return {
        sg_total: sg.total ?? null,
        sg_app: sg.app ?? null,
        sg_putt: sg.putt ?? null,
      };
    }
  }
  return null;
}
