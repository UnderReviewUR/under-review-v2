import { resolveF1RaceStart } from "../features/f1/raceStart.js";
import { getGolfHomeValidity, isGolfEventFinished } from "../lib/golfEventStatus.js";
import {
  classifyGolfEvent,
  classifyMlbGame,
  classifyNbaGame,
  EVENT_VALIDITY,
  getDisplayableF1NextRace,
  isDisplayableValidity,
} from "../../shared/eventValidity.js";

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
  isNflInSeason,
  goNfl,
  goNba,
  goGolf,
  goMlb,
  goF1,
  tickerNbaGames,
  getSeriesLabel,
  liveTickerTennisCards,
  golfData,
  mlbGames,
  mlbData,
  f1Data,
}) {
  const golfTickerRound =
    golfData?.currentEvent &&
    (isGolfEventFinished(golfData)
      ? "FINAL"
      : golfData.currentEvent.round || "IN PROGRESS");
  const golfHomeValidity = getGolfHomeValidity(golfData);
  const golfUpcomingFromTournament =
    classifyGolfEvent(golfData?.tournament || null) === EVENT_VALIDITY.UPCOMING
      ? golfData?.tournament
      : null;
  const golfUpcomingFromCurrent = golfHomeValidity.isUpcoming ? golfData?.currentEvent : null;
  const golfUpcomingEvent = golfUpcomingFromTournament || golfUpcomingFromCurrent || null;
  const golfUpcomingStartLabel = (() => {
    if (!golfUpcomingEvent) return "Start time TBD";
    const rawStart = String(golfUpcomingEvent.startDate || "").trim();
    if (rawStart) {
      const start = new Date(rawStart);
      if (!Number.isNaN(start.getTime())) {
        return `Starts ${start.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          timeZone: "America/Chicago",
        })}`;
      }
    }
    const display = String(golfUpcomingEvent.displayDate || "").trim();
    return display ? `Starts ${display}` : "Start time TBD";
  })();
  const validNbaGames = (tickerNbaGames || []).filter((g) =>
    isDisplayableValidity(classifyNbaGame(g)),
  );
  const validMlbGames = (mlbGames.length > 0 ? mlbGames : (mlbData?.games || [])).filter((g) =>
    isDisplayableValidity(classifyMlbGame(g)),
  );
  const nextF1Race = getDisplayableF1NextRace(f1Data);

  return (
    <>
            <div className="home-live-label">Live snapshot</div>
{/* Top ticker rail */}
<div
  style={{
    display: "flex",
    gap: 8,
    overflowX: "auto",
    scrollbarWidth: "none",
    marginBottom: 12,
    alignItems: "stretch",
  }}
>
  {(isNflInSeason()
    ? [
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
          <div style={{ fontSize: 12, ...SNAP_PRI }}>
            Weekly Props
          </div>
          <div style={{ fontSize: 10, color: "var(--muted)" }}>Live board →</div>
        </div>,

        ...validNbaGames
          .filter((g) => g.state === "in")
          .slice(0, 2)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";
            const seriesLabel = getSeriesLabel(away, home);

            return (
              <div
                key={`nba-${i}`}
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
                  🏀 {isLive ? "● LIVE" : g.status}
                </div>

                <div style={{ fontSize: 12, lineHeight: 1.2, ...SNAP_PRI }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div style={SNAP_SCORE}>
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}

                {seriesLabel && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 8,
                      color: "#FF6B00",
                      marginTop: 3,
                      letterSpacing: 0.5,
                    }}
                  >
                    {seriesLabel}
                  </div>
                )}
              </div>
            );
          }),

        ...liveTickerTennisCards,

        ...(golfHomeValidity.isActive && golfHomeValidity.hasLeaderboard
          ? [
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

                {golfData.currentEvent.leaderboard.slice(0, 3).map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "#ffffff",
                      fontWeight: i === 0 ? 600 : 500,
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
                        {p.position || i + 1}
                      </span>
                      <span style={{ fontWeight: i === 0 ? 600 : 500, color: "#ffffff" }}>
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
              </div>,
            ]
          : golfUpcomingEvent
          ? [
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
                  minWidth: 170,
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
                  ⛳ {golfUpcomingEvent.shortName || golfUpcomingEvent.name || "PGA TOUR"}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {golfUpcomingEvent.course || golfUpcomingEvent.courseName || "Course TBD"}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    fontFamily: "var(--mono-font)",
                    color: "rgba(255,255,255,.75)",
                    lineHeight: 1.35,
                    whiteSpace: "pre-line",
                  }}
                >
                  {`Upcoming tournament\n${golfUpcomingStartLabel}`}
                </div>
              </div>,
            ]
          : []),

        ...validMlbGames
          .filter((g) => g.state === "in")
          .slice(0, 1)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";

            return (
              <div
                key={`mlb-${i}`}
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

                <div style={{ fontSize: 12, lineHeight: 1.2, ...SNAP_PRI }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div style={SNAP_SCORE}>
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}
              </div>
            );
          })
      ]
    : [
        ...[...validNbaGames.filter((g) => g.state === "in"), ...validNbaGames.filter((g) => g.state === "pre").slice(0, 2)]
          .slice(0, 3)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";
            const seriesLabel = getSeriesLabel(away, home);

            return (
              <div
                key={`nba-${i}`}
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
                  🏀 {isLive ? "● LIVE" : g.status}
                </div>

                <div style={{ fontSize: 12, lineHeight: 1.2, ...SNAP_PRI }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div style={SNAP_SCORE}>
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}

                {seriesLabel && (
                  <div
                    style={{
                      fontFamily: "var(--mono-font)",
                      fontSize: 8,
                      color: "#FF6B00",
                      marginTop: 3,
                      letterSpacing: 0.5,
                    }}
                  >
                    {seriesLabel}
                  </div>
                )}
              </div>
            );
          }),

        ...liveTickerTennisCards,

        ...(golfHomeValidity.isActive && golfHomeValidity.hasLeaderboard
          ? [
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

                {golfData.currentEvent.leaderboard.slice(0, 3).map((p, i) => (
                  <div
                    key={`${p.name}-${i}`}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      lineHeight: 1.5,
                      color: "#ffffff",
                      fontWeight: i === 0 ? 600 : 500,
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
                        {p.position || i + 1}
                      </span>
                      <span style={{ fontWeight: i === 0 ? 600 : 500, color: "#ffffff" }}>
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
              </div>,
            ]
          : golfUpcomingEvent
          ? [
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
                  minWidth: 170,
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
                  ⛳ {golfUpcomingEvent.shortName || golfUpcomingEvent.name || "PGA TOUR"}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {golfUpcomingEvent.course || golfUpcomingEvent.courseName || "Course TBD"}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 9,
                    fontFamily: "var(--mono-font)",
                    color: "rgba(255,255,255,.75)",
                    lineHeight: 1.35,
                    whiteSpace: "pre-line",
                  }}
                >
                  {`Upcoming tournament\n${golfUpcomingStartLabel}`}
                </div>
              </div>,
            ]
          : []),

        ...validMlbGames
          .filter((g) => g.state === "in" || g.state === "pre")
          .slice(0, 2)
          .map((g, i) => {
            const away = g.awayTeam?.abbr || g.awayTeam?.name || "AWAY";
            const home = g.homeTeam?.abbr || g.homeTeam?.name || "HOME";
            const isLive = g.state === "in";

            return (
              <div
                key={`mlb-${i}`}
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

                <div style={{ fontSize: 12, lineHeight: 1.2, ...SNAP_PRI }}>
                  {away}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>@ {home}</div>

                {isLive && g.awayTeam?.score != null && (
                  <div style={SNAP_SCORE}>
                    {g.awayTeam.score}-{g.homeTeam.score}
                  </div>
                )}
              </div>
            );
          }),

                                ...(nextF1Race
          ? [
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
                <div style={{ fontSize: 11, lineHeight: 1.3, ...SNAP_PRI }}>
                  {nextF1Race.meeting_name}
                </div>
                <div style={{ fontSize: 10, color: "var(--muted)" }}>
                  {(() => {
                    const raceStart = resolveF1RaceStart(nextF1Race, f1Data?.sessions || []);
                    const dt = raceStart ? new Date(raceStart) : null;
                    const when = dt
                      ? `${dt.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/Chicago" })} ${dt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Chicago", timeZoneName: "short" })}`
                      : "Date/Time TBD";
                    return when;
                  })()}
                </div>
              </div>,
                      ]
                                    : [])])}
</div>
    </>
  );
}
