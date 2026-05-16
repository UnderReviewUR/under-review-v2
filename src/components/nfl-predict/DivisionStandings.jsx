import { useMemo, useState } from "react";

import { getDivisionStandings } from "../../lib/nflPredictStandings.js";
import { getPlayoffPicture } from "../../lib/nflPredictPlayoffs.js";

function RowTeamLogo({ team }) {
  const [bad, setBad] = useState(false);
  if (!team) return null;
  const pc = team.primaryColor;
  const sc = team.secondaryColor;
  if (bad) {
    return (
      <div
        style={{
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: pc,
          color: sc,
          fontSize: 9,
          fontWeight: 800,
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
      width={24}
      height={24}
      src={team.logoUrl}
      alt=""
      style={{ width: 24, height: 24, objectFit: "contain" }}
      onError={() => setBad(true)}
    />
  );
}

const CONF_DIVS = {
  AFC: ["AFC East", "AFC North", "AFC South", "AFC West"],
  NFC: ["NFC East", "NFC North", "NFC South", "NFC West"],
};

export default function DivisionStandings({ picks, schedule, teams, conference }) {
  const picture = useMemo(() => getPlayoffPicture(picks, schedule, teams), [picks, schedule, teams]);
  const side = conference === "AFC" ? picture.afc : picture.nfc;

  const leaderByDiv = useMemo(() => {
    const m = {};
    for (const d of side.divisionWinners || []) {
      m[d.div] = d.abbr;
    }
    return m;
  }, [side.divisionWinners]);

  const wcSet = useMemo(() => {
    const s = new Set();
    for (const row of side.seeds || []) {
      if (row.seed >= 5 && row.seed <= 7 && row.team) s.add(row.team.abbr);
    }
    return s;
  }, [side.seeds]);

  const bubbleSet = useMemo(() => {
    const s = new Set();
    for (const b of side.bubble || []) {
      if (b.team) s.add(b.team.abbr);
    }
    return s;
  }, [side.bubble]);

  function statusFor(abbr, division) {
    if (leaderByDiv[division] === abbr) return "DIV LEADER 🏆";
    if (wcSet.has(abbr)) return "WC IN ✅";
    if (bubbleSet.has(abbr)) return "BUBBLE 🫧";
    return "OUT ❌";
  }

  return (
    <div style={{ padding: "8px 12px 24px" }}>
      {CONF_DIVS[conference].map((div) => {
        const rows = getDivisionStandings(div, picks, schedule, teams);
        return (
          <section key={div} style={{ marginBottom: 20 }}>
            <div
              style={{
                fontFamily: "var(--mono-font)",
                fontSize: 11,
                letterSpacing: "0.12em",
                color: "var(--nfl-predict-accent)",
                marginBottom: 8,
              }}
            >
              {div.toUpperCase()}
            </div>
            <div style={{ border: "1px solid var(--nfl-predict-border)", borderRadius: 12, overflow: "hidden" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 36px 36px 52px 1fr",
                  gap: 4,
                  padding: "8px 10px",
                  background: "#101010",
                  fontSize: 10,
                  color: "var(--nfl-predict-muted)",
                  fontFamily: "var(--mono-font)",
                }}
              >
                <span>Team</span>
                <span style={{ textAlign: "center" }}>W</span>
                <span style={{ textAlign: "center" }}>L</span>
                <span style={{ textAlign: "center" }}>Rem</span>
                <span>Playoff</span>
              </div>
              {rows.map((row) => {
                const st = statusFor(row.team.abbr, div);
                const isDivLeader = st.includes("DIV LEADER");
                const pc = row.team.primaryColor;
                const sc = row.team.secondaryColor;
                return (
                  <div
                    key={row.team.abbr}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 36px 36px 52px 1fr",
                      gap: 4,
                      padding: "10px 10px",
                      borderTop: "1px solid var(--nfl-predict-border)",
                      alignItems: "center",
                      fontSize: 13,
                      borderLeft: `4px solid ${pc}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <RowTeamLogo team={row.team} />
                      <span
                        style={{
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          color: "#fff",
                        }}
                      >
                        {row.team.shortName}
                      </span>
                    </div>
                    <span style={{ textAlign: "center", color: "var(--nfl-predict-muted)", transition: "color 200ms ease" }}>
                      {row.wins}
                    </span>
                    <span style={{ textAlign: "center", color: "var(--nfl-predict-muted)", transition: "color 200ms ease" }}>
                      {row.losses}
                    </span>
                    <span style={{ textAlign: "center", color: "var(--nfl-predict-muted)" }}>{row.remaining}</span>
                    <span style={{ fontSize: 11, fontWeight: 700 }}>
                      {isDivLeader ? (
                        <span
                          style={{
                            display: "inline-block",
                            background: pc,
                            color: sc,
                            borderRadius: 8,
                            padding: "2px 8px",
                          }}
                        >
                          {st}
                        </span>
                      ) : (
                        st
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
