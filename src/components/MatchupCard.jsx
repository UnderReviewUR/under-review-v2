export default function MatchupCard({ matchup, onOpen }) {
  if (!matchup) return null;
  return (
    <button type="button" className="prompt-chip" onClick={() => onOpen?.(matchup)}>
      {matchup.title || "Matchup"}
    </button>
  );
}
