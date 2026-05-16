import { useMemo, useState } from "react";

import { formatProjectedRecordDecimal, getProjectedRecord } from "../../lib/nflPredictDerived.js";
import { getPlayoffPicture } from "../../lib/nflPredictPlayoffs.js";

function RowLogo({ team, size = 40 }) {
  const [bad, setBad] = useState(false);
  if (!team) return null;
  const pc = team.primaryColor;
  const sc = team.secondaryColor;
  if (bad) {
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: pc,
          color: sc,
          fontWeight: 900,
          fontSize: size > 32 ? 12 : 9,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {team.abbr}
      </div>
    );
  }
  return (
    <img
      loading="lazy"
      width={size}
      height={size}
      src={team.logoUrl}
      alt=""
      style={{ width: size, height: size, objectFit: "contain" }}
      onError={() => setBad(true)}
    />
  );
}

function ConfColumn({ label, picks, schedule, teams }) {
  const pic = useMemo(() => getPlayoffPicture(picks, schedule, teams), [picks, schedule, teams]);
  const side = label === "AFC" ? pic.afc : pic.nfc;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 12,
          letterSpacing: "0.14em",
          color: "var(--nfl-predict-accent)",
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {(side.seeds || []).map((s) => {
          const t = s.team;
          const r =
            s.record ||
            (t
              ? getProjectedRecord(t.abbr, picks, schedule, teams)
              : { wins: 0, losses: 0, remaining: 17, projectedWins: 0, projectedLosses: 17 });
          const pc = t?.primaryColor || "#333";
          const sc = t?.secondaryColor || "#fff";
          const seedLabel = s.seed === 1 ? "Bye" : s.seed <= 4 ? "Division winner" : "Wild card";
          return (
            <div
              key={`${label}-${s.seed}`}
              style={{
                display: "flex",
                alignItems: "stretch",
                borderRadius: 12,
                border: "1px solid var(--nfl-predict-border)",
                background: "var(--nfl-predict-surface)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: 4, flexShrink: 0, background: pc }} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 10px", flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: pc,
                    color: sc,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 12,
                    flexShrink: 0,
                  }}
                >
                  {s.seed}
                </div>
                <RowLogo team={t} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t ? t.fullName : "?"}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, marginTop: 2 }}>
                    <span style={{ color: "var(--nfl-predict-muted)", fontWeight: 500, fontSize: 11 }}>proj. </span>
                    {formatProjectedRecordDecimal(r)}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--nfl-predict-muted)", marginTop: 2 }}>
                    Picked: {r.wins}-{r.losses}
                    {r.remaining ? ` (${r.remaining} left)` : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--nfl-predict-muted)", marginTop: 2 }}>
                    {t?.division || ""} · {seedLabel}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: "var(--nfl-predict-muted)", marginBottom: 6 }}>
        Wild card bubble
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {(side.bubble || []).map((row) => {
          const t = row.team;
          const r = row.record || { projectedWins: 0, projectedLosses: 17, wins: 0, losses: 0, remaining: 17 };
          return (
            <div
              key={t?.abbr || "?"}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 10px",
                borderRadius: 10,
                border: "1px solid #F59E0B55",
                background: "rgba(245,158,11,.08)",
                fontSize: 13,
              }}
            >
              <RowLogo team={t} size={32} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, color: "#F59E0B" }}>{t?.fullName || "?"}</div>
                <div style={{ fontSize: 12, color: "var(--nfl-predict-muted)" }}>
                  <span style={{ opacity: 0.8 }}>proj. </span>
                  {formatProjectedRecordDecimal(r)}
                </div>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "#F59E0B", fontWeight: 700, flexShrink: 0 }}>
                {row.winsOut != null ? `${row.winsOut.toFixed(1)} wins out` : ""}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PlayoffPicture({ picks, schedule, teams }) {
  return (
    <div
      style={{
        padding: "10px 12px 24px",
        display: "flex",
        gap: 16,
        flexWrap: "wrap",
      }}
    >
      <ConfColumn label="AFC" picks={picks} schedule={schedule} teams={teams} />
      <ConfColumn label="NFC" picks={picks} schedule={schedule} teams={teams} />
    </div>
  );
}
