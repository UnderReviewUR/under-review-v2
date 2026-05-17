import { getGolfHomeValidity } from "../../lib/golfEventStatus.js";
import {
  formatAmericanOddsDisplay,
  pickTopPgaChampionshipOutrightLeaders,
} from "../../../shared/pgaChampionshipOddsLeaders.js";

/**
 * Home feature card: top-5 PGA Championship outright favorites (TheScore Bet lines via PGA site).
 * @param {Record<string, unknown> | null | undefined} golfData
 */
export function buildPgaChampionshipOddsHomeCard(golfData) {
  const validity = getGolfHomeValidity(golfData);
  if (!validity.isActive && !validity.isUpcoming) return null;

  const eventName =
    golfData?.currentEvent?.name || golfData?.currentEvent?.shortName || "";
  if (!/pga championship/i.test(String(eventName))) return null;

  const odds = golfData?.odds;
  if (!odds?.hasPostedLines) return null;

  const leaders = pickTopPgaChampionshipOutrightLeaders(odds.outrights, 5);
  if (!leaders.length) return null;

  const fetchedAt = odds.fetchedAt || null;
  const stale = Boolean(odds.freshness?.isStale);
  const ageMin = odds.freshness?.ageMinutes;

  return {
    id: "pga-championship-outright-odds",
    sportBadge: "PGA",
    accentColor: "#C9A227",
    title: "PGA Championship — Outright Favorites",
    subtitle: stale
      ? "Lines may be stale — confirm before betting"
      : "Win odds via official championship feed",
    leaders,
    fetchedAt,
    fetchedLabel: fetchedAt
      ? `Updated ${new Date(fetchedAt).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/New_York",
        })} ET${typeof ageMin === "number" ? ` · ${ageMin}m ago` : ""}`
      : null,
    prompt: `PGA Championship outright value — ${leaders.map((r) => `${r.player} ${r.display || formatAmericanOddsDisplay(r.odds)}`).join(", ")}`,
    sportHint: "golf",
  };
}
