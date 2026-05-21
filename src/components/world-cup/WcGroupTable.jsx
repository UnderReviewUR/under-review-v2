import { getWcTeamsByGroup } from "../../data/wc2026Teams.js";
import { wcStrengthTagForRank } from "../../../shared/wc2026Strength.js";

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

const STRENGTH_CLASS = {
  Favorite: "wc-strength--favorite",
  Contender: "wc-strength--contender",
  Longshot: "wc-strength--longshot",
};

function resolveRows(groupLetter, standings) {
  const letter = String(groupLetter || "").toUpperCase();
  const staticTeams = getWcTeamsByGroup(letter);
  const apiRows = Array.isArray(standings) ? standings : [];
  const hasPlayed = apiRows.some((s) => Number(s.played) > 0);

  if (hasPlayed) {
    const byAbbr = new Map(staticTeams.map((t) => [t.abbreviation, t]));
    return apiRows
      .slice()
      .sort((a, b) => Number(b.points) - Number(a.points) || Number(b.gd) - Number(a.gd))
      .map((s, i) => {
        const key = String(s.team || "").trim().toUpperCase();
        const st = byAbbr.get(key);
        return {
          team: st?.name || s.team,
          abbreviation: key,
          flagUrl: st?.flagUrl,
          strengthTag: st
            ? wcStrengthTagForRank(
                Math.max(0, staticTeams.findIndex((t) => t.abbreviation === key)),
              )
            : wcStrengthTagForRank(i),
          played: Number(s.played) || 0,
          won: Number(s.won) || 0,
          drawn: Number(s.drawn) || 0,
          lost: Number(s.lost) || 0,
          points: Number(s.points) || 0,
          hasResults: true,
          static: st,
        };
      });
  }

  return staticTeams.map((t, i) => ({
    team: t.name,
    abbreviation: t.abbreviation,
    flagUrl: t.flagUrl,
    strengthTag: wcStrengthTagForRank(i),
    hasResults: false,
    static: t,
  }));
}

export default function WcGroupTable({ groupLetter, standings, onSelectTeam }) {
  const letter = String(groupLetter || "").toUpperCase();
  const accent = GROUP_COLORS[letter] || "var(--wc-gold)";
  const rows = resolveRows(letter, standings);

  return (
    <div className="wc-group-card" style={{ borderColor: `${accent}44` }}>
      <div className="wc-group-card-head" style={{ color: accent }}>
        GROUP {letter}
      </div>
      <ol className="wc-group-team-list">
        {rows.map((row, idx) => {
          const tag = row.strengthTag || "Longshot";
          const tagClass = STRENGTH_CLASS[tag] || "wc-strength--longshot";
          return (
            <li
              key={`${row.abbreviation}-${idx}`}
              className="wc-group-team-row"
              onClick={() => row.static && onSelectTeam?.(row.static)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && row.static) onSelectTeam?.(row.static);
              }}
              role={onSelectTeam ? "button" : undefined}
              tabIndex={onSelectTeam ? 0 : undefined}
            >
              {row.flagUrl ? (
                <img
                  src={row.flagUrl}
                  alt=""
                  width={32}
                  height={22}
                  loading="lazy"
                  className="wc-flag-sm"
                />
              ) : null}
              <span className="wc-group-team-name">{row.team}</span>
              <span className={`wc-strength-tag ${tagClass}`}>{tag}</span>
              {row.hasResults ? (
                <span className="wc-group-team-record">
                  {row.points} pts · {row.won}W-{row.drawn}D-{row.lost}L
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
