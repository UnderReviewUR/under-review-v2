import { useMemo, useState } from "react";

import { formatProjectedRecordDecimal, getProjectedRecord } from "../../lib/nflPredictDerived.js";
import { getPlayoffPicture } from "../../lib/nflPredictPlayoffs.js";

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

export default function TeamSelector({ picks, schedule, teams, onSelectTeam, onViewPlayoffs }) {
  const [q, setQ] = useState("");
  const [hoverAbbr, setHoverAbbr] = useState(null);

  const pickedCount = useMemo(() => Object.keys(picks || {}).filter((id) => picks[id]?.winner).length, [picks]);

  const { seedByAbbr, divLeaderSet } = useMemo(() => {
    const pic = getPlayoffPicture(picks, schedule, teams);
    const map = {};
    const leaders = new Set();
    for (const side of [pic.afc, pic.nfc]) {
      for (const s of side.seeds || []) {
        const abbr = s.team?.abbr;
        if (abbr) map[abbr] = s.seed;
      }
      for (const d of side.divisionWinners || []) {
        if (d.abbr) leaders.add(d.abbr);
      }
    }
    return { seedByAbbr: map, divLeaderSet: leaders };
  }, [picks, schedule, teams]);

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
    <div className="nfl-predict-team-selector" style={{ padding: "12px 14px 24px", paddingBottom: pickedCount > 0 ? 88 : 24 }}>
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
                const r = getProjectedRecord(team.abbr, picks, schedule, teams);
                const picked = r.wins + r.losses;
                const pct = picked === 0 ? 0 : (picked / 17) * 100;
                const hovered = hoverAbbr === team.abbr;
                const pc = team.primaryColor;
                const sc = team.secondaryColor;
                const seed = seedByAbbr[team.abbr];
                const isDivLeader = divLeaderSet.has(team.abbr);
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
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4, alignItems: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
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
                          {seed != null ? (
                            <span style={{ fontSize: 12 }} title={`#${seed} seed`}>
                              🏆
                            </span>
                          ) : null}
                          {isDivLeader ? (
                            <span
                              style={{
                                display: "inline-block",
                                background: pc,
                                color: sc,
                                borderRadius: 20,
                                padding: "2px 8px",
                                fontSize: 10,
                                fontWeight: 800,
                              }}
                            >
                              DIV
                            </span>
                          ) : null}
                        </div>
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
                      Proj: {formatProjectedRecordDecimal(r)}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--nfl-predict-muted)", opacity: 0.75 }}>
                      Picked {r.wins}-{r.losses}
                      {r.remaining ? ` · ${r.remaining} left` : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
      {pickedCount > 0 && typeof onViewPlayoffs === "function" ? (
        <div
          style={{
            position: "sticky",
            bottom: 0,
            left: 0,
            right: 0,
            marginTop: 16,
            paddingTop: 12,
            paddingBottom: 8,
            background: "linear-gradient(180deg, transparent, var(--nfl-predict-bg) 24%)",
            zIndex: 4,
          }}
        >
          <button
            type="button"
            onClick={onViewPlayoffs}
            style={{
              width: "100%",
              minHeight: 48,
              borderRadius: 12,
              border: "1px solid var(--nfl-predict-accent)",
              background: "rgba(0,245,233,.1)",
              color: "var(--nfl-predict-accent)",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            📊 View Full Playoff Picture →
          </button>
        </div>
      ) : null}
    </div>
  );
}
