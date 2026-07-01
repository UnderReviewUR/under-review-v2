import { useMemo } from "react";

import GolfHomeStandingsCard from "./GolfHomeStandingsCard.jsx";
import HomeGolfUpcomingCard from "./HomeGolfUpcomingCard.jsx";
import HomeWcCompactCard from "./HomeWcCompactCard.jsx";
import { isWcHomePromoWindow } from "../../shared/wc2026Constants.js";
import {
  buildHomeWcPrimaryFixtures,
  resolveHomeSpotlightRightSlot,
} from "../features/home/buildHomeSpotlightSlots.js";

/**
 * Option B spotlight row — WC primary column + golf or WC fallback.
 */
export default function HomeSpotlightRow({
  wcMatches,
  golfData,
  golfLoading,
  goWorldCup,
  goWorldCupMatchesToday,
  askWorldCup,
  firePrompt,
  onOpenGolf,
}) {
  const nowMs = Date.now();
  const wcPromo = isWcHomePromoWindow(nowMs);

  const primaryFixtures = useMemo(
    () => buildHomeWcPrimaryFixtures(wcMatches, nowMs),
    [wcMatches],
  );

  const rightSlot = useMemo(
    () => resolveHomeSpotlightRightSlot(golfData, golfLoading, wcMatches, nowMs),
    [golfData, golfLoading, wcMatches],
  );

  const showRow =
    wcPromo && (primaryFixtures.length > 0 || rightSlot.kind !== "none");
  if (!showRow) return null;

  const openWcMatch = (match) => {
    const eventId = match?.id != null ? String(match.id) : "";
    const live = String(match?.status || "").toLowerCase();
    const matchSubTab = ["live", "ht", "1h", "2h"].includes(live) ? "live" : "today";
    if (eventId && goWorldCup) {
      goWorldCup({ mainTab: "matches", matchSubTab, highlightEventId: eventId });
    } else if (goWorldCupMatchesToday) {
      goWorldCupMatchesToday();
    } else if (goWorldCup) {
      goWorldCup();
    }
  };

  const askFixture = (prompt, match) => {
    const pin = match?.id != null ? { eventId: String(match.id), highlightEventId: String(match.id) } : {};
    if (askWorldCup) askWorldCup(prompt, pin);
    else firePrompt?.(prompt, "worldcup", "wc-home-spotlight");
  };

  const rightWide = rightSlot.kind === "none";

  return (
    <div
      className={`home-spotlight-row${rightWide ? " home-spotlight-row--single" : ""}`}
      aria-label="Featured sports"
    >
      <div className="home-spotlight-row__cell home-spotlight-row__cell--wc">
        <HomeWcCompactCard
          title="World Cup"
          fixtures={primaryFixtures}
          onOpenHub={goWorldCup}
          onOpenMatch={openWcMatch}
          onAskFixture={askFixture}
        />
      </div>

      {!rightWide ? (
        <div className="home-spotlight-row__cell home-spotlight-row__cell--right">
          {rightSlot.kind === "golf-live" ? (
            <GolfHomeStandingsCard
              variant="cream"
              golfData={golfData}
              golfLoading={golfLoading}
              onOpenGolf={onOpenGolf}
            />
          ) : null}
          {rightSlot.kind === "golf-upcoming" ? (
            <HomeGolfUpcomingCard
              event={rightSlot.event}
              onOpenGolf={onOpenGolf}
              onAsk={(prompt) => firePrompt?.(prompt, "golf", "golf-home-upcoming")}
            />
          ) : null}
          {rightSlot.kind === "wc-fallback" ? (
            <HomeWcCompactCard
              title="More World Cup"
              fixtures={rightSlot.fixtures}
              onOpenHub={goWorldCupMatchesToday || goWorldCup}
              onOpenMatch={openWcMatch}
              onAskFixture={askFixture}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
