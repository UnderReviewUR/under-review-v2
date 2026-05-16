import { useEffect, useState } from "react";

import {
  formatProjectedRecordDecimal,
  formatProjectedRecordLine,
  getProjectedRecord,
} from "../../lib/nflPredictDerived.js";
import { getPlayoffPicture } from "../../lib/nflPredictPlayoffs.js";

function OverlayLogo({ team }) {
  const [bad, setBad] = useState(false);
  const pc = team?.primaryColor || "#333";
  const sc = team?.secondaryColor || "#fff";
  if (!team || bad) {
    return (
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: pc,
          color: sc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 22,
          margin: "0 auto 16px",
        }}
      >
        {team?.abbr || "?"}
      </div>
    );
  }
  return (
    <img
      src={team.logoUrl}
      alt=""
      width={80}
      height={80}
      style={{ width: 80, height: 80, objectFit: "contain", display: "block", margin: "0 auto 16px" }}
      onError={() => setBad(true)}
    />
  );
}

export default function SeasonCompleteOverlay({
  teamAbbr,
  picks,
  schedule,
  teams,
  onViewPlayoffs,
  onContinue,
}) {
  const [visible, setVisible] = useState(false);
  const team = teams.find((t) => t.abbr === teamAbbr);
  const proj = getProjectedRecord(teamAbbr, picks, schedule, teams);
  const pic = getPlayoffPicture(picks, schedule, teams);
  const conf = team?.conference;
  const side = conf === "AFC" ? pic.afc : pic.nfc;
  const seedEntry = (side.seeds || []).find((s) => s.team?.abbr === teamAbbr);
  const inPlayoffs = Boolean(seedEntry);
  const pc = team?.primaryColor || "#333";

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const btnBase = {
    width: "100%",
    minHeight: 48,
    borderRadius: 12,
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    marginTop: 10,
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#0a0a0aee",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 16,
          background: "var(--nfl-predict-surface, #141414)",
          border: "1px solid var(--nfl-predict-border, #2a2a2a)",
          borderTop: `4px solid ${pc}`,
          padding: "24px 20px 20px",
          textAlign: "center",
          color: "var(--nfl-predict-text, #fff)",
        }}
      >
        <OverlayLogo team={team} />
        <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 900 }}>{teamAbbr} Season Complete! 🏈</h2>
        <p style={{ margin: "0 0 6px", fontSize: 15, color: "var(--nfl-predict-muted)" }}>
          Projected: {formatProjectedRecordLine(proj)}
        </p>
        <p style={{ margin: "0 0 16px", fontSize: 12, color: "var(--nfl-predict-muted)" }}>
          <span style={{ opacity: 0.7 }}>proj.</span> {formatProjectedRecordDecimal(proj)}
        </p>

        {inPlayoffs ? (
          <>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 700 }}>
              📈 {teamAbbr} is projected to make the playoffs!
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--nfl-predict-accent)" }}>
              Projected #{seedEntry.seed} Seed — {conf}
            </p>
            <button
              type="button"
              onClick={onViewPlayoffs}
              style={{
                ...btnBase,
                border: "none",
                background: pc,
                color: team?.secondaryColor || "#fff",
              }}
            >
              See the full playoff picture →
            </button>
          </>
        ) : (
          <>
            <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 700 }}>
              📉 {teamAbbr} misses the playoffs on current projections
            </p>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--nfl-predict-muted)" }}>
              Pick more games to change the outcome
            </p>
            <button
              type="button"
              onClick={onViewPlayoffs}
              style={{
                ...btnBase,
                border: `1px solid ${pc}`,
                background: `${pc}22`,
                color: "#fff",
              }}
            >
              See Playoff Picture →
            </button>
          </>
        )}

        <button
          type="button"
          onClick={onContinue}
          style={{
            ...btnBase,
            border: "1px solid #444",
            background: "transparent",
            color: "var(--nfl-predict-muted)",
          }}
        >
          Continue Predicting →
        </button>
      </div>
    </div>
  );
}
