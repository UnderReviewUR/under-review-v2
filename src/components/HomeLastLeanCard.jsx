import { useMemo } from "react";

import {
  formatLastLeanTimeAgo,
  readUrLastLean,
} from "../lib/urLastLean.js";
import { UPGRADE_LIMIT_HIT_HEADLINE } from "../lib/proUpgradeCopy.js";

const SPORT_LABEL_TO_HINT = {
  NBA: "nba",
  NFL: "nfl",
  MLB: "mlb",
  Tennis: "tennis",
  Golf: "golf",
  F1: "f1",
  "World Cup": "worldcup",
};

function sportHintFromLastLeanLabel(sport) {
  const key = String(sport || "").trim();
  return SPORT_LABEL_TO_HINT[key] || (key ? key.toLowerCase() : null);
}

/**
 * Free-tier return hook — shows the most recent lean on home (24h TTL).
 */
export default function HomeLastLeanCard({
  isUnlimited = false,
  freeUsedCount = 0,
  freeQuestionLimit = 2,
  lastLeanRevision = 0,
  onAskAgain,
  onOpenUpgrade,
}) {
  void lastLeanRevision;

  const record = useMemo(() => {
    if (isUnlimited) return null;
    return readUrLastLean();
  }, [isUnlimited, lastLeanRevision]);

  if (!record) return null;

  const freeExhausted = freeUsedCount >= freeQuestionLimit;
  const metaParts = [
    record.sport,
    record.matchup,
    formatLastLeanTimeAgo(record.ts),
  ].filter(Boolean);

  return (
    <section className="ur-home-last-lean" aria-labelledby="ur-home-last-lean-heading">
      <div id="ur-home-last-lean-heading" className="ur-home-last-lean-label">
        Your last lean
      </div>
      <p className="ur-home-last-lean-body">{record.lean}</p>
      {metaParts.length > 0 ? (
        <p className="ur-home-last-lean-meta">{metaParts.join(" · ")}</p>
      ) : null}
      {freeExhausted ? (
        <div className="ur-home-last-lean-upgrade">
          <p className="ur-home-last-lean-upgrade-text">{UPGRADE_LIMIT_HIT_HEADLINE}</p>
          <button type="button" className="ur-home-last-lean-upgrade-btn" onClick={onOpenUpgrade}>
            Upgrade to Pro →
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="ur-home-last-lean-cta"
          onClick={() =>
            onAskAgain?.(record.question, sportHintFromLastLeanLabel(record.sport))
          }
        >
          Ask again →
        </button>
      )}
    </section>
  );
}
