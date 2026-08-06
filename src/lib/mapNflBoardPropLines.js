/**
 * Map /api/nfl-board propLines → NflPropGuideSection guide rows.
 * @param {Array<Record<string, unknown>>} propLines
 * @param {number} [limit]
 */
export function mapNflBoardPropLinesToGuide(propLines, limit = 24) {
  const rows = Array.isArray(propLines) ? propLines : [];
  return rows.slice(0, limit).map((p) => {
    const overOdds = p.overOdds != null ? Number(p.overOdds) : null;
    const underOdds = p.underOdds != null ? Number(p.underOdds) : null;
    const overDevig = p.overImpliedDevig != null ? Number(p.overImpliedDevig) : null;
    const underDevig = p.underImpliedDevig != null ? Number(p.underImpliedDevig) : null;
    let lean = p.book ? String(p.book) : "Market";
    let leanClass = "lean-neutral";
    if (overDevig != null && underDevig != null) {
      if (overDevig >= underDevig + 0.03) {
        lean = `OVER lean · ${(overDevig * 100).toFixed(0)}%`;
        leanClass = "lean-over";
      } else if (underDevig >= overDevig + 0.03) {
        lean = `UNDER lean · ${(underDevig * 100).toFixed(0)}%`;
        leanClass = "lean-under";
      } else {
        lean = `Coin-flip · O ${overOdds ?? "—"} / U ${underOdds ?? "—"}`;
      }
    } else if (overOdds != null || underOdds != null) {
      lean = `O ${overOdds ?? "—"} / U ${underOdds ?? "—"}`;
    }
    return {
      player: String(p.player || p.playerAbbr || "Player"),
      propType: String(p.prop || p.propRaw || "prop"),
      line: p.line != null ? p.line : "—",
      floor: "—",
      ceil: "—",
      lean,
      leanClass,
      game: p.game || null,
      overOdds,
      underOdds,
      book: p.book || null,
      live: true,
    };
  });
}

/**
 * Format tipoff for NFL board cards.
 * @param {number | null | undefined} tipoffMs
 */
export function formatNflBoardTipoff(tipoffMs) {
  if (tipoffMs == null || !Number.isFinite(Number(tipoffMs))) return "";
  try {
    return new Date(Number(tipoffMs)).toLocaleString("en-US", {
      timeZone: "America/New_York",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}
