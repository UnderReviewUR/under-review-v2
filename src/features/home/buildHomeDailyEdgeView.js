import { formatWcKickoffDisplay } from "../../../shared/wcKickoffDisplay.js";
import { isWcHomePromoWindow } from "../../../shared/wc2026Constants.js";
import {
  isWcLiveMatchStatus,
  pickWcFeaturedMatch,
} from "../../../shared/wcFeaturedMatch.js";

function wcMatchupLabel(match) {
  const away = String(match?.awayTeam || "").trim() || "Away";
  const home = String(match?.homeTeam || "").trim() || "Home";
  return `${away} vs ${home}`;
}

function liveMinute(match) {
  const status = String(match?.status || "").toLowerCase();
  if (status === "ht") return "HT";
  if (match?.minute != null && String(match.minute).trim() !== "") {
    return `${match.minute}'`;
  }
  return "LIVE";
}

/**
 * Merge KV daily-take copy with the client WC slate so home pivots live → next up.
 * @param {Record<string, unknown> | null | undefined} dailyPreview
 * @param {Array<Record<string, unknown>> | null | undefined} wcMatches
 * @param {number} [nowMs]
 */
export function buildHomeDailyEdgeView(dailyPreview, wcMatches, nowMs = Date.now()) {
  if (!dailyPreview?.headline) return null;

  if (!isWcHomePromoWindow(nowMs)) {
    return { ...dailyPreview, synced: true };
  }

  const featured = pickWcFeaturedMatch({ matches: wcMatches, nowMs });
  if (!featured?.match) {
    return { ...dailyPreview, synced: true };
  }

  const match = featured.match;
  const matchupLabel = wcMatchupLabel(match);
  const eventId = match?.id != null ? String(match.id) : "";
  const live = featured.kind === "live" || isWcLiveMatchStatus(match.status);
  const previewId =
    dailyPreview.wcEventId != null ? String(dailyPreview.wcEventId) : "";
  const previewLabel = String(dailyPreview.matchupLabel || "").trim();
  const textSynced =
    Boolean(previewId && eventId && previewId === eventId) ||
    Boolean(previewLabel && previewLabel === matchupLabel);

  const kicker =
    live ? "Live now" : featured.kicker === "Tonight" ? "Tonight" : "Up next";

  let scoreLine = null;
  if (live && match.homeScore != null && match.awayScore != null) {
    scoreLine = `${match.awayScore}–${match.homeScore} · ${liveMinute(match)}`;
  } else if (!live) {
    scoreLine = formatWcKickoffDisplay(match) || null;
  }

  const fallbackHeadline = live
    ? `${matchupLabel} is live — the sharpest angle shifts with score and clock.`
    : `${matchupLabel} — pre-match lean with the line before kickoff.`;
  const fallbackClosing = live
    ? "Unpack for the best live play right now."
    : "Unpack for the sharpest pre-match lean.";

  return {
    ...dailyPreview,
    matchupLabel,
    wcEventId: eventId || dailyPreview.wcEventId || null,
    kicker,
    scoreLine,
    headline: textSynced ? dailyPreview.headline : fallbackHeadline,
    bodyChunk: textSynced ? dailyPreview.bodyChunk || null : null,
    closing: textSynced ? dailyPreview.closing || fallbackClosing : fallbackClosing,
    question:
      textSynced && dailyPreview.question
        ? dailyPreview.question
        : live
          ? `Best live angle in ${matchupLabel} right now — one direct play.`
          : `Who wins ${matchupLabel}? Give me the sharpest pre-match lean with the line.`,
    sportHint: dailyPreview.sportHint || "worldcup",
    synced: textSynced,
    featuredKind: featured.kind,
  };
}
