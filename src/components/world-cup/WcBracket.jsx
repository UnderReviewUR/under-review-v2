import { getWcTeamByAbbr } from "../../data/wc2026Teams.js";

const ROUNDS = [
  { key: "r32", label: "Round of 32" },
  { key: "r16", label: "Round of 16" },
  { key: "qf", label: "Quarterfinals" },
  { key: "sf", label: "Semifinals" },
  { key: "final", label: "Final" },
];

const PLACEHOLDER_SLOTS = {
  r32: [
    "1A vs 3B/C/D",
    "2A vs 2B",
    "1B vs 3A/C/D/E/F",
    "2C vs 2F",
    "1C vs 3D/E/F/G/H",
    "2E vs 2I",
    "1D vs 3A/B/C/F",
    "2G vs 2H",
    "1E vs 3A/B/C/D",
    "2J vs 2L",
    "1F vs 3E/H/I/J/K",
    "2K vs 2M",
    "1G vs 3E/H/I/J/K",
    "2I vs 2J",
    "1H vs 3E/F/G/I/J",
    "2L vs 2K",
  ],
};

function roundKey(raw) {
  const r = String(raw || "").toLowerCase();
  if (r.includes("final") && !r.includes("semi") && !r.includes("quarter")) return "final";
  if (r.includes("semi")) return "sf";
  if (r.includes("quarter") || r.includes("qf")) return "qf";
  if (r.includes("16") || r.includes("r16")) return "r16";
  if (r.includes("32") || r.includes("r32")) return "r32";
  return "r32";
}

function matchesForRound(matches, key) {
  return (matches || []).filter((m) => roundKey(m.round) === key);
}

function BracketMatch({ match, placeholder }) {
  if (placeholder) {
    return <div className="wc-bracket-slot wc-bracket-placeholder">{placeholder}</div>;
  }
  const home = getWcTeamByAbbr(match.homeTeam);
  const away = getWcTeamByAbbr(match.awayTeam);
  const done = String(match.status).toLowerCase() === "ft";
  const homeWins = done && (match.homeScore ?? 0) > (match.awayScore ?? 0);
  const awayWins = done && (match.awayScore ?? 0) > (match.homeScore ?? 0);

  return (
    <div className="wc-bracket-slot">
      <div className={homeWins ? "wc-bracket-team wc-bracket-winner" : "wc-bracket-team"}>
        {home?.flagUrl ? <img src={home.flagUrl} alt="" width={20} height={14} loading="lazy" /> : null}
        <span>{home?.abbreviation || match.homeTeam}</span>
        {done ? <span className="wc-bracket-score">{match.homeScore}</span> : null}
      </div>
      <div className={awayWins ? "wc-bracket-team wc-bracket-winner" : "wc-bracket-team"}>
        {away?.flagUrl ? <img src={away.flagUrl} alt="" width={20} height={14} loading="lazy" /> : null}
        <span>{away?.abbreviation || match.awayTeam}</span>
        {done ? <span className="wc-bracket-score">{match.awayScore}</span> : null}
      </div>
    </div>
  );
}

export default function WcBracket({ matches }) {
  const hasKnockout = (matches || []).some((m) => m.round && roundKey(m.round) !== "r32" || m.round);

  return (
    <div className="wc-bracket">
      <p className="wc-bracket-note">
        {hasKnockout
          ? "Knockout bracket updates as results come in."
          : "Pre-tournament bracket — group winners and best third-place slots shown until knockout fixtures are set."}
      </p>
      <div className="wc-bracket-grid">
        {ROUNDS.map((round) => {
          const roundMatches = matchesForRound(matches, round.key);
          const placeholders = PLACEHOLDER_SLOTS[round.key];
          const slots =
            roundMatches.length > 0
              ? roundMatches.map((m) => <BracketMatch key={m.id} match={m} />)
              : (placeholders || ["TBD", "TBD", "TBD", "TBD"]).map((p, i) => (
                  <BracketMatch key={`${round.key}-${i}`} placeholder={p} />
                ));
          return (
            <div key={round.key} className="wc-bracket-col">
              <div className="wc-bracket-round-label">{round.label}</div>
              {slots}
            </div>
          );
        })}
      </div>
    </div>
  );
}
