import { planLiveSnapshot } from "../../shared/liveSnapshotPlan.js";
import { isWcLiveStatus } from "../../shared/liveSnapshotFilters.js";
import { formatWcKickoffDisplay } from "../../shared/wcKickoffDisplay.js";
import { golfKeyForLiveSnapshot } from "../lib/liveSnapshotEventKeys.js";
import { isGolfEventFinished } from "../lib/golfEventStatus.js";

function labelForItem(item, { golfData, getSeriesLabel }) {
  if (!item) return null;
  switch (item.kind) {
    case "worldcup": {
      const m = item.wcMatch;
      if (!m) return null;
      const away = m.awayTeam || "AWAY";
      const home = m.homeTeam || "HOME";
      if (isWcLiveStatus(m.status) && m.homeScore != null && m.awayScore != null) {
        const min = m.minute != null ? ` · ${m.minute}'` : "";
        return `WC · ${away} ${m.awayScore}–${m.homeScore} ${home}${min}`;
      }
      const kick = formatWcKickoffDisplay(m);
      return `WC · ${away} vs ${home}${kick ? ` · ${kick}` : ""}`;
    }
    case "golf": {
      const ev = golfData?.currentEvent;
      if (!ev || isGolfEventFinished(golfData)) return null;
      const leader = ev.leaderboard?.[0];
      const name = leader?.shortName || leader?.name || "Leader";
      const score = leader?.score ?? "—";
      const round = ev.round ? ` · ${ev.round}` : "";
      return `Golf · ${name} ${score}${round}`;
    }
    case "nba": {
      const g = item.nbaGame;
      if (!g) return null;
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
      if (g.state === "in") {
        return `NBA · ${away} ${g.awayScore ?? 0}–${g.homeScore ?? 0} ${home}`;
      }
      const series = getSeriesLabel?.(away, home);
      return `NBA · ${away} @ ${home}${series ? ` · ${series}` : ""}`;
    }
    case "mlb": {
      const g = item.mlbGame;
      if (!g) return null;
      const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
      const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
      if (g.state === "in") {
        return `MLB · ${away} ${g.awayScore ?? 0}–${g.homeScore ?? 0} ${home}`;
      }
      return `MLB · ${away} @ ${home}`;
    }
    case "tennis": {
      const m = item.tennisMatch;
      if (!m) return null;
      return `Tennis · ${m.player1 || "P1"} vs ${m.player2 || "P2"}`;
    }
    case "f1": {
      const race = item.f1Race;
      return race?.meeting_name ? `F1 · ${race.meeting_name}` : "F1 · Next race";
    }
    case "nfl":
      return "NFL · Slate active";
    default:
      return null;
  }
}

/**
 * Thin live-score strip for Option B home — reuses snapshot plan data.
 */
export default function HomeCompactTicker({
  isNflSlateActive,
  tickerNbaGames,
  wcMatches,
  getSeriesLabel,
  tennisTickerMatches,
  golfData,
  mlbGames,
  mlbData,
  f1Data,
  onNavigate,
}) {
  const plan = planLiveSnapshot({
    isNflSlateActive: Boolean(isNflSlateActive),
    tickerNbaGames,
    mlbGames,
    mlbData,
    f1Data,
    tennisMatchesForTicker: tennisTickerMatches || [],
    wcMatches: wcMatches || [],
    golfSnapshotKey: () => golfKeyForLiveSnapshot(golfData),
  });

  const labels = plan.items
    .map((item) => labelForItem(item, { golfData, getSeriesLabel }))
    .filter(Boolean)
    .slice(0, 5);

  if (!labels.length) return null;

  return (
    <div className="home-compact-ticker" aria-label="Live scores">
      <div className="home-compact-ticker-track">
        {labels.map((label, i) => (
          <button
            key={`${label}-${i}`}
            type="button"
            className="home-compact-ticker-chip"
            onClick={() => onNavigate?.(plan.items[i])}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
