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
          flexShrink: 0,
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
      style={{ width: size, height: size, objectFit: "contain", flexShrink: 0 }}
      onError={() => setBad(true)}
    />
  );
}

function BubbleCard({ row }) {
  const t = row.team;
  const r = row.record || { projectedWins: 0, projectedLosses: 17, wins: 0, losses: 0, remaining: 17 };
  const winsOutLabel = row.winsOut != null ? `${row.winsOut.toFixed(1)} wins out` : "";

  return (
    <div
      style={{
        width: "100%",
        borderRadius: 12,
        padding: "12px 14px",
        background: "rgba(26, 18, 0, 0.45)",
        border: "1px solid #F59E0B40",
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <RowLogo team={t} size={40} />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            fontWeight: 700,
            fontSize: 14,
            color: "#F59E0B",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {t?.shortName || t?.fullName || t?.abbr || "?"}
        </div>
        {winsOutLabel ? (
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#F59E0B",
              background: "rgba(245,158,11,.15)",
              border: "1px solid rgba(245,158,11,.35)",
              borderRadius: 6,
              padding: "4px 8px",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {winsOutLabel}
          </span>
        ) : null}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, color: "var(--nfl-predict-muted)" }}>
        <span style={{ opacity: 0.75 }}>proj. </span>
        {formatProjectedRecordDecimal(r)}
      </div>
    </div>
  );
}

function BubbleSection({ title, rows }) {
  return (
    <section style={{ width: "100%" }}>
      <div
        style={{
          fontFamily: "var(--mono-font)",
          fontSize: 11,
          letterSpacing: "0.1em",
          color: "#00F5E9",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          width: "100%",
        }}
      >
        {(rows || []).map((row) => (
          <BubbleCard key={row.team?.abbr || "?"} row={row} />
        ))}
      </div>
    </section>
  );
}

function SeedsColumn({ label, side, picks, schedule, teams }) {
  return (
    <div style={{ flex: "1 1 280px", minWidth: 0, maxWidth: "100%" }}>
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
                  <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.25 }}>{t ? t.fullName : "?"}</div>
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
    </div>
  );
}

export default function PlayoffPicture({ picks, schedule, teams }) {
  const pic = useMemo(() => getPlayoffPicture(picks, schedule, teams), [picks, schedule, teams]);

  return (
    <div style={{ padding: "10px 12px 8px", width: "100%", boxSizing: "border-box" }}>
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          alignItems: "flex-start",
          marginBottom: 24,
        }}
      >
        <SeedsColumn label="AFC" side={pic.afc} picks={picks} schedule={schedule} teams={teams} />
        <SeedsColumn label="NFC" side={pic.nfc} picks={picks} schedule={schedule} teams={teams} />
      </div>

      <BubbleSection title="AFC Wild Card Bubble" rows={pic.afc?.bubble} />
      <div style={{ height: 24 }} />
      <BubbleSection title="NFC Wild Card Bubble" rows={pic.nfc?.bubble} />
    </div>
  );
}
