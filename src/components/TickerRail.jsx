import { Fragment } from "react";
import { resolveF1RaceStart } from "../features/f1/raceStart.js";
import { normalizeText } from "../features/app/helpers.jsx";
import { formatTennisScore } from "../features/tennis/tennisFormatters.js";
import { isGolfEventFinished } from "../lib/golfEventStatus.js";
import { formatNbaTipoffLocal } from "../lib/nbaTime.js";
import { golfKeyForLiveSnapshot } from "../lib/liveSnapshotEventKeys.js";
import { planLiveSnapshot } from "../../shared/liveSnapshotPlan.js";

/** Live Snapshot — primary scores/names pop on dark cards; metadata stays dim. */
const SNAP_PRI = { color: "#ffffff", fontWeight: 600 };
const SNAP_SCORE = {
  fontFamily: "var(--mono-font)",
  fontSize: 11,
  color: "#ffffff",
  fontWeight: 600,
  marginTop: 2,
};

export default function TickerRail({
  isNflSlateActive,
  goNfl,
  goNba,
  goGolf,
  goMlb,
  goF1,
  goTennis,
  tickerNbaGames,
  getSeriesLabel,
  tennisTickerMatches,
  golfData,
  mlbGames,
  mlbData,
  f1Data,
}) {
  const nflOn = Boolean(isNflSlateActive);

  const plan = planLiveSnapshot({
    isNflSlateActive: nflOn,
    tickerNbaGames,
    mlbGames,
    mlbData,
    f1Data,
    tennisMatchesForTicker: tennisTickerMatches || [],
    golfSnapshotKey: () => golfKeyForLiveSnapshot(golfData),
  });

  const golfTickerRound =
    golfData?.currentEvent &&
    (isGolfEventFinished(golfData)
      ? "FINAL"
      : golfData.currentEvent.round || "IN PROGRESS");

  const renderNbaTile = (g, i) => {
    const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
    const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
    const isLive = g.state === "in";
    const seriesLabel = getSeriesLabel(away, home);
    const channel = String(g.channel || g.broadcast || "").trim();
    const metaLine = [seriesLabel, channel].filter(Boolean).join(" · ");
    return (
      <div
        key={`nba-${g.id ?? i}`}
        onClick={goNba}
        style={{
          flexShrink: 0,
          background: "var(--surface)",
          border: `1px solid ${isLive ? "rgba(0,230,118,.3)" : "var(--border)"}`,
          borderRadius: 10,
          padding: "8px 11px",
          cursor: "pointer",
          minWidth: 110,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 7,
            letterSpacing: 1.5,
            color: isLive ? "#00E676" : "#FF6B00",
            marginBottom: 3,
            textTransform: "uppercase",
          }}
        >
          🏀 {isLive ? "● LIVE" : formatNbaTipoffLocal(g.startTimeUtc)}
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.2, ...SNAP_PRI }}>{away}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

        {isLive && g.awayTeam?.score != null && (
          <div style={SNAP_SCORE}>
            {g.awayTeam.score}-{g.homeTeam.score}
          </div>
        )}

        {metaLine && (
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 8,
              color: "#FF6B00",
              marginTop: 3,
              letterSpacing: 0.5,
            }}
          >
            {metaLine}
          </div>
        )}
      </div>
    );
  };

  const renderMlbTile = (g, i) => {
    const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
    const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
    const isLive = g.state === "in";
    return (
      <div
        key={`mlb-${g.id ?? g.gamePk ?? i}`}
        onClick={goMlb}
        style={{
          flexShrink: 0,
          background: "var(--surface)",
          border: `1px solid ${isLive ? "rgba(0,230,118,.3)" : "var(--border)"}`,
          borderRadius: 10,
          padding: "8px 11px",
          cursor: "pointer",
          minWidth: 110,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 7,
            letterSpacing: 1.5,
            color: isLive ? "#00E676" : "#1DB954",
            marginBottom: 3,
            textTransform: "uppercase",
          }}
        >
          ⚾ {isLive ? "● LIVE" : g.status}
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.2, ...SNAP_PRI }}>{away}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

        {isLive && g.awayTeam?.score != null && (
          <div style={SNAP_SCORE}>
            {g.awayTeam.score}-{g.homeTeam.score}
          </div>
        )}
      </div>
    );
  };

  const nflTile = (
    <div
      key="nfl-live"
      onClick={goNfl}
      style={{
        flexShrink: 0,
        background: "rgba(74,144,217,.08)",
        border: "1px solid rgba(74,144,217,.25)",
        borderRadius: 10,
        padding: "8px 11px",
        cursor: "pointer",
        minWidth: 120,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 7,
          letterSpacing: 1.5,
          color: "#4A90D9",
          marginBottom: 3,
        }}
      >
        🏈 NFL
      </div>
      <div style={{ fontSize: 12, ...SNAP_PRI }}>Weekly Props</div>
      <div style={{ fontSize: 10, color: "var(--muted)" }}>Live board →</div>
    </div>
  );

  const renderF1Tile = (race) => (
    <div
      key="f1-ticker"
      onClick={goF1}
      style={{
        flexShrink: 0,
        background: "rgba(225,6,0,.06)",
        border: "1px solid rgba(225,6,0,.2)",
        borderRadius: 10,
        padding: "8px 11px",
        cursor: "pointer",
        minWidth: 110,
      }}
    >
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 7,
          letterSpacing: 1.5,
          color: "#E10600",
          marginBottom: 3,
        }}
      >
        🏎️ F1 NEXT
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.3, ...SNAP_PRI }}>{race.meeting_name}</div>
      <div style={{ fontSize: 10, color: "var(--muted)" }}>
        {(() => {
          const raceStart = resolveF1RaceStart(race, f1Data?.sessions || []);
          const dt = raceStart ? new Date(raceStart) : null;
          const when = dt
            ? `${dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })} ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" })}`
            : "Date/Time TBD";
          return when;
        })()}
      </div>
    </div>
  );

  const renderTennisTile = (m, i) => {
    const awayFull = String(m.raw?.away || (m.title || "").split(" vs ")[0] || "").trim() || "Away";
    const homeFull = String(m.raw?.home || (m.title || "").split(" vs ")[1] || "").trim() || "Home";
    const away = awayFull.split(" ").pop();
    const home = homeFull.split(" ").pop();
    const scoreLine = formatTennisScore(m.raw?.score);
    const isLiveCard = String(m?.raw?.live || "0") === "1";
    const st = normalizeText(m?.raw?.status || "");
    const hasFinalScore =
      scoreLine &&
      (st.includes("final") ||
        st.includes("finished") ||
        st.includes("walkover") ||
        st.includes("retired") ||
        st.includes("complete"));
    const pillLabel = isLiveCard ? "● LIVE" : hasFinalScore ? "FINAL" : "NEXT";
    const pillColor = isLiveCard ? "#22D3EE" : hasFinalScore ? "#A78BFA" : "#94A3B8";
    return (
      <div
        key={`tennis-ticker-${m.id || i}`}
        onClick={goTennis}
        style={{
          flexShrink: 0,
          background: "var(--surface)",
          border: "1px solid rgba(34,211,238,.28)",
          borderRadius: 10,
          padding: "8px 11px",
          cursor: "pointer",
          minWidth: 112,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 7,
            letterSpacing: 1.5,
            color: pillColor,
            marginBottom: 3,
            textTransform: "uppercase",
          }}
        >
          🎾 {pillLabel}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#ffffff", lineHeight: 1.2 }}>{away}</div>
        <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>
        {scoreLine ? (
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 11,
              color: "#ffffff",
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {scoreLine}
          </div>
        ) : null}
      </div>
    );
  };

  const golfLeaderTile =
    golfData?.currentEvent && Array.isArray(golfData.currentEvent.leaderboard) ? (
      <div
        key="golf-ticker"
        onClick={goGolf}
        style={{
          flexShrink: 0,
          background: "var(--surface)",
          border: "1px solid rgba(255,255,255,.12)",
          borderRadius: 10,
          padding: "8px 11px",
          cursor: "pointer",
          minWidth: 165,
        }}
      >
        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 7,
            letterSpacing: 1.5,
            color: "rgba(255,255,255,.7)",
            marginBottom: 4,
            textTransform: "uppercase",
          }}
        >
          ⛳ {golfData.currentEvent.shortName || golfData.currentEvent.name || "PGA TOUR"}
        </div>

        <div
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 8,
            color: "#ffffff",
            fontWeight: 600,
            marginBottom: 5,
            letterSpacing: 1,
          }}
        >
          {golfTickerRound}
        </div>

        {golfData.currentEvent.leaderboard.slice(0, 3).map((p, idx) => (
          <div
            key={`${p.name}-${idx}`}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              lineHeight: 1.5,
              color: "#ffffff",
              fontWeight: idx === 0 ? 600 : 500,
            }}
          >
            <span style={{ display: "flex", gap: 4, alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "var(--mono-font)",
                  fontSize: 9,
                  color: "var(--muted)",
                  minWidth: 14,
                }}
              >
                {p.position || idx + 1}
              </span>
              <span style={{ fontWeight: idx === 0 ? 600 : 500, color: "#ffffff" }}>
                {String(p.name || "").split(" ").pop()}
              </span>
            </span>

            <span
              style={{
                fontFamily: "var(--mono-font)",
                fontWeight: 600,
                color:
                  p.score && String(p.score).startsWith("-")
                    ? "#00E676"
                    : p.score === "E"
                      ? "#ffffff"
                      : "#FF4444",
              }}
            >
              {p.score || "—"}
            </span>
          </div>
        ))}
      </div>
    ) : null;

  const tiles = plan.items
    .map((item) => {
      let inner = null;
      switch (item.kind) {
        case "nba":
          inner = renderNbaTile(item.nbaGame, 0);
          break;
        case "mlb":
          inner = renderMlbTile(item.mlbGame, 0);
          break;
        case "nfl":
          inner = nflTile;
          break;
        case "f1":
          inner = renderF1Tile(item.f1Race);
          break;
        case "tennis":
          inner = renderTennisTile(item.tennisMatch, 0);
          break;
        case "golf":
          inner = golfLeaderTile;
          break;
        default:
          inner = null;
      }
      if (!inner) return null;
      return (
        <Fragment key={item.key}>
          {inner}
        </Fragment>
      );
    })
    .filter(Boolean);

  const tickerQuiet = tiles.length === 0;

  return (
    <>
      <div className="home-live-label">Live snapshot</div>
      <div
        className={`game-ticker home-ticker-premium${tickerQuiet ? " home-ticker-quiet" : ""}`}
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          scrollbarWidth: "none",
          marginBottom: 12,
          alignItems: "stretch",
        }}
      >
        {tickerQuiet ? (
          <div className="home-ticker-quiet-copy">
            Snapshot is quiet — nothing in the Home window right now. Use the sport pills above or ask UR Take on a
            specific matchup; boards refresh on their own cadence.
          </div>
        ) : (
          tiles
        )}
      </div>
    </>
  );
}
