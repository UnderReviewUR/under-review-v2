import { useMemo, useState } from "react";

import { getImpliedWinPct, getTeamRecord, isBoldPick } from "../../lib/nflPredictDerived.js";
import { savePick } from "../../lib/nflPredictState.js";

function networkStyle(network) {
  const n = String(network || "").toLowerCase();
  if (n === "tbd") return { bg: "#6b6b6b", fg: "#ececec", label: "TBD" };
  if (n.includes("espn")) return { bg: "#cc0000", fg: "#fff", label: null };
  if (n.includes("nbc")) return { bg: "#001489", fg: "#fff", label: null };
  if (n.includes("fox")) return { bg: "#f6c000", fg: "#111", label: null };
  if (n.includes("cbs")) return { bg: "#6b6b6b", fg: "#fff", label: null };
  if (n.includes("abc")) return { bg: "#4b0082", fg: "#fff", label: null };
  if (n.includes("amazon") || n === "amz") return { bg: "#0f1719", fg: "#00a8e1", label: null };
  if (n.includes("netflix")) return { bg: "#E50914", fg: "#fff", label: "Netflix" };
  return { bg: "#333", fg: "#fff", label: null };
}

/** Relative luminance 0–1 for #RRGGBB */
function hexLuminance(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ""));
  if (!m) return 0;
  const n = Number.parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const lin = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function winnerLabelColor(secondaryHex) {
  return hexLuminance(secondaryHex) < 0.35 ? "#fff" : secondaryHex;
}

function PickButtonLogo({ team }) {
  const [bad, setBad] = useState(false);
  const pc = team?.primaryColor || "#333";
  const sc = team?.secondaryColor || "#fff";
  if (!team || bad) {
    return (
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: pc,
          color: sc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 11,
        }}
      >
        {team?.abbr || "?"}
      </div>
    );
  }
  return (
    <img
      loading="lazy"
      width={36}
      height={36}
      src={team.logoUrl}
      alt=""
      decoding="async"
      style={{ width: 36, height: 36, objectFit: "contain" }}
      onError={() => setBad(true)}
    />
  );
}

export default function GameCard({ game, picks, schedule, teams, onPick, onPicked, focusTeam }) {
  const teamMap = useMemo(() => Object.fromEntries(teams.map((t) => [t.abbr, t])), [teams]);
  const away = teamMap[game.awayTeam];
  const home = teamMap[game.homeTeam];
  const pick = picks[game.id];

  const awayPct = away ? Math.round(getImpliedWinPct(away.abbr, teams) * 100) : 0;
  const homePct = home ? Math.round(getImpliedWinPct(home.abbr, teams) * 100) : 0;

  const bold = useMemo(() => {
    if (!pick?.winner) return false;
    return isBoldPick(game.id, pick.winner, schedule, teams);
  }, [game.id, pick, schedule, teams]);

  const hypothetical = useMemo(() => {
    if (!pick?.winner || !focusTeam) return null;
    const merged = { ...picks, [game.id]: { winner: pick.winner, confidence: pick.confidence || 80 } };
    return getTeamRecord(focusTeam, merged, schedule, teams);
  }, [pick, picks, game.id, focusTeam, schedule, teams]);

  const net = networkStyle(game.network);
  const networkBadgeText = net.label ?? game.network;
  const timeEtIsTbd = game.timeEt === "TBD";
  const timeEtDisplay = timeEtIsTbd ? "Time TBD" : game.timeEt;
  const timeStr = String(game.timeEt || "");
  const isInternationalSlot =
    timeStr.includes("9:30 AM") || timeStr.includes("AM ET");
  const winner = pick?.winner;

  const setWinner = (abbr) => {
    savePick(game.id, abbr, pick?.confidence ?? 80);
    onPick?.();
    onPicked?.();
  };

  const confPills = [60, 70, 80, 90, 100];

  function pickButtonStyle(team, sideAbbr) {
    const pc = team?.primaryColor || "#444";
    const sc = team?.secondaryColor || "#fff";
    const isWinner = winner === sideAbbr;
    const isLoser = winner && winner !== sideAbbr;
    const transition = "opacity 150ms ease, box-shadow 150ms ease, border-color 150ms ease";
    if (isWinner) {
      return {
        borderRadius: 12,
        minHeight: 44,
        padding: "10px 8px",
        cursor: "pointer",
        background: pc,
        border: `2px solid ${pc}`,
        boxShadow: `0 0 16px ${pc}60`,
        color: winnerLabelColor(sc),
        transition,
        outline: focusTeam === sideAbbr ? "1px solid rgba(0,245,233,.35)" : "none",
      };
    }
    if (isLoser) {
      return {
        borderRadius: 12,
        minHeight: 44,
        padding: "10px 8px",
        cursor: "pointer",
        background: "#111",
        border: `2px solid ${pc}20`,
        color: "#fff",
        opacity: 0.4,
        transition,
        outline: focusTeam === sideAbbr ? "1px solid rgba(0,245,233,.35)" : "none",
      };
    }
    return {
      borderRadius: 12,
      minHeight: 44,
      padding: "10px 8px",
      cursor: "pointer",
      background: `${pc}15`,
      border: `2px solid ${pc}50`,
      color: "#fff",
      transition,
      outline: focusTeam === sideAbbr ? "1px solid rgba(0,245,233,.35)" : "none",
    };
  }

  return (
    <article
      className="nfl-predict-game-card"
      style={{
        borderRadius: 14,
        border: "1px solid var(--nfl-predict-border)",
        background: "var(--nfl-predict-surface)",
        padding: "12px 12px 14px",
        marginBottom: 12,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span
          style={{
            fontFamily: "var(--mono-font)",
            fontSize: 10,
            letterSpacing: "0.1em",
            color: "var(--nfl-predict-accent)",
          }}
        >
          WEEK {game.week}
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
            flex: "1 1 auto",
            minWidth: 0,
            textAlign: "right",
          }}
        >
          <span
            style={{
              fontSize: 12,
              color: "var(--nfl-predict-muted)",
              lineHeight: 1.35,
              wordBreak: "break-word",
            }}
          >
            {game.date}
            <span style={{ opacity: 0.55 }}> · </span>
            <span
              style={{
                color: "var(--nfl-predict-muted)",
                opacity: timeEtIsTbd ? 0.75 : 1,
              }}
            >
              {timeEtDisplay}
            </span>
          </span>
          {isInternationalSlot ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.02em",
                color: "var(--nfl-predict-muted)",
                opacity: 0.9,
                whiteSpace: "nowrap",
              }}
              title="International / London window (morning ET)"
            >
              🌍 International
            </span>
          ) : null}
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "4px 8px",
            borderRadius: 6,
            background: net.bg,
            color: net.fg,
            flexShrink: 0,
            alignSelf: "center",
          }}
        >
          {networkBadgeText}
        </span>
      </div>
      {bold ? (
        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--nfl-predict-magenta)", marginBottom: 8 }}>
          Bold Pick 🔥
        </div>
      ) : null}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button
          type="button"
          className={`nfl-predict-pick-btn${winner === game.awayTeam ? " selected" : ""}${winner && winner !== game.awayTeam ? " unselected" : ""}`}
          onClick={() => setWinner(game.awayTeam)}
          style={pickButtonStyle(away, game.awayTeam)}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <PickButtonLogo team={away} />
            <div style={{ fontWeight: 800 }}>{game.awayTeam}</div>
            <div style={{ fontSize: 11, color: "var(--nfl-predict-muted)" }}>~{awayPct}%</div>
          </div>
        </button>
        <button
          type="button"
          className={`nfl-predict-pick-btn${winner === game.homeTeam ? " selected" : ""}${winner && winner !== game.homeTeam ? " unselected" : ""}`}
          onClick={() => setWinner(game.homeTeam)}
          style={pickButtonStyle(home, game.homeTeam)}
        >
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <PickButtonLogo team={home} />
            <div style={{ fontWeight: 800 }}>{game.homeTeam}</div>
            <div style={{ fontSize: 11, color: "var(--nfl-predict-muted)" }}>~{homePct}%</div>
          </div>
        </button>
      </div>
      <div
        className="nfl-predict-confidence"
        style={{
          marginTop: 12,
          height: 62,
        }}
        aria-hidden={!winner}
      >
        <div
          style={{
            visibility: winner ? "visible" : "hidden",
            opacity: winner ? 1 : 0,
            pointerEvents: winner ? "auto" : "none",
            transition: "opacity 150ms ease",
          }}
        >
          <div style={{ fontSize: 11, color: "var(--nfl-predict-muted)", marginBottom: 6 }}>Confidence</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, height: 44, alignItems: "center" }}>
            {confPills.map((c) => {
              const t = winner ? teams.find((x) => x.abbr === winner) : null;
              const active = winner && (pick?.confidence ?? 80) === c;
              return (
                <button
                  key={c}
                  type="button"
                  tabIndex={winner ? 0 : -1}
                  disabled={!winner}
                  onClick={() => {
                    if (!winner) return;
                    savePick(game.id, winner, c);
                    onPick?.();
                    onPicked?.();
                  }}
                  style={{
                    minHeight: 44,
                    minWidth: 52,
                    borderRadius: 999,
                    border: active ? `2px solid ${t?.primaryColor || "var(--nfl-predict-accent)"}` : "1px solid #333",
                    background: active ? "rgba(0,245,233,.12)" : "#141414",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: winner ? "pointer" : "default",
                  }}
                >
                  {c}%
                </button>
              );
            })}
          </div>
        </div>
      </div>
      {hypothetical && focusTeam ? (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--nfl-predict-muted)" }}>
          {focusTeam} goes {hypothetical.wins}-{hypothetical.losses} after this
        </div>
      ) : null}
    </article>
  );
}
