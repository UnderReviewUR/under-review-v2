import { useMemo, useState } from "react";

import { getTeamRecord } from "../../lib/nflPredictDerived.js";

function CardTeamLogo({ team }) {
  const [bad, setBad] = useState(false);
  const pc = team?.primaryColor || "#333";
  const sc = team?.secondaryColor || "#fff";
  if (bad) {
    return (
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          background: pc,
          color: sc,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 900,
          fontSize: 13,
          fontFamily: "var(--mono-font, monospace)",
          flexShrink: 0,
        }}
      >
        {team?.abbr}
      </div>
    );
  }
  return (
    <img
      loading="lazy"
      width={48}
      height={48}
      src={team?.logoUrl}
      alt=""
      decoding="async"
      style={{ width: 48, height: 48, objectFit: "contain", flexShrink: 0 }}
      onError={() => setBad(true)}
    />
  );
}

const DIV_ORDER = ["AFC East", "AFC North", "AFC South", "AFC West", "NFC East", "NFC North", "NFC South", "NFC West"];

export default function TeamSelector({ picks, schedule, teams, onSelectTeam }) {
  const [q, setQ] = useState("");
  const [hoverAbbr, setHoverAbbr] = useState(null);

  const pickedCount = useMemo(() => Object.keys(picks || {}).filter((id) => picks[id]?.winner).length, [picks]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return teams.filter((t) => {
      if (!needle) return true;
      return (
        t.abbr.toLowerCase().includes(needle) ||
        t.fullName.toLowerCase().includes(needle) ||
        t.shortName.toLowerCase().includes(needle) ||
        t.city.toLowerCase().includes(needle)
      );
    });
  }, [teams, q]);

  return (
    <div className="nfl-predict-team-selector" style={{ padding: "12px 14px 24px" }}>
      <div style={{ fontSize: 13, color: "var(--nfl-predict-muted)", marginBottom: 10, textAlign: "center" }}>
        {pickedCount} / 272 games predicted
      </div>
      <input
        type="search"
        placeholder="Search teams…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="nfl-predict-search"
        style={{
          width: "100%",
          minHeight: 44,
          borderRadius: 10,
          border: "1px solid var(--nfl-predict-border)",
          background: "var(--nfl-predict-surface)",
          color: "var(--nfl-predict-text)",
          padding: "10px 12px",
          marginBottom: 16,
          fontSize: 15,
        }}
      />
      {DIV_ORDER.map((div) => {
        const inDiv = filtered.filter((t) => t.division === div);
        if (!inDiv.length) return null;
        return (
          <section key={div} style={{ marginBottom: 18 }}>
            <div
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 11,
                letterSpacing: "0.14em",
                color: "var(--nfl-predict-accent)",
                marginBottom: 8,
              }}
            >
              {div
                .split(" ")
                .map((w) => w.toUpperCase())
                .join(" ")}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
              }}
            >
              {inDiv.map((team) => {
                const r = getTeamRecord(team.abbr, picks, schedule);
                const picked = r.wins + r.losses;
                const pct = picked === 0 ? 0 : (picked / 17) * 100;
                const hovered = hoverAbbr === team.abbr;
                const pc = team.primaryColor;
                const sc = team.secondaryColor;
                return (
                  <button
                    key={team.abbr}
                    type="button"
                    onClick={() => onSelectTeam(team.abbr)}
                    onMouseEnter={() => setHoverAbbr(team.abbr)}
                    onMouseLeave={() => setHoverAbbr(null)}
                    className="nfl-predict-team-card"
                    style={{
                      minHeight: 44,
                      borderRadius: 12,
                      border: hovered ? `1px solid ${pc}80` : `1px solid ${pc}40`,
                      background: hovered ? `${pc}30` : `${pc}18`,
                      padding: "10px 10px",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "stretch",
                      gap: 8,
                      cursor: "pointer",
                      textAlign: "left",
                      color: "var(--nfl-predict-text)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <CardTeamLogo team={team} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{team.shortName}</div>
                        <span
                          style={{
                            display: "inline-block",
                            marginTop: 4,
                            background: pc,
                            color: sc,
                            borderRadius: 20,
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          O/U {team.winTotal}
                        </span>
                      </div>
                      <svg width={36} height={36} viewBox="0 0 36 36" style={{ flexShrink: 0 }}>
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#2a2a2a" strokeWidth="4" />
                        <circle
                          cx="18"
                          cy="18"
                          r="15"
                          fill="none"
                          stroke="var(--nfl-predict-accent)"
                          strokeWidth="4"
                          strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                          transform="rotate(-90 18 18)"
                        />
                      </svg>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--nfl-predict-muted)" }}>
                      {r.wins}-{r.losses}
                      {r.remaining ? ` (${r.remaining} left)` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
