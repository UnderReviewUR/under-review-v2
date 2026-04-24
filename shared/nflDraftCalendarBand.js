/**
 * Client-safe NFL Draft calendar labels (must match api/data/nfl-draft-2026.js dates).
 * Used for Home / NFL draft promo copy — ET calendar day.
 */

export const NFL_DRAFT_2026_ET_DATES = Object.freeze({
  round1: "2026-04-23",
  rounds2to3: "2026-04-24",
  rounds4to7: "2026-04-25",
});

function readEventDates(meta) {
  const d = meta?.event?.dates;
  if (d && typeof d === "object") {
    return {
      round1: String(d.round1 || NFL_DRAFT_2026_ET_DATES.round1),
      rounds2to3: String(d.rounds2to3 || NFL_DRAFT_2026_ET_DATES.rounds2to3),
      rounds4to7: String(d.rounds4to7 || NFL_DRAFT_2026_ET_DATES.rounds4to7),
    };
  }
  return { ...NFL_DRAFT_2026_ET_DATES };
}

/** YYYY-MM-DD in America/New_York for the instant `when`. */
export function etCalendarYmd(when = new Date()) {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = Object.fromEntries(
    f.formatToParts(when).filter((p) => p.type !== "literal").map((p) => [p.type, p.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * @param {number} [nowMs]
 * @param {object|null} [nflDraftMeta] client bundle draft meta (phase, event.dates)
 * @returns {{ band: string, headline: string, roundsLabel: string, promptHint: string }}
 */
export function resolveNflDraftPromoBand(nowMs = Date.now(), nflDraftMeta = null) {
  const dates = readEventDates(nflDraftMeta);
  const ymd = etCalendarYmd(new Date(nowMs));
  const phase = String(nflDraftMeta?.phase || "").toLowerCase();

  if (ymd === dates.round1) {
    return {
      band: "round1",
      headline: "Round 1 — live board",
      roundsLabel: "Round 1 tonight",
      promptHint: "Anchor every take to verified Round 1 order and team needs — no invented picks.",
    };
  }
  if (ymd === dates.rounds2to3) {
    return {
      band: "rounds2_3",
      headline: "Rounds 2–3 — capital & fits",
      roundsLabel: "Rounds 2–3 today",
      promptHint: "Focus on Round 2–3 trade leverage, positional runs, and team-specific fits.",
    };
  }
  if (ymd === dates.rounds4to7) {
    return {
      band: "rounds4_7",
      headline: "Rounds 4–7 — depth & specials",
      roundsLabel: "Rounds 4–7 today",
      promptHint: "Focus on Day 3 value pockets, comp picks, and specialty roles (ST, swing OL).",
    };
  }

  if (phase === "during_draft") {
    return {
      band: "during_unknown_day",
      headline: "NFL Draft — live window",
      roundsLabel: "Draft in progress",
      promptHint: "Stay inside the verified bundle — label simulations clearly.",
    };
  }

  return {
    band: "outside",
    headline: "NFL Draft board",
    roundsLabel: "Pre-draft / off-calendar",
    promptHint: "Use verified slot order and prospect pool only.",
  };
}
