export default function NflPlayerCard({ name, onClick }) {
  return (
    <button type="button" onClick={() => onClick?.(name)} className="prompt-chip nfl-chip">
      {name}
    </button>
  );
}
