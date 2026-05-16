import { useMemo, useState } from "react";

import { compareConferenceTeams, getPlayoffPicture } from "../../lib/nflPredictPlayoffs.js";
import { getTeamRecord } from "../../lib/nflPredictDerived.js";

function RowLogo({ team, size = 28 }) {
  const [bad, setBad] = useState(false);
  if (!team) return null;
  const pc = team.primaryColor;
  const sc = team.secondaryColor;
  if (bad) {
    return (
      <div
        style={{
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: pc,
          color: sc,
          fontWeight: 900,
          fontSize: 9,
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

  const wcRace = useMemo(() => {
    const pool = teams.filter((t) => t.conference === label).map((t) => t.abbr);
    const sorted = pool.slice().sort((a, b) => compareConferenceTeams(a, b, picks, schedule, teams));
    const slice = sorted.slice(7, 12);
    const seed7 = (side.seeds || []).find((s) => s.seed === 7);
    const ab7 = seed7?.team?.abbr;
    const r7 = ab7 ? getTeamRecord(ab7, picks, schedule) : { wins: 0, losses: 0, remaining: 17 };
    return slice.map((abbr) => {
      const r = getTeamRecord(abbr, picks, schedule);
      const gb = ((r7.wins - r.wins) + (r.losses - r7.losses)) / 2;
      return { abbr, r, gb: Math.max(0, gb), team: teams.find((t) => t.abbr === abbr) };
    });
  }, [label, picks, schedule, teams, side.seeds]);

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
          const r = s.record || (t ? getTeamRecord(t.abbr, picks, schedule) : { wins: 0, losses: 0, remaining: 17 });
          const decided = r.wins + r.losses;
          const labelTxt =
            s.seed === 1 ? "Bye" : s.seed <= 4 ? "Div winner" : "Wild card";
          const pc = t?.primaryColor || "#333";
          const sc = t?.secondaryColor || "#fff";
          return (
            <div
              key={`${label}-${s.seed}`}
              style={{
                display: "flex",
                alignItems: "stretch",
                gap: 0,
                borderRadius: 12,
                border: "1px solid var(--nfl-predict-border)",
                background: "var(--nfl-predict-surface)",
                overflow: "hidden",
              }}
            >
              <div style={{ width: 4, flexShrink: 0, background: pc }} />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 10px",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background: pc,
                    color: sc,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 11,
                    flexShrink: 0,
                  }}
                >
                  {s.seed}
                </div>
                <RowLogo team={t} size={28} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{t ? t.shortName : "?"}</div>
                  <div style={{ fontSize: 12, color: "var(--nfl-predict-muted)", transition: "opacity 200ms ease" }}>
                    {decided === 0 ? "?-?" : `${r.wins}-${r.losses}`}
                    {r.remaining ? ` (${r.remaining} left)` : ""}
                  </div>
                  <div style={{ fontSize: 10, color: "var(--nfl-predict-muted)", marginTop: 2 }}>{labelTxt}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, fontSize: 11, color: "var(--nfl-predict-muted)", marginBottom: 6 }}>Wild card race</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {wcRace.map((row) => (
          <div
            key={row.abbr}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 10px",
              borderRadius: 10,
              border: "1px solid #222",
              fontSize: 13,
            }}
          >
            <span style={{ fontWeight: 700 }}>{row.abbr}</span>
            <span style={{ color: "var(--nfl-predict-muted)" }}>{row.gb.toFixed(1)} GB</span>
          </div>
        ))}
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
