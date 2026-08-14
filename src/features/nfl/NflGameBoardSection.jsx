import { formatNflBoardTipoff } from "../../lib/mapNflBoardPropLines.js";
import {
  classifyNflGamePhase,
  formatNflLiveClockLine,
  formatNflPregameMeta,
} from "../../../shared/nflGameState.js";

/**
 * @param {{
 *   games?: Array<Record<string, unknown>>,
 *   loading?: boolean,
 *   asOf?: string | null,
 *   onSelectGame?: ((game: Record<string, unknown>) => void) | null,
 * }} props
 */
export default function NflGameBoardSection({ games = [], loading = false, asOf = null, onSelectGame = null }) {
  if (loading && !games.length) {
    return (
      <div className="section-divider" style={{ color: "var(--muted)", fontSize: 12 }}>
        Loading live NFL lines…
      </div>
    );
  }

  if (!games.length) {
    return (
      <div className="section-divider" style={{ color: "var(--muted)", fontSize: 12 }}>
        No NFL games with posted lines in this window.
      </div>
    );
  }

  const clickable = typeof onSelectGame === "function";

  return (
    <>
      <div className="section-divider">
        Live slate
        {asOf ? (
          <span style={{ marginLeft: 8, color: "var(--muted)", fontWeight: 400, letterSpacing: 0.5 }}>
            · {new Date(asOf).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </span>
        ) : null}
      </div>
      {games.map((g) => {
        const away = g.awayAbbr || "Away";
        const home = g.homeAbbr || "Home";
        const key = g.providerGameId || `${away}@${home}-${g.startTime || ""}`;
        const total = g.total;
        const spread = g.spread;
        const ml = g.moneyline;
        const phase = classifyNflGamePhase(g);
        const awayScore = Number.isFinite(Number(g.awayScore)) ? Number(g.awayScore) : null;
        const homeScore = Number.isFinite(Number(g.homeScore)) ? Number(g.homeScore) : null;
        const hasScore = awayScore != null && homeScore != null;
        const matchup =
          (phase === "live" || phase === "final") && hasScore
            ? `${away} ${awayScore}–${homeScore} ${home}`
            : `${away} @ ${home}`;
        const statusLine =
          phase === "live"
            ? formatNflLiveClockLine(g)
            : phase === "final"
              ? "Final"
              : formatNflPregameMeta(g) || formatNflBoardTipoff(g.tipoffMs) || "Scheduled";
        return (
          <div
            key={key}
            className="nba-game-card"
            onClick={clickable ? () => onSelectGame(g) : undefined}
            style={clickable ? undefined : { cursor: "default" }}
          >
            <div className="nba-game-top">
              <div className="nba-game-teams">{matchup}</div>
              <div>
                {phase === "live" ? (
                  <span className="nba-live-badge">● {statusLine}</span>
                ) : (
                  <span className="nba-game-status">{statusLine}</span>
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 14px",
                marginTop: 8,
                fontFamily: "var(--mono-font)",
                fontSize: 11,
                color: "var(--soft)",
              }}
            >
              {spread?.displayLine ? <span>Spread {spread.displayLine}</span> : null}
              {total?.line != null ? (
                <span>
                  O/U {total.line}
                  {total.overImpliedDevig != null
                    ? ` · O ${(total.overImpliedDevig * 100).toFixed(0)}%`
                    : ""}
                </span>
              ) : null}
              {ml?.homeOdds != null || ml?.awayOdds != null ? (
                <span>
                  ML {away} {ml?.awayOdds ?? "—"} / {home} {ml?.homeOdds ?? "—"}
                </span>
              ) : null}
              {total?.book || spread?.book ? (
                <span style={{ color: "var(--muted)" }}>{total?.book || spread?.book}</span>
              ) : null}
            </div>
          </div>
        );
      })}
    </>
  );
}
