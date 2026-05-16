import { getWcTeamsByGroup } from "../../data/wc2026Teams.js";

const GROUP_COLORS = {
  A: "#F59E0B",
  B: "#3B82F6",
  C: "#22C55E",
  D: "#EF4444",
  E: "#A855F7",
  F: "#F97316",
  G: "#06B6D4",
  H: "#EC4899",
  I: "#6366F1",
  J: "#14B8A6",
  K: "#84CC16",
  L: "#EAB308",
};

function projectedPoints(elo, rank) {
  const base = Math.max(0, Math.round((elo - 1550) / 35));
  return Math.max(0, 9 - rank * 2 + base);
}

export default function WcGroupTable({ groupLetter, standings, onSelectTeam }) {
  const letter = String(groupLetter || "").toUpperCase();
  const accent = GROUP_COLORS[letter] || "var(--wc-gold)";
  const staticTeams = getWcTeamsByGroup(letter);
  const rows =
    standings?.length > 0
      ? standings.map((s, i) => ({
          team: s.team,
          played: s.played,
          won: s.won,
          drawn: s.drawn,
          lost: s.lost,
          gd: s.gd,
          points: s.points,
          rank: i + 1,
          static: staticTeams.find(
            (t) =>
              t.abbreviation === String(s.team).toUpperCase() ||
              t.name.toLowerCase() === String(s.team).toLowerCase(),
          ),
        }))
      : staticTeams.map((t, i) => ({
          team: t.abbreviation,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          gd: 0,
          points: projectedPoints(t.eloRating, i),
          rank: i + 1,
          static: t,
          projected: true,
        }));

  return (
    <div className="wc-group-card" style={{ borderColor: `${accent}44` }}>
      <div className="wc-group-card-head" style={{ color: accent }}>
        GROUP {letter}
        {rows[0]?.projected ? <span className="wc-group-proj"> · Elo proj.</span> : null}
      </div>
      <table className="wc-group-table">
        <thead>
          <tr>
            <th />
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const advance = row.rank <= 2;
            const flag = row.static?.flagUrl;
            return (
              <tr
                key={row.team}
                className={advance ? "wc-group-advance" : "wc-group-eliminated"}
                onClick={() => row.static && onSelectTeam?.(row.static)}
                role={onSelectTeam ? "button" : undefined}
                tabIndex={onSelectTeam ? 0 : undefined}
              >
                <td>
                  {flag ? (
                    <img
                      src={flag}
                      alt=""
                      width={32}
                      height={22}
                      loading="lazy"
                      className="wc-flag-sm"
                    />
                  ) : null}
                </td>
                <td className="wc-group-team-name">{row.team}</td>
                <td>{row.played}</td>
                <td>{row.won}</td>
                <td>{row.drawn}</td>
                <td>{row.lost}</td>
                <td>{row.gd > 0 ? `+${row.gd}` : row.gd}</td>
                <td>{row.points}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
