import {
  buildTennisMatchupSubline,
  formatTennisScore,
} from "../../features/tennis/tennisFormatters.js";

export function AtpMatchupCard({ m, onOpen }) {
  const isLive = String(m?.raw?.live || "0") === "1";
  const score = formatTennisScore(m.raw?.score);
  const subline = buildTennisMatchupSubline(m);
  const statusLabel = String(m.raw?.status || "").toLowerCase();
  const looksFinal =
    statusLabel.includes("final") ||
    statusLabel.includes("finished") ||
    statusLabel.includes("complete");
  return (
    <div className="matchup-card" onClick={() => onOpen(m)}>
      <div className="matchup-top">
        <div className="matchup-league" style={{ color: m.leagueColor }}>
          {m.league}
        </div>
        {isLive ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "rgba(239,68,68,0.15)",
              border: "1px solid rgba(239,68,68,0.5)",
              padding: "2px 7px",
              borderRadius: 10,
              fontFamily: "var(--mono-font)",
              fontSize: 9,
              color: "#FF5252",
              letterSpacing: 1.5,
              fontWeight: 700,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#FF5252",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            LIVE
          </div>
        ) : (
          <div className="matchup-time">{m.raw?.status || m.time}</div>
        )}
      </div>
      <div className="matchup-body">
        <div className="matchup-title">{m.title}</div>
        <div className="matchup-meta">
          {m.network}
          {subline ? ` · ${subline}` : ""}
        </div>
        {isLive && score ? (
          <div
            style={{
              fontFamily: "var(--mono-font)",
              fontSize: 13,
              fontWeight: 700,
              color: "#FFE082",
              marginTop: 4,
              letterSpacing: 0.5,
            }}
          >
            {score}
          </div>
        ) : score && looksFinal ? (
          <div
            className="matchup-blurb"
            style={{ fontFamily: "var(--mono-font)", fontSize: 12 }}
          >
            Final: {score}
          </div>
        ) : score && !isLive ? (
          <div
            className="matchup-blurb"
            style={{ fontFamily: "var(--mono-font)", fontSize: 12 }}
          >
            {score}
          </div>
        ) : (
          <div className="matchup-blurb">{m.blurb}</div>
        )}
      </div>
    </div>
  );
}
