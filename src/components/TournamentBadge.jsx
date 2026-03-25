// src/components/TournamentBadge.jsx

export default function TournamentBadge({ tournament, onClick, isActive }) {
  if (!tournament) return null;

  return (
    <button
      onClick={onClick}
      style={{
        background: isActive ? tournament.color + "18" : "transparent",
        border: `1px solid ${isActive ? tournament.color : "#1E2124"}`,
        borderRadius: "6px",
        padding: "8px 14px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: "130px",
        transition: "all 0.15s ease"
      }}
    >
      <span style={{
        fontFamily: "'DM Mono', monospace",
        fontSize: "10px",
        color: tournament.color,
        letterSpacing: "0.08em",
        textTransform: "uppercase"
      }}>
        {tournament.surface} · {tournament.speed}
      </span>
      <span style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: "16px",
        color: isActive ? "#FFFFFF" : "#9BA3AF",
        letterSpacing: "0.04em"
      }}>
        {tournament.name}
      </span>
    </button>
  );
}
