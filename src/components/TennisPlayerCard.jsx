export default function TennisPlayerCard({ name, onOpen }) {
  return (
    <button type="button" className="prompt-chip" onClick={() => onOpen?.(name)}>
      {name}
    </button>
  );
}
